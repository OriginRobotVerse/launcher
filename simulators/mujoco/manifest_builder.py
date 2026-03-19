"""
Parses a MuJoCo model and generates an Origin announce manifest.

Maps MuJoCo concepts to Origin's wire protocol vocabulary:
  - model.actuator_* → actions (set_ctrl, per-actuator named actions)
  - model.sensor_* → sensors + state schema
  - model.jnt_* → additional state schema entries (qpos, qvel)
"""

import mujoco


def build_manifest(model: mujoco.MjModel, device_id: str) -> dict:
    """Build an Origin announce message from a MuJoCo model."""

    sensors = _extract_sensors(model)
    state_schema = _extract_state_schema(model)
    actions = _extract_actions(model)

    return {
        "id": device_id,
        "version": "mujoco-sim/0.1",
        "sensors": sensors,
        "chips": [{"name": "mujoco", "pins": []}],
        "actions": actions,
        "state": state_schema,
    }


def _extract_sensors(model: mujoco.MjModel) -> list[dict]:
    """Extract sensor descriptions from the model."""
    sensors = []
    for i in range(model.nsensor):
        name = mujoco.mj_id2name(model, mujoco.mjtObj.mjOBJ_SENSOR, i) or f"sensor_{i}"
        sensors.append({"name": name, "pins": []})
    return sensors


def _extract_state_schema(model: mujoco.MjModel) -> list[dict]:
    """Build state schema from sensors and joints."""
    schema: list[dict] = []

    # Sensor readings
    for i in range(model.nsensor):
        name = mujoco.mj_id2name(model, mujoco.mjtObj.mjOBJ_SENSOR, i) or f"sensor_{i}"
        dim = model.sensor_dim[i]
        if dim == 1:
            schema.append({"key": name, "type": "float"})
        else:
            for d in range(dim):
                schema.append({"key": f"{name}_{d}", "type": "float"})

    # Joint positions and velocities
    for i in range(model.njnt):
        jnt_name = mujoco.mj_id2name(model, mujoco.mjtObj.mjOBJ_JOINT, i) or f"jnt_{i}"
        schema.append({"key": f"{jnt_name}_pos", "type": "float"})
        schema.append({"key": f"{jnt_name}_vel", "type": "float"})

    return schema


def _extract_actions(model: mujoco.MjModel) -> list[str]:
    """Build action list from actuators."""
    actions = ["set_ctrl", "set_pos", "reset", "pause"]

    for i in range(model.nu):
        name = mujoco.mj_id2name(model, mujoco.mjtObj.mjOBJ_ACTUATOR, i) or f"ctrl_{i}"
        actions.append(name)

    return actions


def extract_readings(model: mujoco.MjModel, data: mujoco.MjData) -> dict[str, float]:
    """Extract current state as a flat readings dict."""
    readings: dict[str, float] = {}

    # Sensor data
    sensor_adr = 0
    for i in range(model.nsensor):
        name = mujoco.mj_id2name(model, mujoco.mjtObj.mjOBJ_SENSOR, i) or f"sensor_{i}"
        dim = model.sensor_dim[i]
        if dim == 1:
            readings[name] = float(data.sensordata[sensor_adr])
        else:
            for d in range(dim):
                readings[f"{name}_{d}"] = float(data.sensordata[sensor_adr + d])
        sensor_adr += dim

    # Joint positions and velocities
    for i in range(model.njnt):
        jnt_name = mujoco.mj_id2name(model, mujoco.mjtObj.mjOBJ_JOINT, i) or f"jnt_{i}"
        qpos_adr = model.jnt_qposadr[i]
        qvel_adr = model.jnt_dofadr[i]
        readings[f"{jnt_name}_pos"] = float(data.qpos[qpos_adr])
        readings[f"{jnt_name}_vel"] = float(data.qvel[qvel_adr])

    return readings
