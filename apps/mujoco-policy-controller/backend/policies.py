"""
Robot control policies for the Unitree Go2.

Each policy returns a dict of position targets (radians) sent via set_pos.
The sim runner's PD controller converts these to torques at 500Hz.

Go2 actuator layout:
  0: FL_hip      1: FL_thigh    2: FL_calf
  3: FR_hip      4: FR_thigh    5: FR_calf
  6: RL_hip      7: RL_thigh    8: RL_calf
  9: RR_hip     10: RR_thigh   11: RR_calf

Joint axes:
  hip   = X axis (lateral abduction/adduction)
  thigh = Y axis (pitch — swing leg forward/back)
  calf  = Y axis (pitch — extend/retract lower leg)

Standing keyframe: hip=0, thigh=0.9, calf=-1.8
Robot faces +X. More positive thigh = foot moves behind body.

Gait phases (for sin(p)):
  sin(p) > 0 → thigh more positive → foot behind → SWING (lift foot)
  sin(p) < 0 → thigh less positive → foot in front → STANCE (push off)
"""

from __future__ import annotations

import math
import time
from dataclasses import dataclass, field
from typing import Protocol

STAND_HIP = 0.0
STAND_THIGH = 0.9
STAND_CALF = -1.8

FL = (0, 1, 2)
FR = (3, 4, 5)
RL = (6, 7, 8)
RR = (9, 10, 11)
ALL_LEGS = [FL, FR, RL, RR]


def _stand_ctrls() -> dict[str, float]:
    ctrls = {}
    for hip, thigh, calf in ALL_LEGS:
        ctrls[f"ctrl_{hip}"] = STAND_HIP
        ctrls[f"ctrl_{thigh}"] = STAND_THIGH
        ctrls[f"ctrl_{calf}"] = STAND_CALF
    return ctrls


def _lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * min(max(t, 0.0), 1.0)


def _diagonal_gait(
    t: float, freq: float, thigh_amp: float, direction: float = 1.0,
) -> dict[str, float]:
    """Shared diagonal gait logic for trot/run.

    direction: 1.0 = forward, -1.0 = backward.
    """
    phase = 2 * math.pi * freq * t
    ctrls = _stand_ctrls()

    for (hip, thigh, calf), leg_phase in [
        (FL, 0), (FR, math.pi), (RL, math.pi), (RR, 0)
    ]:
        p = phase + leg_phase
        sw = math.sin(p)

        ctrls[f"ctrl_{thigh}"] = STAND_THIGH + direction * thigh_amp * sw

        if sw > 0:
            # Swing phase — retract calf to clear ground
            ctrls[f"ctrl_{calf}"] = STAND_CALF + 0.5
        else:
            # Stance phase — extend calf for ground push
            ctrls[f"ctrl_{calf}"] = STAND_CALF - 0.15

    return ctrls


class Policy(Protocol):
    name: str
    description: str

    def reset(self) -> None: ...
    def step(self, state: dict[str, float]) -> dict[str, float]: ...


@dataclass
class StandPolicy:
    name: str = "stand"
    description: str = "Hold neutral standing pose"

    def reset(self) -> None:
        pass

    def step(self, state: dict[str, float]) -> dict[str, float]:
        return _stand_ctrls()


@dataclass
class TrotGaitPolicy:
    name: str = "trot"
    description: str = "Forward trot — diagonal gait"
    frequency: float = 2.0
    _start: float = field(default=0.0, repr=False)

    def reset(self) -> None:
        self._start = time.time()

    def step(self, state: dict[str, float]) -> dict[str, float]:
        t = time.time() - self._start
        return _diagonal_gait(t, self.frequency, thigh_amp=0.4, direction=1.0)


@dataclass
class RunPolicy:
    name: str = "run"
    description: str = "Forward run — fast diagonal stride"
    frequency: float = 3.5
    _start: float = field(default=0.0, repr=False)

    def reset(self) -> None:
        self._start = time.time()

    def step(self, state: dict[str, float]) -> dict[str, float]:
        t = time.time() - self._start
        return _diagonal_gait(t, self.frequency, thigh_amp=0.55, direction=1.0)


@dataclass
class BackwardPolicy:
    name: str = "backward"
    description: str = "Walk backward — reverse trot"
    frequency: float = 2.0
    _start: float = field(default=0.0, repr=False)

    def reset(self) -> None:
        self._start = time.time()

    def step(self, state: dict[str, float]) -> dict[str, float]:
        t = time.time() - self._start
        return _diagonal_gait(t, self.frequency, thigh_amp=0.35, direction=-1.0)


@dataclass
class TurnLeftPolicy:
    name: str = "turn-left"
    description: str = "Turn left — right legs stride, left legs hold"
    frequency: float = 2.0
    _start: float = field(default=0.0, repr=False)

    def reset(self) -> None:
        self._start = time.time()

    def step(self, state: dict[str, float]) -> dict[str, float]:
        t = time.time() - self._start
        phase = 2 * math.pi * self.frequency * t
        ctrls = _stand_ctrls()

        # Right legs: full forward stride
        for (hip, thigh, calf), lp in [(FR, 0), (RR, math.pi)]:
            sw = math.sin(phase + lp)
            ctrls[f"ctrl_{thigh}"] = STAND_THIGH + 0.4 * sw
            ctrls[f"ctrl_{calf}"] = STAND_CALF + (0.5 if sw > 0 else -0.15)

        # Left legs: minimal motion (pivot side)
        for (hip, thigh, calf), lp in [(FL, 0), (RL, math.pi)]:
            sw = math.sin(phase + lp)
            ctrls[f"ctrl_{thigh}"] = STAND_THIGH + 0.08 * sw
            ctrls[f"ctrl_{calf}"] = STAND_CALF

        # Hip abduction to aid yaw
        ctrls[f"ctrl_{FL[0]}"] = STAND_HIP + 0.15
        ctrls[f"ctrl_{RL[0]}"] = STAND_HIP + 0.15
        ctrls[f"ctrl_{FR[0]}"] = STAND_HIP - 0.1
        ctrls[f"ctrl_{RR[0]}"] = STAND_HIP - 0.1

        return ctrls


@dataclass
class TurnRightPolicy:
    name: str = "turn-right"
    description: str = "Turn right — left legs stride, right legs hold"
    frequency: float = 2.0
    _start: float = field(default=0.0, repr=False)

    def reset(self) -> None:
        self._start = time.time()

    def step(self, state: dict[str, float]) -> dict[str, float]:
        t = time.time() - self._start
        phase = 2 * math.pi * self.frequency * t
        ctrls = _stand_ctrls()

        # Left legs: full forward stride
        for (hip, thigh, calf), lp in [(FL, 0), (RL, math.pi)]:
            sw = math.sin(phase + lp)
            ctrls[f"ctrl_{thigh}"] = STAND_THIGH + 0.4 * sw
            ctrls[f"ctrl_{calf}"] = STAND_CALF + (0.5 if sw > 0 else -0.15)

        # Right legs: minimal motion
        for (hip, thigh, calf), lp in [(FR, 0), (RR, math.pi)]:
            sw = math.sin(phase + lp)
            ctrls[f"ctrl_{thigh}"] = STAND_THIGH + 0.08 * sw
            ctrls[f"ctrl_{calf}"] = STAND_CALF

        ctrls[f"ctrl_{FR[0]}"] = STAND_HIP + 0.15
        ctrls[f"ctrl_{RR[0]}"] = STAND_HIP + 0.15
        ctrls[f"ctrl_{FL[0]}"] = STAND_HIP - 0.1
        ctrls[f"ctrl_{RL[0]}"] = STAND_HIP - 0.1

        return ctrls


@dataclass
class CrouchPolicy:
    name: str = "crouch"
    description: str = "Smooth transition to crouched pose"
    _start: float = field(default=0.0, repr=False)

    def reset(self) -> None:
        self._start = time.time()

    def step(self, state: dict[str, float]) -> dict[str, float]:
        t = time.time() - self._start
        blend = min(t / 1.0, 1.0)
        ctrls = {}

        for hip, thigh, calf in ALL_LEGS:
            ctrls[f"ctrl_{hip}"] = STAND_HIP
            ctrls[f"ctrl_{thigh}"] = _lerp(STAND_THIGH, 1.5, blend)
            ctrls[f"ctrl_{calf}"] = _lerp(STAND_CALF, -2.7, blend)

        return ctrls


@dataclass
class WavePolicy:
    """Stand on three legs, lift front-right, wave it."""
    name: str = "wave"
    description: str = "Lift and wave front-right leg"
    _start: float = field(default=0.0, repr=False)

    def reset(self) -> None:
        self._start = time.time()

    def step(self, state: dict[str, float]) -> dict[str, float]:
        t = time.time() - self._start

        # Three supporting legs hold standing pose
        ctrls = _stand_ctrls()

        # Lift FR leg over 0.5s
        lift = min(t / 0.5, 1.0)

        fr_hip, fr_thigh, fr_calf = FR
        # Raise the "arm": thigh swings forward (less positive = leg up in front)
        ctrls[f"ctrl_{fr_thigh}"] = _lerp(STAND_THIGH, -0.3, lift)
        # Wave the "paw": calf swings back and forth
        ctrls[f"ctrl_{fr_calf}"] = _lerp(STAND_CALF, -1.0, lift) + lift * 0.6 * math.sin(3.0 * t)
        # Keep hip neutral
        ctrls[f"ctrl_{fr_hip}"] = STAND_HIP

        return ctrls


@dataclass
class BouncePolicy:
    name: str = "bounce"
    description: str = "Rhythmic vertical bouncing in place"
    frequency: float = 2.0
    _start: float = field(default=0.0, repr=False)

    def reset(self) -> None:
        self._start = time.time()

    def step(self, state: dict[str, float]) -> dict[str, float]:
        t = time.time() - self._start
        phase = 2 * math.pi * self.frequency * t
        ctrls = {}

        ext = 0.3 * math.sin(phase)
        for hip, thigh, calf in ALL_LEGS:
            ctrls[f"ctrl_{hip}"] = STAND_HIP
            ctrls[f"ctrl_{thigh}"] = STAND_THIGH + ext
            ctrls[f"ctrl_{calf}"] = STAND_CALF - ext * 1.5

        return ctrls


@dataclass
class SineWavePolicy:
    name: str = "sine-wave"
    description: str = "Gentle oscillation around standing pose"
    amplitude: float = 0.25
    frequency: float = 1.0
    _start: float = field(default=0.0, repr=False)

    def reset(self) -> None:
        self._start = time.time()

    def step(self, state: dict[str, float]) -> dict[str, float]:
        t = time.time() - self._start
        ctrls = _stand_ctrls()

        for i, (hip, thigh, calf) in enumerate(ALL_LEGS):
            phase = (2 * math.pi * i) / 4
            wave = self.amplitude * math.sin(2 * math.pi * self.frequency * t + phase)
            ctrls[f"ctrl_{thigh}"] = STAND_THIGH + wave
            ctrls[f"ctrl_{calf}"] = STAND_CALF - wave * 1.5

        return ctrls


# --- Registry ---

ALL_POLICIES: list[Policy] = [
    StandPolicy(),
    TrotGaitPolicy(),
    RunPolicy(),
    TurnLeftPolicy(),
    TurnRightPolicy(),
    BackwardPolicy(),
    CrouchPolicy(),
    WavePolicy(),
    BouncePolicy(),
    SineWavePolicy(),
]

POLICY_MAP: dict[str, Policy] = {p.name: p for p in ALL_POLICIES}
