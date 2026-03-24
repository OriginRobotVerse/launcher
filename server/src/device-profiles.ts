import type { DeviceProfile, DeviceType, DeviceManifest, StorageAdapter } from "./types.js";

export const BUILTIN_PROFILES: Record<string, Omit<DeviceProfile, "deviceId">> = {
  "unitree-go2": {
    type: "quadruped",
    displayName: "Unitree Go2",
    description: "12-DOF quadruped with hip/thigh/calf joints per leg",
    stateGroups: [
      { label: "Body", keys: ["base_pos_x", "base_pos_y", "base_pos_z", "base_quat_w", "base_quat_x", "base_quat_y", "base_quat_z"] },
      { label: "Velocity", keys: ["base_linvel_x", "base_linvel_y", "base_linvel_z", "base_angvel_x", "base_angvel_y", "base_angvel_z"] },
      { label: "Gravity", keys: ["gravity_x", "gravity_y", "gravity_z"] },
      { label: "Front-Left Leg", keys: ["FL_hip_joint_pos", "FL_thigh_joint_pos", "FL_calf_joint_pos", "FL_hip_joint_vel", "FL_thigh_joint_vel", "FL_calf_joint_vel"] },
      { label: "Front-Right Leg", keys: ["FR_hip_joint_pos", "FR_thigh_joint_pos", "FR_calf_joint_pos", "FR_hip_joint_vel", "FR_thigh_joint_vel", "FR_calf_joint_vel"] },
      { label: "Rear-Left Leg", keys: ["RL_hip_joint_pos", "RL_thigh_joint_pos", "RL_calf_joint_pos", "RL_hip_joint_vel", "RL_thigh_joint_vel", "RL_calf_joint_vel"] },
      { label: "Rear-Right Leg", keys: ["RR_hip_joint_pos", "RR_thigh_joint_pos", "RR_calf_joint_pos", "RR_hip_joint_vel", "RR_thigh_joint_vel", "RR_calf_joint_vel"] },
    ],
    capabilities: { positionControl: true, torqueControl: true, locomotion: true, manipulation: false },
  },
  "unitree-g1": {
    type: "humanoid",
    displayName: "Unitree G1",
    description: "23-DOF humanoid with legs, torso, and arms",
    stateGroups: [
      { label: "Body", keys: ["body_x", "body_y", "body_z", "body_qw", "body_qx", "body_qy", "body_qz"] },
      { label: "Left Leg", keys: ["left_hip_pitch_joint", "left_hip_roll_joint", "left_hip_yaw_joint", "left_knee_joint", "left_ankle_pitch_joint", "left_ankle_roll_joint"] },
      { label: "Right Leg", keys: ["right_hip_pitch_joint", "right_hip_roll_joint", "right_hip_yaw_joint", "right_knee_joint", "right_ankle_pitch_joint", "right_ankle_roll_joint"] },
      { label: "Torso", keys: ["torso_joint"] },
      { label: "Left Arm", keys: ["left_shoulder_pitch_joint", "left_shoulder_roll_joint", "left_shoulder_yaw_joint", "left_elbow_joint", "left_wrist_roll_joint"] },
      { label: "Right Arm", keys: ["right_shoulder_pitch_joint", "right_shoulder_roll_joint", "right_shoulder_yaw_joint", "right_elbow_joint", "right_wrist_roll_joint"] },
    ],
    capabilities: { positionControl: true, torqueControl: true, locomotion: true, manipulation: true },
  },
  "toy-car": {
    type: "wheeled",
    displayName: "Origin Toy Car",
    description: "Arduino Mega + L298N + HC-SR04, 4 actions",
    stateGroups: [
      { label: "Sensors", keys: ["distance", "speed", "angle"] },
    ],
    capabilities: { positionControl: false, torqueControl: false, locomotion: true, manipulation: false },
    actionAliases: { forward: "moveFwd", left: "moveLeft", right: "moveRight", stop: "stop" },
  },
};

export async function resolveProfile(
  deviceId: string,
  storage: StorageAdapter,
  manifest?: DeviceManifest | null,
): Promise<DeviceProfile> {
  // 1. Check builtin profiles
  const builtin = BUILTIN_PROFILES[deviceId];
  if (builtin) {
    return { deviceId, ...builtin };
  }

  // 2. Check storage for user-saved profile
  const stored = await storage.getProfile(deviceId);
  if (stored) {
    return stored;
  }

  // 3. Generate a generic profile from manifest
  const stateKeys = manifest?.state?.map((s) => s.key) ?? [];
  return {
    deviceId,
    type: "generic",
    displayName: deviceId,
    description: `Device ${deviceId}`,
    stateGroups: stateKeys.length > 0
      ? [{ label: "All State", keys: stateKeys }]
      : [],
    capabilities: {
      positionControl: false,
      torqueControl: false,
      locomotion: false,
      manipulation: false,
    },
    needsConfiguration: true,
  };
}
