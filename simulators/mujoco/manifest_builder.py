"""
Parses a MuJoCo model and generates an Origin announce manifest.

Maps MuJoCo concepts to Origin's wire protocol vocabulary:
  - model.actuator_* → actions (set_ctrl, per-actuator named actions)
  - model.sensor_* → sensors + state schema
  - model.jnt_* → additional state schema entries (qpos, qvel)
  - body state → base_quat, base_angvel, base_linvel, base_pos
"""

import mujoco
import numpy as np


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
    # IMU-like virtual sensors
    sensors.append({"name": "imu", "pins": []})
    return sensors


def _extract_state_schema(model: mujoco.MjModel) -> list[dict]:
    """Build state schema from body state, sensors, and joints."""
    schema: list[dict] = []

    # Base body state (needed for RL policies)
    for key in [
        "base_pos_x", "base_pos_y", "base_pos_z",
        "base_quat_w", "base_quat_x", "base_quat_y", "base_quat_z",
        "base_linvel_x", "base_linvel_y", "base_linvel_z",
        "base_angvel_x", "base_angvel_y", "base_angvel_z",
        "gravity_x", "gravity_y", "gravity_z",
    ]:
        schema.append({"key": key, "type": "float"})

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


def _quat_rotate_inverse(quat: np.ndarray, vec: np.ndarray) -> np.ndarray:
    """Rotate a vector by the inverse of a quaternion (w, x, y, z)."""
    w, x, y, z = quat
    # Quaternion conjugate rotation
    t = 2.0 * np.cross(np.array([x, y, z]), vec)
    return vec - w * t + np.cross(np.array([x, y, z]), t)


def extract_readings(model: mujoco.MjModel, data: mujoco.MjData) -> dict[str, float]:
    """Extract current state as a flat readings dict."""
    readings: dict[str, float] = {}

    # Base body state (body 1 is typically the trunk/base)
    # Free joint (joint 0) stores: qpos[0:3]=pos, qpos[3:7]=quat(w,x,y,z)
    # and qvel[0:3]=linvel, qvel[3:6]=angvel
    has_free_joint = model.njnt > 0 and model.jnt_type[0] == 0
    if has_free_joint:
        pos = data.qpos[0:3]
        quat = data.qpos[3:7]  # w, x, y, z
        linvel = data.qvel[0:3]
        angvel = data.qvel[3:6]
    else:
        pos = np.zeros(3)
        quat = np.array([1.0, 0.0, 0.0, 0.0])
        linvel = np.zeros(3)
        angvel = np.zeros(3)

    readings["base_pos_x"] = float(pos[0])
    readings["base_pos_y"] = float(pos[1])
    readings["base_pos_z"] = float(pos[2])
    readings["base_quat_w"] = float(quat[0])
    readings["base_quat_x"] = float(quat[1])
    readings["base_quat_y"] = float(quat[2])
    readings["base_quat_z"] = float(quat[3])
    readings["base_linvel_x"] = float(linvel[0])
    readings["base_linvel_y"] = float(linvel[1])
    readings["base_linvel_z"] = float(linvel[2])
    readings["base_angvel_x"] = float(angvel[0])
    readings["base_angvel_y"] = float(angvel[1])
    readings["base_angvel_z"] = float(angvel[2])

    # Projected gravity in body frame (rotate world gravity by inverse body quat)
    gravity_world = np.array([0.0, 0.0, -1.0])
    gravity_body = _quat_rotate_inverse(quat, gravity_world)
    readings["gravity_x"] = float(gravity_body[0])
    readings["gravity_y"] = float(gravity_body[1])
    readings["gravity_z"] = float(gravity_body[2])

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
