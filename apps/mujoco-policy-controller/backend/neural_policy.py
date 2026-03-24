"""
Neural network locomotion policy — multi-model support.

Loads a TorchScript (.pt) or ONNX (.onnx) checkpoint and runs inference.
Model-specific configs define joint names, default angles, observation
construction, and action scaling.

Usage:
  config = NEURAL_CONFIGS["unitree-go2"]
  policy = NeuralPolicy("path/to/policy.pt", config=config)
  policy.set_command(vx=1.0, vy=0.0, yaw=0.0)
  ctrls = policy.step(state)
"""

from __future__ import annotations

import math
import os
import time
from dataclasses import dataclass, field
from typing import Any

import numpy as np


@dataclass
class NeuralModelConfig:
    """Per-model configuration for neural policy inference."""
    joint_names: list[str]
    default_angles: list[float]
    num_obs: int
    num_actions: int
    action_scale: float = 0.25
    ang_vel_scale: float = 0.25
    dof_vel_scale: float = 0.05
    cmd_scales: list[float] = field(default_factory=lambda: [2.0, 2.0, 0.25])
    clip_actions: float = 100.0
    clip_obs: float = 100.0


# ---- Per-model configs ----

GO2_CONFIG = NeuralModelConfig(
    joint_names=[
        "FL_hip_joint", "FL_thigh_joint", "FL_calf_joint",
        "FR_hip_joint", "FR_thigh_joint", "FR_calf_joint",
        "RL_hip_joint", "RL_thigh_joint", "RL_calf_joint",
        "RR_hip_joint", "RR_thigh_joint", "RR_calf_joint",
    ],
    default_angles=[
        0.1, 0.8, -1.5,
        -0.1, 0.8, -1.5,
        0.1, 1.0, -1.5,
        -0.1, 1.0, -1.5,
    ],
    num_obs=48,
    num_actions=12,
)

ANYMAL_CONFIG = NeuralModelConfig(
    joint_names=[
        "LF_HAA", "LF_HFE", "LF_KFE",
        "RF_HAA", "RF_HFE", "RF_KFE",
        "LH_HAA", "LH_HFE", "LH_KFE",
        "RH_HAA", "RH_HFE", "RH_KFE",
    ],
    default_angles=[
        0.0, 0.4, -0.8,
        0.0, 0.4, -0.8,
        0.0, 0.4, -0.8,
        0.0, 0.4, -0.8,
    ],
    num_obs=48,
    num_actions=12,
)

G1_CONFIG = NeuralModelConfig(
    joint_names=[
        "left_hip_pitch_joint", "left_hip_roll_joint", "left_hip_yaw_joint",
        "left_knee_joint", "left_ankle_pitch_joint", "left_ankle_roll_joint",
        "right_hip_pitch_joint", "right_hip_roll_joint", "right_hip_yaw_joint",
        "right_knee_joint", "right_ankle_pitch_joint", "right_ankle_roll_joint",
        "waist_yaw_joint", "waist_roll_joint", "waist_pitch_joint",
        "left_shoulder_pitch_joint", "left_shoulder_roll_joint", "left_shoulder_yaw_joint",
        "left_elbow_joint", "left_wrist_roll_joint", "left_wrist_pitch_joint", "left_wrist_yaw_joint",
        "right_shoulder_pitch_joint", "right_shoulder_roll_joint", "right_shoulder_yaw_joint",
        "right_elbow_joint", "right_wrist_roll_joint", "right_wrist_pitch_joint", "right_wrist_yaw_joint",
    ],
    default_angles=[
        -0.1, 0.0, 0.0, 0.3, -0.2, 0.0,
        -0.1, 0.0, 0.0, 0.3, -0.2, 0.0,
        0.0, 0.0, 0.0,
        0.3, 0.3, 0.0, 0.5, 0.0, 0.0, 0.0,
        0.3, -0.3, 0.0, 0.5, 0.0, 0.0, 0.0,
    ],
    num_obs=29 * 3 + 9 + 6,  # joints * (pos+vel+prev_action) + commands + base_state
    num_actions=29,
)

H1_CONFIG = NeuralModelConfig(
    joint_names=[
        "left_hip_yaw", "left_hip_roll", "left_hip_pitch", "left_knee", "left_ankle",
        "right_hip_yaw", "right_hip_roll", "right_hip_pitch", "right_knee", "right_ankle",
        "torso",
        "left_shoulder_pitch", "left_shoulder_roll", "left_shoulder_yaw", "left_elbow",
        "right_shoulder_pitch", "right_shoulder_roll", "right_shoulder_yaw", "right_elbow",
    ],
    default_angles=[
        0.0, 0.0, -0.2, 0.4, -0.2,
        0.0, 0.0, -0.2, 0.4, -0.2,
        0.0,
        0.3, 0.3, 0.0, 0.5,
        0.3, -0.3, 0.0, 0.5,
    ],
    num_obs=19 * 3 + 9 + 6,
    num_actions=19,
)

NEURAL_CONFIGS: dict[str, NeuralModelConfig] = {
    "unitree-go2": GO2_CONFIG,
    "unitree-g1": G1_CONFIG,
    "unitree-h1": H1_CONFIG,
    "anymal-c": ANYMAL_CONFIG,
}


def _load_model(path: str) -> tuple[Any, str]:
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
    config: NeuralModelConfig = field(default_factory=lambda: GO2_CONFIG)

    cmd_vx: float = 0.0
    cmd_vy: float = 0.0
    cmd_yaw: float = 0.0

    _model: Any = field(default=None, repr=False)
    _format: str = field(default="", repr=False)
    _prev_actions: np.ndarray | None = field(default=None, repr=False)
    _start: float = field(default=0.0, repr=False)

    def __post_init__(self):
        self._prev_actions = np.zeros(self.config.num_actions, dtype=np.float32)
        if self.model_path and os.path.exists(self.model_path):
            self._model, self._format = _load_model(self.model_path)
            print(f"[neural] Loaded {self._format} policy from {self.model_path}")
        elif self.model_path:
            print(f"[neural] Warning: model not found at {self.model_path}")

    def set_command(self, vx: float = 0.0, vy: float = 0.0, yaw: float = 0.0):
        self.cmd_vx = vx
        self.cmd_vy = vy
        self.cmd_yaw = yaw

    def reset(self) -> None:
        self._prev_actions = np.zeros(self.config.num_actions, dtype=np.float32)
        self._start = time.time()

    def step(self, state: dict[str, float]) -> dict[str, float]:
        if self._model is None:
            return {}

        cfg = self.config
        defaults = np.array(cfg.default_angles, dtype=np.float32)
        obs = self._build_obs(state, defaults)
        actions = self._infer(obs)

        actions = np.clip(actions, -cfg.clip_actions, cfg.clip_actions)
        self._prev_actions = actions.copy()

        targets = cfg.action_scale * actions + defaults
        return {f"ctrl_{i}": float(targets[i]) for i in range(cfg.num_actions)}

    def _build_obs(self, state: dict[str, float], defaults: np.ndarray) -> np.ndarray:
        cfg = self.config
        obs = np.zeros(cfg.num_obs, dtype=np.float32)
        cmd_scales = np.array(cfg.cmd_scales, dtype=np.float32)
        n = cfg.num_actions

        # [0:3] Base angular velocity
        obs[0] = state.get("base_angvel_x", 0.0) * cfg.ang_vel_scale
        obs[1] = state.get("base_angvel_y", 0.0) * cfg.ang_vel_scale
        obs[2] = state.get("base_angvel_z", 0.0) * cfg.ang_vel_scale

        # [3:6] Projected gravity
        obs[3] = state.get("gravity_x", 0.0)
        obs[4] = state.get("gravity_y", 0.0)
        obs[5] = state.get("gravity_z", -1.0)

        # [6:9] Velocity commands
        obs[6] = self.cmd_vx * cmd_scales[0]
        obs[7] = self.cmd_vy * cmd_scales[1]
        obs[8] = self.cmd_yaw * cmd_scales[2]

        # [9:9+n] Joint positions minus defaults
        for i, jname in enumerate(cfg.joint_names):
            pos = state.get(f"{jname}_pos", defaults[i])
            obs[9 + i] = pos - defaults[i]

        # [9+n:9+2n] Joint velocities
        for i, jname in enumerate(cfg.joint_names):
            vel = state.get(f"{jname}_vel", 0.0)
            obs[9 + n + i] = vel * cfg.dof_vel_scale

        # [9+2n:9+3n] Previous actions
        if self._prev_actions is not None:
            obs[9 + 2 * n:9 + 3 * n] = self._prev_actions

        # Remaining slots: phase encoding (if space allows)
        phase_start = 9 + 3 * n
        if phase_start + 2 < cfg.num_obs:
            t = time.time() - self._start
            obs[phase_start] = math.sin(2 * math.pi * 2.0 * t)
            obs[phase_start + 1] = math.cos(2 * math.pi * 2.0 * t)

        return np.clip(obs, -cfg.clip_obs, cfg.clip_obs)

    def _infer(self, obs: np.ndarray) -> np.ndarray:
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
        return np.zeros(self.config.num_actions, dtype=np.float32)
