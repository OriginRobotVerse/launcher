"""
Multi-model robot control policies.

Each policy returns a dict of position targets (radians) sent via set_pos.
The sim runner's PD controller converts these to torques at sim rate.

Policies are organized per robot model. The registry auto-selects based on
the device ID passed at startup.
"""

from __future__ import annotations

import math
import time
from dataclasses import dataclass, field
from typing import Protocol


class Policy(Protocol):
    name: str
    description: str

    def reset(self) -> None: ...
    def step(self, state: dict[str, float]) -> dict[str, float]: ...


def _lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * min(max(t, 0.0), 1.0)


# ============================================================
# Unitree Go2 — 12-DOF quadruped
# ============================================================
# Actuator layout:
#   0: FL_hip   1: FL_thigh   2: FL_calf
#   3: FR_hip   4: FR_thigh   5: FR_calf
#   6: RL_hip   7: RL_thigh   8: RL_calf
#   9: RR_hip  10: RR_thigh  11: RR_calf

GO2_STAND_HIP = 0.0
GO2_STAND_THIGH = 0.9
GO2_STAND_CALF = -1.8
GO2_FL = (0, 1, 2)
GO2_FR = (3, 4, 5)
GO2_RL = (6, 7, 8)
GO2_RR = (9, 10, 11)
GO2_ALL_LEGS = [GO2_FL, GO2_FR, GO2_RL, GO2_RR]


def _go2_stand() -> dict[str, float]:
    ctrls = {}
    for hip, thigh, calf in GO2_ALL_LEGS:
        ctrls[f"ctrl_{hip}"] = GO2_STAND_HIP
        ctrls[f"ctrl_{thigh}"] = GO2_STAND_THIGH
        ctrls[f"ctrl_{calf}"] = GO2_STAND_CALF
    return ctrls


def _go2_diagonal_gait(t: float, freq: float, thigh_amp: float, direction: float = 1.0) -> dict[str, float]:
    phase = 2 * math.pi * freq * t
    ctrls = _go2_stand()
    for (hip, thigh, calf), leg_phase in [
        (GO2_FL, 0), (GO2_FR, math.pi), (GO2_RL, math.pi), (GO2_RR, 0)
    ]:
        p = phase + leg_phase
        sw = math.sin(p)
        ctrls[f"ctrl_{thigh}"] = GO2_STAND_THIGH + direction * thigh_amp * sw
        ctrls[f"ctrl_{calf}"] = GO2_STAND_CALF + (0.5 if sw > 0 else -0.15)
    return ctrls


@dataclass
class Go2Stand:
    name: str = "stand"
    description: str = "Hold neutral standing pose"
    def reset(self) -> None: pass
    def step(self, state: dict[str, float]) -> dict[str, float]:
        return _go2_stand()

@dataclass
class Go2Trot:
    name: str = "trot"
    description: str = "Forward trot — diagonal gait"
    frequency: float = 2.0
    _start: float = field(default=0.0, repr=False)
    def reset(self) -> None: self._start = time.time()
    def step(self, state: dict[str, float]) -> dict[str, float]:
        return _go2_diagonal_gait(time.time() - self._start, self.frequency, 0.4, 1.0)

@dataclass
class Go2Run:
    name: str = "run"
    description: str = "Forward run — fast diagonal stride"
    frequency: float = 3.5
    _start: float = field(default=0.0, repr=False)
    def reset(self) -> None: self._start = time.time()
    def step(self, state: dict[str, float]) -> dict[str, float]:
        return _go2_diagonal_gait(time.time() - self._start, self.frequency, 0.55, 1.0)

@dataclass
class Go2Backward:
    name: str = "backward"
    description: str = "Walk backward — reverse trot"
    frequency: float = 2.0
    _start: float = field(default=0.0, repr=False)
    def reset(self) -> None: self._start = time.time()
    def step(self, state: dict[str, float]) -> dict[str, float]:
        return _go2_diagonal_gait(time.time() - self._start, self.frequency, 0.35, -1.0)

@dataclass
class Go2TurnLeft:
    name: str = "turn-left"
    description: str = "Turn left — right legs stride, left legs hold"
    frequency: float = 2.0
    _start: float = field(default=0.0, repr=False)
    def reset(self) -> None: self._start = time.time()
    def step(self, state: dict[str, float]) -> dict[str, float]:
        t = time.time() - self._start
        phase = 2 * math.pi * self.frequency * t
        ctrls = _go2_stand()
        for (hip, thigh, calf), lp in [(GO2_FR, 0), (GO2_RR, math.pi)]:
            sw = math.sin(phase + lp)
            ctrls[f"ctrl_{thigh}"] = GO2_STAND_THIGH + 0.4 * sw
            ctrls[f"ctrl_{calf}"] = GO2_STAND_CALF + (0.5 if sw > 0 else -0.15)
        for (hip, thigh, calf), lp in [(GO2_FL, 0), (GO2_RL, math.pi)]:
            sw = math.sin(phase + lp)
            ctrls[f"ctrl_{thigh}"] = GO2_STAND_THIGH + 0.08 * sw
        ctrls[f"ctrl_{GO2_FL[0]}"] = GO2_STAND_HIP + 0.15
        ctrls[f"ctrl_{GO2_RL[0]}"] = GO2_STAND_HIP + 0.15
        ctrls[f"ctrl_{GO2_FR[0]}"] = GO2_STAND_HIP - 0.1
        ctrls[f"ctrl_{GO2_RR[0]}"] = GO2_STAND_HIP - 0.1
        return ctrls

@dataclass
class Go2TurnRight:
    name: str = "turn-right"
    description: str = "Turn right — left legs stride, right legs hold"
    frequency: float = 2.0
    _start: float = field(default=0.0, repr=False)
    def reset(self) -> None: self._start = time.time()
    def step(self, state: dict[str, float]) -> dict[str, float]:
        t = time.time() - self._start
        phase = 2 * math.pi * self.frequency * t
        ctrls = _go2_stand()
        for (hip, thigh, calf), lp in [(GO2_FL, 0), (GO2_RL, math.pi)]:
            sw = math.sin(phase + lp)
            ctrls[f"ctrl_{thigh}"] = GO2_STAND_THIGH + 0.4 * sw
            ctrls[f"ctrl_{calf}"] = GO2_STAND_CALF + (0.5 if sw > 0 else -0.15)
        for (hip, thigh, calf), lp in [(GO2_FR, 0), (GO2_RR, math.pi)]:
            sw = math.sin(phase + lp)
            ctrls[f"ctrl_{thigh}"] = GO2_STAND_THIGH + 0.08 * sw
        ctrls[f"ctrl_{GO2_FR[0]}"] = GO2_STAND_HIP + 0.15
        ctrls[f"ctrl_{GO2_RR[0]}"] = GO2_STAND_HIP + 0.15
        ctrls[f"ctrl_{GO2_FL[0]}"] = GO2_STAND_HIP - 0.1
        ctrls[f"ctrl_{GO2_RL[0]}"] = GO2_STAND_HIP - 0.1
        return ctrls

@dataclass
class Go2Crouch:
    name: str = "crouch"
    description: str = "Smooth transition to crouched pose"
    _start: float = field(default=0.0, repr=False)
    def reset(self) -> None: self._start = time.time()
    def step(self, state: dict[str, float]) -> dict[str, float]:
        blend = min((time.time() - self._start) / 1.0, 1.0)
        ctrls = {}
        for hip, thigh, calf in GO2_ALL_LEGS:
            ctrls[f"ctrl_{hip}"] = GO2_STAND_HIP
            ctrls[f"ctrl_{thigh}"] = _lerp(GO2_STAND_THIGH, 1.5, blend)
            ctrls[f"ctrl_{calf}"] = _lerp(GO2_STAND_CALF, -2.7, blend)
        return ctrls

@dataclass
class Go2Wave:
    name: str = "wave"
    description: str = "Lift and wave front-right leg"
    _start: float = field(default=0.0, repr=False)
    def reset(self) -> None: self._start = time.time()
    def step(self, state: dict[str, float]) -> dict[str, float]:
        t = time.time() - self._start
        ctrls = _go2_stand()
        lift = min(t / 0.5, 1.0)
        fr_hip, fr_thigh, fr_calf = GO2_FR
        ctrls[f"ctrl_{fr_thigh}"] = _lerp(GO2_STAND_THIGH, -0.3, lift)
        ctrls[f"ctrl_{fr_calf}"] = _lerp(GO2_STAND_CALF, -1.0, lift) + lift * 0.6 * math.sin(3.0 * t)
        return ctrls

@dataclass
class Go2Bounce:
    name: str = "bounce"
    description: str = "Rhythmic vertical bouncing in place"
    frequency: float = 2.0
    _start: float = field(default=0.0, repr=False)
    def reset(self) -> None: self._start = time.time()
    def step(self, state: dict[str, float]) -> dict[str, float]:
        phase = 2 * math.pi * self.frequency * (time.time() - self._start)
        ext = 0.3 * math.sin(phase)
        ctrls = {}
        for hip, thigh, calf in GO2_ALL_LEGS:
            ctrls[f"ctrl_{hip}"] = GO2_STAND_HIP
            ctrls[f"ctrl_{thigh}"] = GO2_STAND_THIGH + ext
            ctrls[f"ctrl_{calf}"] = GO2_STAND_CALF - ext * 1.5
        return ctrls


GO2_POLICIES: list[Policy] = [
    Go2Stand(), Go2Trot(), Go2Run(), Go2TurnLeft(), Go2TurnRight(),
    Go2Backward(), Go2Crouch(), Go2Wave(), Go2Bounce(),
]


# ============================================================
# ANYmal C — 12-DOF quadruped (HAA/HFE/KFE per leg)
# ============================================================
# Actuator layout:
#   0: LF_HAA  1: LF_HFE  2: LF_KFE
#   3: RF_HAA  4: RF_HFE  5: RF_KFE
#   6: LH_HAA  7: LH_HFE  8: LH_KFE
#   9: RH_HAA 10: RH_HFE 11: RH_KFE

ANYMAL_STAND_HAA = 0.0
ANYMAL_STAND_HFE = 0.4
ANYMAL_STAND_KFE = -0.8
ANYMAL_LF = (0, 1, 2)
ANYMAL_RF = (3, 4, 5)
ANYMAL_LH = (6, 7, 8)
ANYMAL_RH = (9, 10, 11)
ANYMAL_ALL_LEGS = [ANYMAL_LF, ANYMAL_RF, ANYMAL_LH, ANYMAL_RH]


def _anymal_stand() -> dict[str, float]:
    ctrls = {}
    for haa, hfe, kfe in ANYMAL_ALL_LEGS:
        ctrls[f"ctrl_{haa}"] = ANYMAL_STAND_HAA
        ctrls[f"ctrl_{hfe}"] = ANYMAL_STAND_HFE
        ctrls[f"ctrl_{kfe}"] = ANYMAL_STAND_KFE
    return ctrls


def _anymal_diagonal_gait(t: float, freq: float, hfe_amp: float, direction: float = 1.0) -> dict[str, float]:
    phase = 2 * math.pi * freq * t
    ctrls = _anymal_stand()
    for (haa, hfe, kfe), leg_phase in [
        (ANYMAL_LF, 0), (ANYMAL_RF, math.pi), (ANYMAL_LH, math.pi), (ANYMAL_RH, 0)
    ]:
        p = phase + leg_phase
        sw = math.sin(p)
        ctrls[f"ctrl_{hfe}"] = ANYMAL_STAND_HFE + direction * hfe_amp * sw
        ctrls[f"ctrl_{kfe}"] = ANYMAL_STAND_KFE + (0.4 if sw > 0 else -0.1)
    return ctrls


@dataclass
class AnymalStand:
    name: str = "stand"
    description: str = "Hold neutral standing pose"
    def reset(self) -> None: pass
    def step(self, state: dict[str, float]) -> dict[str, float]:
        return _anymal_stand()

@dataclass
class AnymalTrot:
    name: str = "trot"
    description: str = "Forward trot — diagonal gait"
    frequency: float = 1.5
    _start: float = field(default=0.0, repr=False)
    def reset(self) -> None: self._start = time.time()
    def step(self, state: dict[str, float]) -> dict[str, float]:
        return _anymal_diagonal_gait(time.time() - self._start, self.frequency, 0.35, 1.0)

@dataclass
class AnymalRun:
    name: str = "run"
    description: str = "Forward run — fast stride"
    frequency: float = 2.5
    _start: float = field(default=0.0, repr=False)
    def reset(self) -> None: self._start = time.time()
    def step(self, state: dict[str, float]) -> dict[str, float]:
        return _anymal_diagonal_gait(time.time() - self._start, self.frequency, 0.5, 1.0)

@dataclass
class AnymalTurnLeft:
    name: str = "turn-left"
    description: str = "Turn left in place"
    frequency: float = 1.5
    _start: float = field(default=0.0, repr=False)
    def reset(self) -> None: self._start = time.time()
    def step(self, state: dict[str, float]) -> dict[str, float]:
        t = time.time() - self._start
        phase = 2 * math.pi * self.frequency * t
        ctrls = _anymal_stand()
        for (haa, hfe, kfe), lp in [(ANYMAL_RF, 0), (ANYMAL_RH, math.pi)]:
            sw = math.sin(phase + lp)
            ctrls[f"ctrl_{hfe}"] = ANYMAL_STAND_HFE + 0.35 * sw
            ctrls[f"ctrl_{kfe}"] = ANYMAL_STAND_KFE + (0.4 if sw > 0 else -0.1)
        ctrls[f"ctrl_{ANYMAL_LF[0]}"] = ANYMAL_STAND_HAA + 0.15
        ctrls[f"ctrl_{ANYMAL_LH[0]}"] = ANYMAL_STAND_HAA + 0.15
        ctrls[f"ctrl_{ANYMAL_RF[0]}"] = ANYMAL_STAND_HAA - 0.1
        ctrls[f"ctrl_{ANYMAL_RH[0]}"] = ANYMAL_STAND_HAA - 0.1
        return ctrls

@dataclass
class AnymalCrouch:
    name: str = "crouch"
    description: str = "Lower body to crouched stance"
    _start: float = field(default=0.0, repr=False)
    def reset(self) -> None: self._start = time.time()
    def step(self, state: dict[str, float]) -> dict[str, float]:
        blend = min((time.time() - self._start) / 1.0, 1.0)
        ctrls = {}
        for haa, hfe, kfe in ANYMAL_ALL_LEGS:
            ctrls[f"ctrl_{haa}"] = ANYMAL_STAND_HAA
            ctrls[f"ctrl_{hfe}"] = _lerp(ANYMAL_STAND_HFE, 0.9, blend)
            ctrls[f"ctrl_{kfe}"] = _lerp(ANYMAL_STAND_KFE, -1.6, blend)
        return ctrls

@dataclass
class AnymalBounce:
    name: str = "bounce"
    description: str = "Rhythmic bouncing in place"
    frequency: float = 2.0
    _start: float = field(default=0.0, repr=False)
    def reset(self) -> None: self._start = time.time()
    def step(self, state: dict[str, float]) -> dict[str, float]:
        phase = 2 * math.pi * self.frequency * (time.time() - self._start)
        ext = 0.25 * math.sin(phase)
        ctrls = {}
        for haa, hfe, kfe in ANYMAL_ALL_LEGS:
            ctrls[f"ctrl_{haa}"] = ANYMAL_STAND_HAA
            ctrls[f"ctrl_{hfe}"] = ANYMAL_STAND_HFE + ext
            ctrls[f"ctrl_{kfe}"] = ANYMAL_STAND_KFE - ext * 1.5
        return ctrls


ANYMAL_POLICIES: list[Policy] = [
    AnymalStand(), AnymalTrot(), AnymalRun(), AnymalTurnLeft(),
    AnymalCrouch(), AnymalBounce(),
]


# ============================================================
# Humanoid helpers (shared by G1 and H1)
# ============================================================

def _biped_stand(num_actuators: int, keyframe: list[float]) -> dict[str, float]:
    return {f"ctrl_{i}": keyframe[i] for i in range(num_actuators)}


def _biped_walk(
    t: float, freq: float, num_actuators: int, keyframe: list[float],
    left_hip_pitch: int, left_knee: int, left_ankle: int,
    right_hip_pitch: int, right_knee: int, right_ankle: int,
    hip_amp: float = 0.3, knee_amp: float = 0.4, ankle_amp: float = 0.2,
) -> dict[str, float]:
    phase = 2 * math.pi * freq * t
    ctrls = {f"ctrl_{i}": keyframe[i] for i in range(num_actuators)}
    # Left leg
    sw_l = math.sin(phase)
    ctrls[f"ctrl_{left_hip_pitch}"] = keyframe[left_hip_pitch] + hip_amp * sw_l
    ctrls[f"ctrl_{left_knee}"] = keyframe[left_knee] + knee_amp * max(sw_l, 0)
    ctrls[f"ctrl_{left_ankle}"] = keyframe[left_ankle] - ankle_amp * sw_l
    # Right leg (180 out of phase)
    sw_r = math.sin(phase + math.pi)
    ctrls[f"ctrl_{right_hip_pitch}"] = keyframe[right_hip_pitch] + hip_amp * sw_r
    ctrls[f"ctrl_{right_knee}"] = keyframe[right_knee] + knee_amp * max(sw_r, 0)
    ctrls[f"ctrl_{right_ankle}"] = keyframe[right_ankle] - ankle_amp * sw_r
    return ctrls


# ============================================================
# Unitree G1 — 29-DOF humanoid
# ============================================================
# Actuator order (from MuJoCo menagerie):
# 0-5:   left leg  (hip_pitch, hip_roll, hip_yaw, knee, ankle_pitch, ankle_roll)
# 6-11:  right leg (same)
# 12-14: waist (yaw, roll, pitch)
# 15-21: left arm  (shoulder_pitch/roll/yaw, elbow, wrist_roll/pitch/yaw)
# 22-28: right arm (same)

G1_NUM = 29
G1_KEYFRAME = [
    # Left leg
    -0.1, 0.0, 0.0, 0.3, -0.2, 0.0,
    # Right leg
    -0.1, 0.0, 0.0, 0.3, -0.2, 0.0,
    # Waist
    0.0, 0.0, 0.0,
    # Left arm
    0.3, 0.3, 0.0, 0.5, 0.0, 0.0, 0.0,
    # Right arm
    0.3, -0.3, 0.0, 0.5, 0.0, 0.0, 0.0,
]
G1_L_HIP_PITCH, G1_L_KNEE, G1_L_ANKLE = 0, 3, 4
G1_R_HIP_PITCH, G1_R_KNEE, G1_R_ANKLE = 6, 9, 10


@dataclass
class G1Stand:
    name: str = "stand"
    description: str = "Neutral standing pose — arms at sides"
    def reset(self) -> None: pass
    def step(self, state: dict[str, float]) -> dict[str, float]:
        return _biped_stand(G1_NUM, G1_KEYFRAME)

@dataclass
class G1Walk:
    name: str = "walk"
    description: str = "Forward bipedal walk — alternating legs"
    frequency: float = 1.0
    _start: float = field(default=0.0, repr=False)
    def reset(self) -> None: self._start = time.time()
    def step(self, state: dict[str, float]) -> dict[str, float]:
        return _biped_walk(
            time.time() - self._start, self.frequency, G1_NUM, G1_KEYFRAME,
            G1_L_HIP_PITCH, G1_L_KNEE, G1_L_ANKLE,
            G1_R_HIP_PITCH, G1_R_KNEE, G1_R_ANKLE,
        )

@dataclass
class G1Crouch:
    name: str = "crouch"
    description: str = "Lower into a crouching position"
    _start: float = field(default=0.0, repr=False)
    def reset(self) -> None: self._start = time.time()
    def step(self, state: dict[str, float]) -> dict[str, float]:
        blend = min((time.time() - self._start) / 1.0, 1.0)
        ctrls = _biped_stand(G1_NUM, G1_KEYFRAME)
        for hip, knee, ankle in [(G1_L_HIP_PITCH, G1_L_KNEE, G1_L_ANKLE),
                                  (G1_R_HIP_PITCH, G1_R_KNEE, G1_R_ANKLE)]:
            ctrls[f"ctrl_{hip}"] = _lerp(G1_KEYFRAME[hip], -0.5, blend)
            ctrls[f"ctrl_{knee}"] = _lerp(G1_KEYFRAME[knee], 1.0, blend)
            ctrls[f"ctrl_{ankle}"] = _lerp(G1_KEYFRAME[ankle], -0.5, blend)
        return ctrls

@dataclass
class G1WaveArm:
    name: str = "wave-arm"
    description: str = "Wave left arm while standing"
    _start: float = field(default=0.0, repr=False)
    def reset(self) -> None: self._start = time.time()
    def step(self, state: dict[str, float]) -> dict[str, float]:
        t = time.time() - self._start
        ctrls = _biped_stand(G1_NUM, G1_KEYFRAME)
        lift = min(t / 0.5, 1.0)
        # Left shoulder pitch (15) — raise arm
        ctrls["ctrl_15"] = _lerp(G1_KEYFRAME[15], -1.5, lift)
        # Left elbow (18) — wave back and forth
        ctrls["ctrl_18"] = _lerp(G1_KEYFRAME[18], 0.8, lift) + lift * 0.4 * math.sin(3.0 * t)
        return ctrls

@dataclass
class G1BowWaist:
    name: str = "bow"
    description: str = "Bow forward from the waist"
    _start: float = field(default=0.0, repr=False)
    def reset(self) -> None: self._start = time.time()
    def step(self, state: dict[str, float]) -> dict[str, float]:
        blend = min((time.time() - self._start) / 1.5, 1.0)
        ctrls = _biped_stand(G1_NUM, G1_KEYFRAME)
        # Waist pitch (14)
        ctrls["ctrl_14"] = _lerp(0.0, 0.6, blend)
        return ctrls


G1_POLICIES: list[Policy] = [
    G1Stand(), G1Walk(), G1Crouch(), G1WaveArm(), G1BowWaist(),
]


# ============================================================
# Unitree H1 — 19-DOF humanoid
# ============================================================
# Actuator order:
# 0-4:   left leg  (hip_yaw, hip_roll, hip_pitch, knee, ankle)
# 5-9:   right leg (same)
# 10:    torso
# 11-14: left arm  (shoulder_pitch, shoulder_roll, shoulder_yaw, elbow)
# 15-18: right arm (same)

H1_NUM = 19
H1_KEYFRAME = [
    # Left leg
    0.0, 0.0, -0.2, 0.4, -0.2,
    # Right leg
    0.0, 0.0, -0.2, 0.4, -0.2,
    # Torso
    0.0,
    # Left arm
    0.3, 0.3, 0.0, 0.5,
    # Right arm
    0.3, -0.3, 0.0, 0.5,
]
H1_L_HIP_PITCH, H1_L_KNEE, H1_L_ANKLE = 2, 3, 4
H1_R_HIP_PITCH, H1_R_KNEE, H1_R_ANKLE = 7, 8, 9


@dataclass
class H1Stand:
    name: str = "stand"
    description: str = "Neutral standing pose"
    def reset(self) -> None: pass
    def step(self, state: dict[str, float]) -> dict[str, float]:
        return _biped_stand(H1_NUM, H1_KEYFRAME)

@dataclass
class H1Walk:
    name: str = "walk"
    description: str = "Forward bipedal walk"
    frequency: float = 1.0
    _start: float = field(default=0.0, repr=False)
    def reset(self) -> None: self._start = time.time()
    def step(self, state: dict[str, float]) -> dict[str, float]:
        return _biped_walk(
            time.time() - self._start, self.frequency, H1_NUM, H1_KEYFRAME,
            H1_L_HIP_PITCH, H1_L_KNEE, H1_L_ANKLE,
            H1_R_HIP_PITCH, H1_R_KNEE, H1_R_ANKLE,
        )

@dataclass
class H1Crouch:
    name: str = "crouch"
    description: str = "Lower into a crouching position"
    _start: float = field(default=0.0, repr=False)
    def reset(self) -> None: self._start = time.time()
    def step(self, state: dict[str, float]) -> dict[str, float]:
        blend = min((time.time() - self._start) / 1.0, 1.0)
        ctrls = _biped_stand(H1_NUM, H1_KEYFRAME)
        for hip, knee, ankle in [(H1_L_HIP_PITCH, H1_L_KNEE, H1_L_ANKLE),
                                  (H1_R_HIP_PITCH, H1_R_KNEE, H1_R_ANKLE)]:
            ctrls[f"ctrl_{hip}"] = _lerp(H1_KEYFRAME[hip], -0.6, blend)
            ctrls[f"ctrl_{knee}"] = _lerp(H1_KEYFRAME[knee], 1.1, blend)
            ctrls[f"ctrl_{ankle}"] = _lerp(H1_KEYFRAME[ankle], -0.5, blend)
        return ctrls

@dataclass
class H1WaveArm:
    name: str = "wave-arm"
    description: str = "Wave left arm while standing"
    _start: float = field(default=0.0, repr=False)
    def reset(self) -> None: self._start = time.time()
    def step(self, state: dict[str, float]) -> dict[str, float]:
        t = time.time() - self._start
        ctrls = _biped_stand(H1_NUM, H1_KEYFRAME)
        lift = min(t / 0.5, 1.0)
        # Left shoulder pitch (11)
        ctrls["ctrl_11"] = _lerp(H1_KEYFRAME[11], -1.5, lift)
        # Left elbow (14)
        ctrls["ctrl_14"] = _lerp(H1_KEYFRAME[14], 0.8, lift) + lift * 0.4 * math.sin(3.0 * t)
        return ctrls


H1_POLICIES: list[Policy] = [
    H1Stand(), H1Walk(), H1Crouch(), H1WaveArm(),
]


# ============================================================
# Shadow Hand — 20-DOF dexterous hand
# ============================================================
# Actuator order:
# 0-1:   wrist (WRJ2, WRJ1)
# 2-6:   thumb (THJ5, THJ4, THJ3, THJ2, THJ1)
# 7-9:   first finger (FFJ4, FFJ3, FFJ0)
# 10-12: middle finger (MFJ4, MFJ3, MFJ0)
# 13-15: ring finger (RFJ4, RFJ3, RFJ0)
# 16-19: little finger (LFJ5, LFJ4, LFJ3, LFJ0)

HAND_NUM = 20
HAND_OPEN = [0.0] * 20  # all joints at zero = hand open flat

# Closed fist: flex all finger joints
HAND_CLOSED = [
    0.0, 0.0,           # wrist neutral
    0.0, 1.0, 0.5, 0.5, 0.5,  # thumb curled
    0.0, 1.2, 1.2,      # first finger
    0.0, 1.2, 1.2,      # middle finger
    0.0, 1.2, 1.2,      # ring finger
    0.0, 0.0, 1.2, 1.2, # little finger
]

# Pinch grip: thumb + first finger together
HAND_PINCH = [
    0.0, 0.0,
    0.3, 0.8, 0.4, 0.6, 0.5,  # thumb toward index
    0.0, 0.8, 0.8,             # first finger curled
    0.0, 0.0, 0.0,             # middle open
    0.0, 0.0, 0.0,             # ring open
    0.0, 0.0, 0.0, 0.0,        # little open
]


@dataclass
class HandOpen:
    name: str = "open"
    description: str = "Fully open hand — all fingers extended"
    def reset(self) -> None: pass
    def step(self, state: dict[str, float]) -> dict[str, float]:
        return {f"ctrl_{i}": HAND_OPEN[i] for i in range(HAND_NUM)}

@dataclass
class HandClose:
    name: str = "close"
    description: str = "Close hand into a fist"
    _start: float = field(default=0.0, repr=False)
    def reset(self) -> None: self._start = time.time()
    def step(self, state: dict[str, float]) -> dict[str, float]:
        blend = min((time.time() - self._start) / 0.8, 1.0)
        return {f"ctrl_{i}": _lerp(HAND_OPEN[i], HAND_CLOSED[i], blend) for i in range(HAND_NUM)}

@dataclass
class HandPinch:
    name: str = "pinch"
    description: str = "Pinch grip — thumb and index finger"
    _start: float = field(default=0.0, repr=False)
    def reset(self) -> None: self._start = time.time()
    def step(self, state: dict[str, float]) -> dict[str, float]:
        blend = min((time.time() - self._start) / 0.6, 1.0)
        return {f"ctrl_{i}": _lerp(HAND_OPEN[i], HAND_PINCH[i], blend) for i in range(HAND_NUM)}

@dataclass
class HandWaveFingers:
    name: str = "wave-fingers"
    description: str = "Sequential finger wave — pinky to index"
    frequency: float = 1.5
    _start: float = field(default=0.0, repr=False)
    def reset(self) -> None: self._start = time.time()
    def step(self, state: dict[str, float]) -> dict[str, float]:
        t = time.time() - self._start
        ctrls = {f"ctrl_{i}": 0.0 for i in range(HAND_NUM)}
        # Finger flex actuators (J0 or J3 for each finger)
        finger_flexors = [
            (19, 0.0),   # little (LFJ0)
            (15, 0.8),   # ring (RFJ0)
            (12, 1.6),   # middle (MFJ0)
            (9,  2.4),   # first (FFJ0)
        ]
        for ctrl_idx, phase_offset in finger_flexors:
            wave = max(0, math.sin(2 * math.pi * self.frequency * t - phase_offset))
            ctrls[f"ctrl_{ctrl_idx}"] = 1.2 * wave
        return ctrls

@dataclass
class HandGrasp:
    name: str = "grasp"
    description: str = "Power grasp — all fingers curl progressively"
    _start: float = field(default=0.0, repr=False)
    def reset(self) -> None: self._start = time.time()
    def step(self, state: dict[str, float]) -> dict[str, float]:
        t = time.time() - self._start
        blend = min(t / 1.5, 1.0)
        grasp_targets = [
            0.0, 0.0,
            0.2, 0.9, 0.4, 0.7, 0.6,  # thumb
            0.0, 1.0, 1.0,             # first
            0.0, 1.0, 1.0,             # middle
            0.0, 1.0, 1.0,             # ring
            0.0, 0.0, 1.0, 1.0,        # little
        ]
        return {f"ctrl_{i}": _lerp(HAND_OPEN[i], grasp_targets[i], blend) for i in range(HAND_NUM)}


HAND_POLICIES: list[Policy] = [
    HandOpen(), HandClose(), HandPinch(), HandWaveFingers(), HandGrasp(),
]


# ============================================================
# Model registry — maps device IDs to policy sets
# ============================================================

MODEL_POLICIES: dict[str, list[Policy]] = {
    "unitree-go2": GO2_POLICIES,
    "unitree-g1": G1_POLICIES,
    "unitree-h1": H1_POLICIES,
    "anymal-c": ANYMAL_POLICIES,
    "shadow-hand": HAND_POLICIES,
}

# Detect model type from device ID prefix
MODEL_DETECTION_RULES: list[tuple[str, str]] = [
    ("go2", "unitree-go2"),
    ("g1", "unitree-g1"),
    ("h1", "unitree-h1"),
    ("anymal", "anymal-c"),
    ("shadow", "shadow-hand"),
]


def get_policies_for_device(device_id: str) -> list[Policy]:
    """Get the policy list for a device ID."""
    # Exact match
    if device_id in MODEL_POLICIES:
        return MODEL_POLICIES[device_id]
    # Fuzzy match
    lower = device_id.lower()
    for pattern, model_key in MODEL_DETECTION_RULES:
        if pattern in lower:
            return MODEL_POLICIES[model_key]
    # Default to Go2
    return GO2_POLICIES


# Default exports for backward compatibility
ALL_POLICIES: list[Policy] = GO2_POLICIES
POLICY_MAP: dict[str, Policy] = {p.name: p for p in ALL_POLICIES}
