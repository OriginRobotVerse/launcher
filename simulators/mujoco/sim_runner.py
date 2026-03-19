"""
MuJoCo simulation runner.

Loads an MJCF model, runs mj_step in a loop, extracts state,
applies controls from the action queue, and sends readings
over the Origin bridge.

On macOS, the viewer requires running under `mjpython` instead of `python`.
If the viewer can't launch, the sim runs headless (physics + protocol only).
"""

import os
import time
import threading
import mujoco

from .origin_bridge import OriginBridge
from .manifest_builder import build_manifest, extract_readings


def _load_model(model_path: str) -> mujoco.MjModel:
    """Load an MJCF model, injecting generous contact/constraint buffers.

    Many robot models (e.g. quadrupeds on a ground plane) generate more
    contacts at init than MuJoCo's default auto-allocation expects.
    We inject <size nconmax="500" njmax="1000"/> into the XML before loading.
    """
    with open(model_path) as f:
        xml = f.read()

    if "nconmax" not in xml:
        idx = xml.index(">", xml.index("<mujoco"))
        xml = xml[:idx + 1] + '\n  <size nconmax="200"/>' + xml[idx + 1:]

    # Write patched XML next to original so relative includes/meshes resolve
    patched = os.path.join(os.path.dirname(model_path), "_origin_patched.xml")
    try:
        with open(patched, "w") as f:
            f.write(xml)
        return mujoco.MjModel.from_xml_path(patched)
    finally:
        if os.path.exists(patched):
            os.unlink(patched)


class SimRunner:
    def __init__(
        self,
        model_path: str,
        bridge: OriginBridge,
        device_id: str,
        readings_hz: float = 30.0,
        headless: bool = False,
    ):
        self.model = _load_model(model_path)
        self.data = mujoco.MjData(self.model)
        self.bridge = bridge
        self.device_id = device_id
        self.readings_hz = readings_hz
        self.headless = headless

        self.manifest = build_manifest(self.model, device_id)
        self._paused = False
        self._running = False
        self._step_count = 0
        self._data_lock = threading.Lock()

        # PD position control state
        # When set_pos is used, these targets drive a PD loop each sim step.
        # None means no PD — raw ctrl passthrough.
        self._pos_targets: dict[int, float] | None = None
        self._kp = 40.0   # proportional gain (Nm/rad)
        self._kd = 2.0    # derivative gain (Nm*s/rad)

        # Build actuator → joint mapping for PD control
        self._actuator_joint: list[int] = []
        for i in range(self.model.nu):
            # actuator_trnid[i][0] is the joint id for joint-type actuators
            self._actuator_joint.append(int(self.model.actuator_trnid[i][0]))

        # Initialize constraint buffers
        mujoco.mj_forward(self.model, self.data)

        # How many sim steps between readings sends
        sim_hz = 1.0 / self.model.opt.timestep
        self._readings_interval = max(1, int(sim_hz / readings_hz))

    def start(self) -> None:
        """Connect to server, start sim thread, launch viewer on main thread."""
        self.bridge.connect()
        self._announce()

        # Re-announce on discover
        self.bridge.on_discover(self._announce)

        self._running = True

        if self.headless:
            self._run_headless()
        else:
            self._run_with_viewer()

    def _run_with_viewer(self) -> None:
        """Launch viewer on main thread, sim on background thread."""
        print(f"[sim] Launching viewer for {self.device_id}")
        try:
            import mujoco.viewer
            with mujoco.viewer.launch_passive(self.model, self.data) as viewer:
                # Start sim thread only after viewer is initialized
                sim_thread = threading.Thread(target=self._sim_loop, daemon=True)
                sim_thread.start()

                while self._running and viewer.is_running():
                    with self._data_lock:
                        viewer.sync()
                    time.sleep(1.0 / 60.0)
        except RuntimeError as e:
            if "mjpython" in str(e):
                print(f"[sim] Viewer unavailable: {e}")
                print("[sim] Tip: run with `mjpython -m simulators.mujoco ...` for the viewer")
                print("[sim] Continuing headless (physics + protocol only)")
                # Start sim in background since there's no viewer
                sim_thread = threading.Thread(target=self._sim_loop, daemon=True)
                sim_thread.start()
                self._wait_for_exit()
            else:
                raise
        except KeyboardInterrupt:
            pass
        finally:
            self._running = False
            self.bridge.close()

    def _run_headless(self) -> None:
        """No viewer — run sim loop on main thread."""
        print(f"[sim] Running headless for {self.device_id}")
        try:
            self._sim_loop()
        except KeyboardInterrupt:
            pass
        finally:
            self._running = False
            self.bridge.close()

    def _wait_for_exit(self) -> None:
        """Block main thread until interrupted, while sim runs in background."""
        try:
            while self._running:
                time.sleep(0.5)
        except KeyboardInterrupt:
            pass

    def _announce(self) -> None:
        print(f"[sim] Announcing as {self.device_id}")
        self.bridge.send_announce(self.manifest)

    def _sim_loop(self) -> None:
        """Physics loop — batch-steps to maintain real-time.

        MuJoCo timestep is often 0.002s (500Hz) but Python sleep overhead
        is ~1ms. So we batch multiple mj_steps per wall-clock interval
        instead of sleeping per step.
        """
        timestep = self.model.opt.timestep
        wall_start = time.monotonic()
        sim_time = 0.0

        while self._running:
            if self._paused:
                time.sleep(0.01)
                wall_start = time.monotonic()
                sim_time = 0.0
                continue

            # Apply pending actions
            self._process_actions()

            # Step until sim catches up with wall clock
            wall_now = time.monotonic()
            wall_elapsed = wall_now - wall_start
            readings = None

            with self._data_lock:
                while sim_time < wall_elapsed and self._running:
                    # Apply PD position control if active
                    if self._pos_targets is not None:
                        for act_idx, target in self._pos_targets.items():
                            jnt_id = self._actuator_joint[act_idx]
                            qpos_adr = self.model.jnt_qposadr[jnt_id]
                            qvel_adr = self.model.jnt_dofadr[jnt_id]
                            pos = self.data.qpos[qpos_adr]
                            vel = self.data.qvel[qvel_adr]
                            torque = self._kp * (target - pos) - self._kd * vel
                            # Clamp to actuator torque limits
                            lo = self.model.actuator_ctrlrange[act_idx][0]
                            hi = self.model.actuator_ctrlrange[act_idx][1]
                            self.data.ctrl[act_idx] = max(lo, min(hi, torque))

                    mujoco.mj_step(self.model, self.data)
                    sim_time += timestep
                    self._step_count += 1

                    if self._step_count % self._readings_interval == 0:
                        readings = extract_readings(self.model, self.data)

            if readings is not None:
                self.bridge.send_readings(readings)

            # Brief sleep to yield CPU — sim will catch up next iteration
            time.sleep(0.001)

    def _process_actions(self) -> None:
        """Drain the action queue and apply controls."""
        for action in self.bridge.get_pending_actions():
            name = action.get("name", "")
            params = action.get("params", {})

            if name == "reset":
                print("[sim] Resetting simulation")
                self._pos_targets = None
                with self._data_lock:
                    mujoco.mj_resetData(self.model, self.data)
                    mujoco.mj_forward(self.model, self.data)
                self._step_count = 0

            elif name == "pause":
                self._paused = not self._paused
                print(f"[sim] {'Paused' if self._paused else 'Resumed'}")

            elif name == "set_pos":
                # Position targets — PD controller runs at sim rate
                # params: {"ctrl_0": 0.9, "FL_thigh": 0.9} (radians)
                targets = {}
                for key, value in params.items():
                    idx = self._resolve_ctrl_index(key)
                    if idx is not None and 0 <= idx < self.model.nu:
                        targets[idx] = value
                self._pos_targets = targets if targets else None

            elif name == "set_ctrl":
                # Raw torque — disables PD control
                self._pos_targets = None
                for key, value in params.items():
                    idx = self._resolve_ctrl_index(key)
                    if idx is not None and 0 <= idx < self.model.nu:
                        self.data.ctrl[idx] = value

            else:
                # Per-actuator named action: name is the actuator name
                idx = self._resolve_ctrl_index(name)
                if idx is not None and 0 <= idx < self.model.nu:
                    # Use first param value as the control signal
                    value = next(iter(params.values()), 0.0)
                    self.data.ctrl[idx] = value

    def _resolve_ctrl_index(self, key: str) -> int | None:
        """Resolve a control key to an actuator index.

        Accepts:
          - "ctrl_N" → index N directly
          - actuator name → mj_name2id lookup
        """
        if key.startswith("ctrl_"):
            try:
                return int(key[5:])
            except ValueError:
                return None

        idx = mujoco.mj_name2id(self.model, mujoco.mjtObj.mjOBJ_ACTUATOR, key)
        return idx if idx >= 0 else None
