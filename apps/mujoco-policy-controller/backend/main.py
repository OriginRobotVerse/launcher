"""
Policy controller backend.

Connects to an Origin server and runs control policies against
a MuJoCo-simulated robot. Exposes a REST API for the React
frontend to list policies, start/stop them, and read state.

Usage:
    cd apps/mujoco-policy-controller/backend
    pip install -r requirements.txt
    python main.py --origin http://localhost:3000 --device unitree-go2
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import threading
import time
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

# Add the Python client to the path
sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent.parent.parent.parent / "clients" / "python"))
from origin_client.client import OriginClient, OriginError

from policies import POLICY_MAP, ALL_POLICIES, Policy, get_policies_for_device, MODEL_POLICIES
from neural_policy import NeuralPolicy, NEURAL_CONFIGS

# --- App state ---

app = FastAPI(title="MuJoCo Policy Controller")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class AppState:
    def __init__(self):
        self.client: OriginClient | None = None
        self.device_id: str = ""
        self.active_policy: Policy | None = None
        self.policy_thread: threading.Thread | None = None
        self.running = False
        self.loop_hz: float = 30.0
        self.last_state: dict[str, float] = {}
        self.last_action: dict[str, float] = {}


state = AppState()


# --- Policy loop ---

def policy_loop():
    """Background thread that runs the active policy at loop_hz."""
    while state.running and state.active_policy:
        try:
            # Read current state from Origin
            device_state = state.client.get_device_state(state.device_id)
            state.last_state = device_state

            # Compute controls
            ctrls = state.active_policy.step(device_state)
            state.last_action = ctrls

            # Send to robot
            if ctrls:
                state.client.send_action(state.device_id, "set_pos", ctrls)

            time.sleep(1.0 / state.loop_hz)

        except OriginError as e:
            print(f"[policy] Origin error: {e}")
            time.sleep(0.5)
        except Exception as e:
            print(f"[policy] Error: {e}")
            time.sleep(0.5)


def start_policy(policy: Policy):
    """Start running a policy. Stops any currently active one first."""
    stop_policy()
    policy.reset()
    state.active_policy = policy
    state.running = True
    state.policy_thread = threading.Thread(target=policy_loop, daemon=True)
    state.policy_thread.start()
    print(f"[policy] Started: {policy.name}")


def stop_policy():
    """Stop the currently running policy."""
    if state.running:
        state.running = False
        if state.policy_thread:
            state.policy_thread.join(timeout=2.0)
            state.policy_thread = None
        if state.active_policy:
            print(f"[policy] Stopped: {state.active_policy.name}")
        state.active_policy = None
        state.last_action = {}


# --- API models ---

class PolicyInfo(BaseModel):
    name: str
    description: str
    active: bool


class StatusResponse(BaseModel):
    device_id: str
    connected: bool
    active_policy: str | None
    state: dict[str, float]
    last_action: dict[str, float]


class PolicyStartRequest(BaseModel):
    name: str


# --- Routes ---

@app.get("/api/policies")
def list_policies() -> list[PolicyInfo]:
    return [
        PolicyInfo(
            name=p.name,
            description=p.description,
            active=(state.active_policy is not None and state.active_policy.name == p.name),
        )
        for p in ALL_POLICIES
    ]


@app.post("/api/policies/start")
def start_policy_route(req: PolicyStartRequest):
    policy = POLICY_MAP.get(req.name)
    if not policy:
        raise HTTPException(404, f"Unknown policy: {req.name}")
    start_policy(policy)
    return {"ok": True, "policy": req.name}


@app.post("/api/policies/stop")
def stop_policy_route():
    stop_policy()
    return {"ok": True}


@app.get("/api/status")
def get_status() -> StatusResponse:
    connected = False
    if state.client:
        try:
            devices = state.client.list_devices()
            connected = any(d.id == state.device_id for d in devices)
        except Exception:
            pass

    return StatusResponse(
        device_id=state.device_id,
        connected=connected,
        active_policy=state.active_policy.name if state.active_policy else None,
        state=state.last_state,
        last_action=state.last_action,
    )


@app.post("/api/command")
def set_command(body: dict[str, float]):
    """Set velocity commands for neural policy (vx, vy, yaw in m/s and rad/s)."""
    if state.active_policy and hasattr(state.active_policy, "set_command"):
        state.active_policy.set_command(
            vx=body.get("vx", 0.0),
            vy=body.get("vy", 0.0),
            yaw=body.get("yaw", 0.0),
        )
        return {"ok": True}
    raise HTTPException(400, "Active policy does not support velocity commands")


@app.get("/api/state")
def get_device_state():
    if not state.client:
        raise HTTPException(503, "Not connected to Origin server")
    try:
        return state.client.get_device_state(state.device_id)
    except OriginError as e:
        raise HTTPException(e.status, str(e))


@app.get("/api/device")
def get_device():
    if not state.client:
        raise HTTPException(503, "Not connected to Origin server")
    try:
        detail = state.client.get_device(state.device_id)
        return {
            "id": detail.id,
            "version": detail.version,
            "connected_at": detail.connected_at,
            "actions": detail.manifest.actions,
            "sensors": [{"name": s.name} for s in detail.manifest.sensors],
            "state_schema": [{"key": s.key, "type": s.type} for s in detail.manifest.state],
        }
    except OriginError as e:
        raise HTTPException(e.status, str(e))


@app.post("/api/action")
def send_action(body: dict[str, Any]):
    if not state.client:
        raise HTTPException(503, "Not connected to Origin server")
    name = body.get("name")
    params = body.get("params", {})
    if not name:
        raise HTTPException(400, "Missing 'name'")
    try:
        state.client.send_action(state.device_id, name, params)
        return {"ok": True}
    except OriginError as e:
        raise HTTPException(e.status, str(e))


@app.get("/api/events")
def sse_events():
    """SSE stream of state updates and policy changes."""
    def generate():
        last_state = {}
        last_policy = None
        while True:
            current = state.last_state
            current_policy = state.active_policy.name if state.active_policy else None

            if current != last_state or current_policy != last_policy:
                data = json.dumps({
                    "state": current,
                    "active_policy": current_policy,
                    "last_action": state.last_action,
                })
                yield f"data: {data}\n\n"
                last_state = dict(current)
                last_policy = current_policy

            time.sleep(1.0 / 15)

    return StreamingResponse(generate(), media_type="text/event-stream")


# --- Startup ---

def main():
    parser = argparse.ArgumentParser(description="MuJoCo Policy Controller")
    parser.add_argument("--origin", default="http://localhost:5050", help="Origin server URL")
    parser.add_argument("--device", default="unitree-go2", help="Device ID")
    parser.add_argument("--port", type=int, default=8000, help="Backend port (default: 8000)")
    parser.add_argument("--hz", type=float, default=30.0, help="Policy loop rate (default: 30)")
    parser.add_argument("--policy-model", default=None, help="Path to TorchScript (.pt) or ONNX (.onnx) RL policy")
    args = parser.parse_args()

    # Load model-specific policies based on device ID
    device_policies = get_policies_for_device(args.device)
    ALL_POLICIES.clear()
    ALL_POLICIES.extend(device_policies)
    POLICY_MAP.clear()
    POLICY_MAP.update({p.name: p for p in ALL_POLICIES})

    # Register neural policy if a model file is provided
    if args.policy_model:
        # Use model-specific config if available
        neural_config = NEURAL_CONFIGS.get(args.device)
        neural = NeuralPolicy(
            name="neural",
            description=f"RL policy: {os.path.basename(args.policy_model)}",
            model_path=args.policy_model,
            **({"config": neural_config} if neural_config else {}),
        )
        ALL_POLICIES.insert(0, neural)
        POLICY_MAP["neural"] = neural

    state.client = OriginClient(args.origin)
    state.device_id = args.device
    state.loop_hz = args.hz

    print(f"[controller] Origin server: {args.origin}")
    print(f"[controller] Device: {args.device}")
    print(f"[controller] Policies: {[p.name for p in ALL_POLICIES]}")
    print(f"[controller] Policy loop: {args.hz} Hz")
    if args.policy_model:
        print(f"[controller] RL policy: {args.policy_model}")
    print(f"[controller] Backend: http://localhost:{args.port}")

    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=args.port)


if __name__ == "__main__":
    main()
