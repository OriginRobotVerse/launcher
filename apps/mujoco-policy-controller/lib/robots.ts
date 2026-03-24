export interface RobotConfig {
  id: string;
  name: string;
  type: "quadruped" | "humanoid" | "arm";
  description: string;
  actuatorCount: number;
  actuatorDescription: string;
  stateGroups: StateGroup[];
  actions: string[];
}

export interface StateGroup {
  label: string;
  keys: string[];
}

export const ROBOTS: RobotConfig[] = [
  {
    id: "unitree-go2",
    name: "Unitree Go2",
    type: "quadruped",
    description:
      "Quadruped robot with 12 actuators across 4 legs, each with hip, thigh, and calf joints. Designed for locomotion tasks with neural policies.",
    actuatorCount: 12,
    actuatorDescription: "4 legs x 3 joints (hip, thigh, calf)",
    stateGroups: [
      {
        label: "Body",
        keys: [
          "base_pos_x", "base_pos_y", "base_pos_z",
          "base_quat_w", "base_quat_x", "base_quat_y", "base_quat_z",
        ],
      },
      {
        label: "Velocity",
        keys: [
          "base_linvel_x", "base_linvel_y", "base_linvel_z",
          "base_angvel_x", "base_angvel_y", "base_angvel_z",
        ],
      },
      {
        label: "Gravity",
        keys: ["gravity_x", "gravity_y", "gravity_z"],
      },
      {
        label: "Front-Left Leg",
        keys: ["FL_hip_joint_pos", "FL_thigh_joint_pos", "FL_calf_joint_pos",
               "FL_hip_joint_vel", "FL_thigh_joint_vel", "FL_calf_joint_vel"],
      },
      {
        label: "Front-Right Leg",
        keys: ["FR_hip_joint_pos", "FR_thigh_joint_pos", "FR_calf_joint_pos",
               "FR_hip_joint_vel", "FR_thigh_joint_vel", "FR_calf_joint_vel"],
      },
      {
        label: "Rear-Left Leg",
        keys: ["RL_hip_joint_pos", "RL_thigh_joint_pos", "RL_calf_joint_pos",
               "RL_hip_joint_vel", "RL_thigh_joint_vel", "RL_calf_joint_vel"],
      },
      {
        label: "Rear-Right Leg",
        keys: ["RR_hip_joint_pos", "RR_thigh_joint_pos", "RR_calf_joint_pos",
               "RR_hip_joint_vel", "RR_thigh_joint_vel", "RR_calf_joint_vel"],
      },
    ],
    actions: [
      "reset", "pause", "set_pos", "set_ctrl",
      "FL_hip", "FL_thigh", "FL_calf",
      "FR_hip", "FR_thigh", "FR_calf",
      "RL_hip", "RL_thigh", "RL_calf",
      "RR_hip", "RR_thigh", "RR_calf",
    ],
  },
  {
    id: "unitree-g1",
    name: "Unitree G1",
    type: "humanoid",
    description:
      "Humanoid robot with 29 actuators spanning legs, waist, and arms with wrist articulation. Capable of bipedal walking and manipulation tasks.",
    actuatorCount: 29,
    actuatorDescription: "29 DOF: 6 per leg, 3 waist, 7 per arm",
    stateGroups: [
      {
        label: "Body",
        keys: [
          "base_pos_x", "base_pos_y", "base_pos_z",
          "base_quat_w", "base_quat_x", "base_quat_y", "base_quat_z",
        ],
      },
      {
        label: "Velocity",
        keys: [
          "base_linvel_x", "base_linvel_y", "base_linvel_z",
          "base_angvel_x", "base_angvel_y", "base_angvel_z",
        ],
      },
      {
        label: "Left Leg",
        keys: [
          "left_hip_pitch_joint_pos", "left_hip_roll_joint_pos", "left_hip_yaw_joint_pos",
          "left_knee_joint_pos", "left_ankle_pitch_joint_pos", "left_ankle_roll_joint_pos",
        ],
      },
      {
        label: "Right Leg",
        keys: [
          "right_hip_pitch_joint_pos", "right_hip_roll_joint_pos", "right_hip_yaw_joint_pos",
          "right_knee_joint_pos", "right_ankle_pitch_joint_pos", "right_ankle_roll_joint_pos",
        ],
      },
      {
        label: "Waist",
        keys: ["waist_yaw_joint_pos", "waist_roll_joint_pos", "waist_pitch_joint_pos"],
      },
      {
        label: "Left Arm",
        keys: [
          "left_shoulder_pitch_joint_pos", "left_shoulder_roll_joint_pos", "left_shoulder_yaw_joint_pos",
          "left_elbow_joint_pos", "left_wrist_roll_joint_pos", "left_wrist_pitch_joint_pos", "left_wrist_yaw_joint_pos",
        ],
      },
      {
        label: "Right Arm",
        keys: [
          "right_shoulder_pitch_joint_pos", "right_shoulder_roll_joint_pos", "right_shoulder_yaw_joint_pos",
          "right_elbow_joint_pos", "right_wrist_roll_joint_pos", "right_wrist_pitch_joint_pos", "right_wrist_yaw_joint_pos",
        ],
      },
    ],
    actions: [
      "reset", "pause", "set_pos", "set_ctrl",
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
  },
  {
    id: "unitree-h1",
    name: "Unitree H1",
    type: "humanoid",
    description:
      "Full-size humanoid robot with 19 actuators. Legs, torso, and arms for bipedal locomotion and upper-body manipulation.",
    actuatorCount: 19,
    actuatorDescription: "19 DOF: 5 per leg, 1 torso, 4 per arm",
    stateGroups: [
      {
        label: "Body",
        keys: [
          "base_pos_x", "base_pos_y", "base_pos_z",
          "base_quat_w", "base_quat_x", "base_quat_y", "base_quat_z",
        ],
      },
      {
        label: "Velocity",
        keys: [
          "base_linvel_x", "base_linvel_y", "base_linvel_z",
          "base_angvel_x", "base_angvel_y", "base_angvel_z",
        ],
      },
      {
        label: "Left Leg",
        keys: [
          "left_hip_yaw_pos", "left_hip_roll_pos", "left_hip_pitch_pos",
          "left_knee_pos", "left_ankle_pos",
        ],
      },
      {
        label: "Right Leg",
        keys: [
          "right_hip_yaw_pos", "right_hip_roll_pos", "right_hip_pitch_pos",
          "right_knee_pos", "right_ankle_pos",
        ],
      },
      {
        label: "Torso",
        keys: ["torso_pos"],
      },
      {
        label: "Left Arm",
        keys: [
          "left_shoulder_pitch_pos", "left_shoulder_roll_pos",
          "left_shoulder_yaw_pos", "left_elbow_pos",
        ],
      },
      {
        label: "Right Arm",
        keys: [
          "right_shoulder_pitch_pos", "right_shoulder_roll_pos",
          "right_shoulder_yaw_pos", "right_elbow_pos",
        ],
      },
    ],
    actions: [
      "reset", "pause", "set_pos", "set_ctrl",
      "left_hip_yaw", "left_hip_roll", "left_hip_pitch", "left_knee", "left_ankle",
      "right_hip_yaw", "right_hip_roll", "right_hip_pitch", "right_knee", "right_ankle",
      "torso",
      "left_shoulder_pitch", "left_shoulder_roll", "left_shoulder_yaw", "left_elbow",
      "right_shoulder_pitch", "right_shoulder_roll", "right_shoulder_yaw", "right_elbow",
    ],
  },
  {
    id: "anymal-c",
    name: "ANYmal C",
    type: "quadruped",
    description:
      "Industrial quadruped robot with 12 actuators. 4 legs with hip abduction/adduction (HAA), hip flexion/extension (HFE), and knee (KFE) joints.",
    actuatorCount: 12,
    actuatorDescription: "4 legs x 3 joints (HAA, HFE, KFE)",
    stateGroups: [
      {
        label: "Body",
        keys: [
          "base_pos_x", "base_pos_y", "base_pos_z",
          "base_quat_w", "base_quat_x", "base_quat_y", "base_quat_z",
        ],
      },
      {
        label: "Velocity",
        keys: [
          "base_linvel_x", "base_linvel_y", "base_linvel_z",
          "base_angvel_x", "base_angvel_y", "base_angvel_z",
        ],
      },
      {
        label: "Left-Front Leg",
        keys: ["LF_HAA_pos", "LF_HFE_pos", "LF_KFE_pos",
               "LF_HAA_vel", "LF_HFE_vel", "LF_KFE_vel"],
      },
      {
        label: "Right-Front Leg",
        keys: ["RF_HAA_pos", "RF_HFE_pos", "RF_KFE_pos",
               "RF_HAA_vel", "RF_HFE_vel", "RF_KFE_vel"],
      },
      {
        label: "Left-Hind Leg",
        keys: ["LH_HAA_pos", "LH_HFE_pos", "LH_KFE_pos",
               "LH_HAA_vel", "LH_HFE_vel", "LH_KFE_vel"],
      },
      {
        label: "Right-Hind Leg",
        keys: ["RH_HAA_pos", "RH_HFE_pos", "RH_KFE_pos",
               "RH_HAA_vel", "RH_HFE_vel", "RH_KFE_vel"],
      },
    ],
    actions: [
      "reset", "pause", "set_pos", "set_ctrl",
      "LF_HAA", "LF_HFE", "LF_KFE",
      "RF_HAA", "RF_HFE", "RF_KFE",
      "LH_HAA", "LH_HFE", "LH_KFE",
      "RH_HAA", "RH_HFE", "RH_KFE",
    ],
  },
  {
    id: "shadow-hand",
    name: "Shadow Hand",
    type: "arm",
    description:
      "Dexterous robotic hand with 20 actuators across wrist and 5 fingers (first, middle, ring, little, thumb). Designed for manipulation tasks.",
    actuatorCount: 20,
    actuatorDescription: "2 wrist + 3 per finger (4 fingers) + 5 thumb",
    stateGroups: [
      {
        label: "Wrist",
        keys: ["lh_WRJ2_pos", "lh_WRJ1_pos", "lh_WRJ2_vel", "lh_WRJ1_vel"],
      },
      {
        label: "First Finger",
        keys: ["lh_FFJ4_pos", "lh_FFJ3_pos", "lh_FFJ2_pos", "lh_FFJ1_pos"],
      },
      {
        label: "Middle Finger",
        keys: ["lh_MFJ4_pos", "lh_MFJ3_pos", "lh_MFJ2_pos", "lh_MFJ1_pos"],
      },
      {
        label: "Ring Finger",
        keys: ["lh_RFJ4_pos", "lh_RFJ3_pos", "lh_RFJ2_pos", "lh_RFJ1_pos"],
      },
      {
        label: "Little Finger",
        keys: ["lh_LFJ5_pos", "lh_LFJ4_pos", "lh_LFJ3_pos", "lh_LFJ2_pos", "lh_LFJ1_pos"],
      },
      {
        label: "Thumb",
        keys: ["lh_THJ5_pos", "lh_THJ4_pos", "lh_THJ3_pos", "lh_THJ2_pos", "lh_THJ1_pos"],
      },
    ],
    actions: [
      "reset", "pause", "set_pos", "set_ctrl",
      "lh_A_WRJ2", "lh_A_WRJ1",
      "lh_A_THJ5", "lh_A_THJ4", "lh_A_THJ3", "lh_A_THJ2", "lh_A_THJ1",
      "lh_A_FFJ4", "lh_A_FFJ3", "lh_A_FFJ0",
      "lh_A_MFJ4", "lh_A_MFJ3", "lh_A_MFJ0",
      "lh_A_RFJ4", "lh_A_RFJ3", "lh_A_RFJ0",
      "lh_A_LFJ5", "lh_A_LFJ4", "lh_A_LFJ3", "lh_A_LFJ0",
    ],
  },
];

export const ROBOT_MAP: Record<string, RobotConfig> = Object.fromEntries(
  ROBOTS.map((r) => [r.id, r]),
);

export function getRobot(id: string): RobotConfig | undefined {
  return ROBOT_MAP[id];
}
