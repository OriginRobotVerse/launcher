#!/usr/bin/env python3
"""
Origin MuJoCo Bridge — runs a Unitree Go2 simulation as an Origin device.

Usage:
    python mujoco_bridge.py [--server-host HOST] [--server-port PORT] [--headless]

Defaults:
    server-host: 127.0.0.1
    server-port: 9000
    headless:    false (shows MuJoCo viewer)

Requirements:
    pip install mujoco mujoco-menagerie
"""

import argparse
import json
import socket
import threading
import time
import numpy as np

try:
    import mujoco
    import mujoco.viewer
except ImportError:
    print("Install mujoco: pip install mujoco")
    raise


# ---------------------------------------------------------------------------
# Model loading
# ---------------------------------------------------------------------------

def find_model() -> str:
    """Locate the Unitree Go2 MJCF from mujoco_menagerie."""
    import importlib.util
    import os

    # Try mujoco_menagerie package first
    spec = importlib.util.find_spec("mujoco_menagerie")
    if spec and spec.submodule_search_locations:
        base = spec.submodule_search_locations[0]
        path = os.path.join(base, "unitree_go2", "scene.xml")
        if os.path.exists(path):
            return path

    # Try common paths
    for base in [
        os.path.expanduser("~/mujoco_menagerie"),
        os.path.expanduser("~/.mujoco/menagerie"),
        "mujoco_menagerie",
        "../mujoco_menagerie",
    ]:
        path = os.path.join(base, "unitree_go2", "scene.xml")
        if os.path.exists(path):
            return path

    raise FileNotFoundError(
        "Could not find Unitree Go2 model. Install mujoco_menagerie:\n"
        "  pip install mujoco-menagerie\n"
        "Or clone: git clone https://github.com/google-deepmind/mujoco_menagerie"
    )


# ---------------------------------------------------------------------------
# Locomotion controller
# ---------------------------------------------------------------------------

class Go2Controller:
    """Simple gait controller for the Unitree Go2.

    Maps Origin actions to joint-level PD targets.
    This is intentionally simple — a walking pattern generator
    using sinusoidal trajectories. Good enough for a demo,
    not production locomotion.
    """

    # Go2 has 12 actuators: 4 legs × 3 joints (hip, thigh, calf)
    # Joint order (from MJCF): FR, FL, RR, RL
    # Each leg: hip_rotation, thigh, calf

    STAND_POSE = np.array([
        # FR           FL           RR           RL
        0.0, 0.8, -1.5,  0.0, 0.8, -1.5,
        0.0, 0.8, -1.5,  0.0, 0.8, -1.5,
    ])

    def __init__(self):
        self.action = "stand"
        self.speed = 0.5
        self.phase = 0.0
        self.gait_freq = 2.0  # Hz

    def set_action(self, action: str, params: dict):
        self.action = action
        self.speed = params.get("speed", 0.5)

    def compute_targets(self, dt: float) -> np.ndarray:
        """Compute joint position targets for the current action."""
        targets = self.STAND_POSE.copy()

        if self.action == "stand" or self.action == "stop":
            self.phase = 0.0
            return targets

        self.phase += dt * self.gait_freq * 2 * np.pi
        amplitude = 0.3 * min(self.speed, 1.0)

        if self.action == "walk_fwd":
            targets = self._trot_gait(targets, amplitude, direction=1.0)
        elif self.action == "walk_bwd":
            targets = self._trot_gait(targets, amplitude, direction=-1.0)
        elif self.action == "turn_left":
            targets = self._turn_gait(targets, amplitude, direction=-1.0)
        elif self.action == "turn_right":
            targets = self._turn_gait(targets, amplitude, direction=1.0)
        elif self.action == "trot":
            targets = self._trot_gait(targets, amplitude * 1.3, direction=1.0)

        return targets

    def _trot_gait(self, targets: np.ndarray, amp: float, direction: float) -> np.ndarray:
        """Trotting gait — diagonal legs move together."""
        # Diagonal pairs: (FR, RL) and (FL, RR)
        phase_a = self.phase
        phase_b = self.phase + np.pi

        for leg_idx, phase in [(0, phase_a), (1, phase_b), (2, phase_b), (3, phase_a)]:
            base = leg_idx * 3
            swing = np.sin(phase)
            lift = max(0, np.sin(phase))  # Only lift during swing

            # Thigh: forward/back swing
            targets[base + 1] += direction * amp * swing * 0.5
            # Calf: lift during swing phase
            targets[base + 2] -= lift * amp * 0.4

        return targets

    def _turn_gait(self, targets: np.ndarray, amp: float, direction: float) -> np.ndarray:
        """Turning gait — differential hip rotation."""
        phase_a = self.phase
        phase_b = self.phase + np.pi

        for leg_idx, phase in [(0, phase_a), (1, phase_b), (2, phase_b), (3, phase_a)]:
            base = leg_idx * 3
            swing = np.sin(phase)
            lift = max(0, np.sin(phase))

            # Hip rotation for turning
            side = 1.0 if leg_idx in (0, 2) else -1.0  # Right vs left
            targets[base + 0] += direction * side * amp * swing * 0.3
            # Still need leg swing for stepping
            targets[base + 1] += amp * swing * 0.3
            targets[base + 2] -= lift * amp * 0.3

        return targets


# ---------------------------------------------------------------------------
# Origin wire protocol over TCP
# ---------------------------------------------------------------------------

class OriginTCPBridge:
    """Speaks Origin wire protocol over TCP to the Origin server."""

    def __init__(self, host: str, port: int):
        self.host = host
        self.port = port
        self.sock: socket.socket | None = None
        self.recv_buf = ""
        self.current_action = "stand"
        self.current_params: dict = {}
        self.connected = False
        self.handshake_done = False
        self._lock = threading.Lock()

    def connect(self):
        """Connect to the Origin server's TCP transport."""
        while True:
            try:
                self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                self.sock.connect((self.host, self.port))
                self.sock.setblocking(False)
                self.connected = True
                print(f"[bridge] Connected to Origin server at {self.host}:{self.port}")
                return
            except ConnectionRefusedError:
                print(f"[bridge] Server not ready, retrying in 2s...")
                time.sleep(2)
            except Exception as e:
                print(f"[bridge] Connection error: {e}, retrying in 2s...")
                time.sleep(2)

    def send_announce(self):
        """Send device manifest to Origin server."""
        manifest = {
            "type": "announce",
            "id": "unitree-go2",
            "version": "0.2",
            "sensors": [
                {"name": "imu", "pins": [0, 1, 2, 3, 4, 5]},
                {"name": "joint-encoders", "pins": list(range(6, 18))},
                {"name": "foot-contacts", "pins": [18, 19, 20, 21]},
            ],
            "chips": [
                {"name": "motor-drivers", "pins": list(range(0, 12))},
            ],
            "actions": [
                "stand", "walk_fwd", "walk_bwd",
                "turn_left", "turn_right", "trot", "stop",
            ],
            "state": [
                # IMU
                {"key": "roll", "type": "float"},
                {"key": "pitch", "type": "float"},
                {"key": "yaw", "type": "float"},
                {"key": "gyro_x", "type": "float"},
                {"key": "gyro_y", "type": "float"},
                {"key": "gyro_z", "type": "float"},
                # Position
                {"key": "pos_x", "type": "float"},
                {"key": "pos_y", "type": "float"},
                {"key": "pos_z", "type": "float"},
                # Velocity
                {"key": "vel_x", "type": "float"},
                {"key": "vel_y", "type": "float"},
                {"key": "vel_z", "type": "float"},
                # Foot contacts (1.0 = touching ground)
                {"key": "contact_fr", "type": "float"},
                {"key": "contact_fl", "type": "float"},
                {"key": "contact_rr", "type": "float"},
                {"key": "contact_rl", "type": "float"},
                # Current action
                {"key": "action_id", "type": "string"},
            ],
        }
        self._send(json.dumps(manifest))

    def wait_for_ack(self, timeout: float = 10.0) -> bool:
        """Wait for ack from Origin server."""
        start = time.time()
        while time.time() - start < timeout:
            lines = self._recv()
            for line in lines:
                try:
                    msg = json.loads(line)
                    if msg.get("type") == "ack":
                        self.handshake_done = True
                        print("[bridge] Handshake complete")
                        return True
                except json.JSONDecodeError:
                    continue
            time.sleep(0.01)
        return False

    def handshake(self) -> bool:
        """Announce and wait for ack, retry indefinitely."""
        while True:
            self.send_announce()
            if self.wait_for_ack(5.0):
                return True
            print("[bridge] No ack, retrying...")

    def send_readings(self, readings: dict):
        """Send sensor readings to Origin server."""
        msg = {"type": "readings", "data": readings}
        self._send(json.dumps(msg))

    def poll_actions(self):
        """Non-blocking check for incoming actions."""
        lines = self._recv()
        for line in lines:
            try:
                msg = json.loads(line)
                if msg.get("type") == "action":
                    with self._lock:
                        self.current_action = msg["name"]
                        self.current_params = msg.get("params", {})
                    print(f"[bridge] Action: {msg['name']} {msg.get('params', {})}")
            except json.JSONDecodeError:
                continue

    def get_current_action(self) -> tuple[str, dict]:
        with self._lock:
            return self.current_action, self.current_params.copy()

    def _send(self, data: str):
        if not self.sock:
            return
        try:
            self.sock.sendall((data + "\n").encode())
        except Exception as e:
            print(f"[bridge] Send error: {e}")
            self.connected = False

    def _recv(self) -> list[str]:
        if not self.sock:
            return []
        try:
            data = self.sock.recv(4096).decode()
            if not data:
                self.connected = False
                return []
            self.recv_buf += data
            lines = self.recv_buf.split("\n")
            self.recv_buf = lines.pop()  # Keep incomplete line
            return [l.strip() for l in lines if l.strip()]
        except BlockingIOError:
            return []
        except Exception as e:
            print(f"[bridge] Recv error: {e}")
            self.connected = False
            return []

    def close(self):
        if self.sock:
            self.sock.close()
            self.sock = None
        self.connected = False


# ---------------------------------------------------------------------------
# Sensor extraction
# ---------------------------------------------------------------------------

def extract_readings(model, data) -> dict:
    """Extract sensor readings from MuJoCo simulation state."""
    readings = {}

    # Body position and orientation (torso/trunk body)
    body_id = mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_BODY, "trunk")
    if body_id < 0:
        body_id = mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_BODY, "base")
    if body_id < 0:
        body_id = 1  # Fallback to first non-world body

    # Position
    pos = data.xpos[body_id]
    readings["pos_x"] = round(float(pos[0]), 4)
    readings["pos_y"] = round(float(pos[1]), 4)
    readings["pos_z"] = round(float(pos[2]), 4)

    # Orientation as euler angles (from quaternion)
    quat = data.xquat[body_id]
    # Convert quaternion to euler (roll, pitch, yaw)
    # MuJoCo uses w, x, y, z quaternion order
    w, x, y, z = quat
    # Roll (x-axis rotation)
    sinr_cosp = 2 * (w * x + y * z)
    cosr_cosp = 1 - 2 * (x * x + y * y)
    roll = np.arctan2(sinr_cosp, cosr_cosp)
    # Pitch (y-axis rotation)
    sinp = 2 * (w * y - z * x)
    pitch = np.arcsin(np.clip(sinp, -1, 1))
    # Yaw (z-axis rotation)
    siny_cosp = 2 * (w * z + x * y)
    cosy_cosp = 1 - 2 * (y * y + z * z)
    yaw = np.arctan2(siny_cosp, cosy_cosp)

    readings["roll"] = round(float(np.degrees(roll)), 2)
    readings["pitch"] = round(float(np.degrees(pitch)), 2)
    readings["yaw"] = round(float(np.degrees(yaw)), 2)

    # Angular velocity (gyroscope)
    # cvel contains [angular_vel, linear_vel] for each body
    if body_id < data.cvel.shape[0]:
        angvel = data.cvel[body_id][:3]
        readings["gyro_x"] = round(float(angvel[0]), 4)
        readings["gyro_y"] = round(float(angvel[1]), 4)
        readings["gyro_z"] = round(float(angvel[2]), 4)

        linvel = data.cvel[body_id][3:]
        readings["vel_x"] = round(float(linvel[0]), 4)
        readings["vel_y"] = round(float(linvel[1]), 4)
        readings["vel_z"] = round(float(linvel[2]), 4)
    else:
        readings.update({"gyro_x": 0, "gyro_y": 0, "gyro_z": 0})
        readings.update({"vel_x": 0, "vel_y": 0, "vel_z": 0})

    # Foot contacts — check contact forces
    # Look for contacts involving foot geoms
    foot_names = ["FR_foot", "FL_foot", "RR_foot", "RL_foot"]
    foot_keys = ["contact_fr", "contact_fl", "contact_rr", "contact_rl"]

    foot_geom_ids = {}
    for name in foot_names:
        gid = mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_GEOM, name)
        if gid >= 0:
            foot_geom_ids[name] = gid

    # Initialize all contacts to 0
    for key in foot_keys:
        readings[key] = 0.0

    # Check active contacts
    for i in range(data.ncon):
        contact = data.contact[i]
        for name, key in zip(foot_names, foot_keys):
            if name in foot_geom_ids:
                gid = foot_geom_ids[name]
                if contact.geom1 == gid or contact.geom2 == gid:
                    readings[key] = 1.0

    return readings


# ---------------------------------------------------------------------------
# Main simulation loop
# ---------------------------------------------------------------------------

def run_simulation(args):
    """Main loop: load model, connect to Origin, run sim."""

    # Find and load model
    model_path = find_model()
    print(f"[sim] Loading model from {model_path}")
    model = mujoco.MjModel.from_xml_path(model_path)
    data = mujoco.MjData(model)

    # Set simulation timestep
    model.opt.timestep = 0.002  # 500 Hz physics

    # Initialize to standing pose
    controller = Go2Controller()
    initial_targets = controller.compute_targets(0)

    # Set initial joint positions to standing pose
    if model.nu == len(initial_targets):
        for i in range(model.nu):
            # Find the joint associated with each actuator
            jnt_id = model.actuator_trnid[i, 0]
            if jnt_id >= 0:
                qadr = model.jnt_qposadr[jnt_id]
                data.qpos[qadr] = initial_targets[i]

    mujoco.mj_forward(model, data)

    # Connect to Origin server
    bridge = OriginTCPBridge(args.server_host, args.server_port)
    bridge.connect()
    bridge.handshake()

    # Readings send rate (don't flood the server)
    readings_interval = 0.05  # 20 Hz readings to server
    last_readings_time = 0.0
    sim_steps_per_control = int(0.02 / model.opt.timestep)  # 50 Hz control

    print("[sim] Simulation running. Press Ctrl+C to stop.")

    def sim_loop():
        nonlocal last_readings_time
        step = 0

        try:
            while bridge.connected:
                # Poll for actions from Origin server
                bridge.poll_actions()
                action, params = bridge.get_current_action()
                controller.set_action(action, params)

                # Run physics steps
                for _ in range(sim_steps_per_control):
                    targets = controller.compute_targets(model.opt.timestep)

                    # Apply PD control
                    if model.nu == len(targets):
                        data.ctrl[:] = targets

                    mujoco.mj_step(model, data)

                # Send readings at configured rate
                now = data.time
                if now - last_readings_time >= readings_interval:
                    readings = extract_readings(model, data)
                    readings["action_id"] = action
                    bridge.send_readings(readings)
                    last_readings_time = now

                step += 1

        except KeyboardInterrupt:
            print("\n[sim] Shutting down...")
        finally:
            bridge.close()

    if args.headless:
        sim_loop()
    else:
        # Run with MuJoCo viewer
        try:
            with mujoco.viewer.launch_passive(model, data) as viewer:
                last_readings_time = 0.0
                step = 0

                while viewer.is_running() and bridge.connected:
                    bridge.poll_actions()
                    action, params = bridge.get_current_action()
                    controller.set_action(action, params)

                    for _ in range(sim_steps_per_control):
                        targets = controller.compute_targets(model.opt.timestep)
                        if model.nu == len(targets):
                            data.ctrl[:] = targets
                        mujoco.mj_step(model, data)

                    now = data.time
                    if now - last_readings_time >= readings_interval:
                        readings = extract_readings(model, data)
                        readings["action_id"] = action
                        bridge.send_readings(readings)
                        last_readings_time = now

                    viewer.sync()
                    step += 1

        except KeyboardInterrupt:
            print("\n[sim] Shutting down...")
        finally:
            bridge.close()


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Origin MuJoCo Bridge — Unitree Go2")
    parser.add_argument("--server-host", default="127.0.0.1", help="Origin TCP host")
    parser.add_argument("--server-port", type=int, default=9000, help="Origin TCP port")
    parser.add_argument("--headless", action="store_true", help="Run without viewer")
    args = parser.parse_args()
    run_simulation(args)


if __name__ == "__main__":
    main()
