"""
Neural network locomotion policy.

Loads a TorchScript (.pt) or ONNX (.onnx) checkpoint trained with
the standard legged_gym / unitree_rl_gym observation convention and
runs inference at each policy step.

Observation vector (48 dims, unitree_rl_gym convention):
  [0:3]   base angular velocity (scaled x0.25)
  [3:6]   projected gravity in body frame
  [6:9]   velocity commands (vx, vy, yaw_rate) (scaled)
  [9:21]  joint positions minus defaults (12 joints)
  [21:33] joint velocities (scaled x0.05)
  [33:45] previous actions (12)
  [45:48] sin/cos phase + phase variable (optional, padded to 0 if not used)

Action output (12 dims):
  Position targets = action_scale * action + default_angles
  Applied via set_pos (PD controller in sim runner).

Joint order (MuJoCo menagerie Go2):
  FL_hip, FL_thigh, FL_calf, FR_hip, FR_thigh, FR_calf,
  RL_hip, RL_thigh, RL_calf, RR_hip, RR_thigh, RR_calf

Usage:
  policy = NeuralPolicy("path/to/policy.pt")
  policy.set_command(vx=1.0, vy=0.0, yaw=0.0)
  ctrls = policy.step(state)  # state from Origin device state
"""

from __future__ import annotations

import math
import os
import time
from dataclasses import dataclass, field
from typing import Any

import numpy as np

# Joint names in MuJoCo menagerie order
JOINT_NAMES = [
    "FL_hip_joint", "FL_thigh_joint", "FL_calf_joint",
    "FR_hip_joint", "FR_thigh_joint", "FR_calf_joint",
    "RL_hip_joint", "RL_thigh_joint", "RL_calf_joint",
    "RR_hip_joint", "RR_thigh_joint", "RR_calf_joint",
]

# Default joint angles from go2_config.py (unitree_rl_gym)
DEFAULT_ANGLES = np.array([
    0.1, 0.8, -1.5,    # FL
    -0.1, 0.8, -1.5,   # FR
    0.1, 1.0, -1.5,    # RL
    -0.1, 1.0, -1.5,   # RR
], dtype=np.float32)

# Observation scaling
ANG_VEL_SCALE = 0.25
DOF_VEL_SCALE = 0.05
CMD_SCALES = np.array([2.0, 2.0, 0.25], dtype=np.float32)

# Action scaling
ACTION_SCALE = 0.25
CLIP_ACTIONS = 100.0
CLIP_OBS = 100.0


def _load_model(path: str) -> tuple[Any, str]:
    """Load a TorchScript or ONNX model. Returns (model, format)."""
    ext = os.path.splitext(path)[1].lower()

    if ext == ".pt":
        import torch
        model = torch.jit.load(path, map_location="cpu")
        model.eval()
        return model, "torchscript"
    elif ext == ".onnx":
        import onnxruntime as ort
        session = ort.InferenceSession(path)
        return session, "onnx"
    else:
        raise ValueError(f"Unsupported model format: {ext} (use .pt or .onnx)")


@dataclass
class NeuralPolicy:
    """RL locomotion policy loaded from a checkpoint file."""

    name: str = "neural"
    description: str = "Neural network locomotion policy (RL-trained)"
    model_path: str = ""

    # Velocity commands
    cmd_vx: float = 0.0
    cmd_vy: float = 0.0
    cmd_yaw: float = 0.0

    _model: Any = field(default=None, repr=False)
    _format: str = field(default="", repr=False)
    _prev_actions: np.ndarray = field(default_factory=lambda: np.zeros(12, dtype=np.float32), repr=False)
    _num_obs: int = field(default=48, repr=False)
    _start: float = field(default=0.0, repr=False)

    def __post_init__(self):
        if self.model_path and os.path.exists(self.model_path):
            self._model, self._format = _load_model(self.model_path)
            print(f"[neural] Loaded {self._format} policy from {self.model_path}")
        elif self.model_path:
            print(f"[neural] Warning: model not found at {self.model_path}")

    def set_command(self, vx: float = 0.0, vy: float = 0.0, yaw: float = 0.0):
        """Set velocity commands (m/s for vx/vy, rad/s for yaw)."""
        self.cmd_vx = vx
        self.cmd_vy = vy
        self.cmd_yaw = yaw

    def reset(self) -> None:
        self._prev_actions = np.zeros(12, dtype=np.float32)
        self._start = time.time()

    def step(self, state: dict[str, float]) -> dict[str, float]:
        if self._model is None:
            return {}

        obs = self._build_obs(state)
        actions = self._infer(obs)

        # Clip actions
        actions = np.clip(actions, -CLIP_ACTIONS, CLIP_ACTIONS)
        self._prev_actions = actions.copy()

        # Convert to position targets: target = action_scale * action + default
        targets = ACTION_SCALE * actions + DEFAULT_ANGLES

        # Return as ctrl dict
        ctrls = {}
        for i in range(12):
            ctrls[f"ctrl_{i}"] = float(targets[i])
        return ctrls

    def _build_obs(self, state: dict[str, float]) -> np.ndarray:
        """Build the 48-dim observation vector from Origin state readings."""
        obs = np.zeros(self._num_obs, dtype=np.float32)

        # [0:3] Base angular velocity (scaled)
        obs[0] = state.get("base_angvel_x", 0.0) * ANG_VEL_SCALE
        obs[1] = state.get("base_angvel_y", 0.0) * ANG_VEL_SCALE
        obs[2] = state.get("base_angvel_z", 0.0) * ANG_VEL_SCALE

        # [3:6] Projected gravity in body frame
        obs[3] = state.get("gravity_x", 0.0)
        obs[4] = state.get("gravity_y", 0.0)
        obs[5] = state.get("gravity_z", -1.0)

        # [6:9] Velocity commands (scaled)
        obs[6] = self.cmd_vx * CMD_SCALES[0]
        obs[7] = self.cmd_vy * CMD_SCALES[1]
        obs[8] = self.cmd_yaw * CMD_SCALES[2]

        # [9:21] Joint positions minus defaults
        for i, jname in enumerate(JOINT_NAMES):
            pos = state.get(f"{jname}_pos", DEFAULT_ANGLES[i])
            obs[9 + i] = pos - DEFAULT_ANGLES[i]

        # [21:33] Joint velocities (scaled)
        for i, jname in enumerate(JOINT_NAMES):
            vel = state.get(f"{jname}_vel", 0.0)
            obs[21 + i] = vel * DOF_VEL_SCALE

        # [33:45] Previous actions
        obs[33:45] = self._prev_actions

        # [45:48] Phase encoding (optional — zero if not used by the model)
        # Some policies use sin/cos of a gait phase clock
        t = time.time() - self._start
        obs[45] = math.sin(2 * math.pi * 2.0 * t)
        obs[46] = math.cos(2 * math.pi * 2.0 * t)
        obs[47] = 0.0

        return np.clip(obs, -CLIP_OBS, CLIP_OBS)

    def _infer(self, obs: np.ndarray) -> np.ndarray:
        """Run inference on the observation vector."""
        if self._format == "torchscript":
            import torch
            with torch.no_grad():
                obs_tensor = torch.from_numpy(obs).unsqueeze(0)
                actions = self._model(obs_tensor).squeeze(0).numpy()
            return actions.astype(np.float32)

        elif self._format == "onnx":
            input_name = self._model.get_inputs()[0].name
            result = self._model.run(None, {input_name: obs.reshape(1, -1)})
            return result[0].flatten().astype(np.float32)

        return np.zeros(12, dtype=np.float32)
