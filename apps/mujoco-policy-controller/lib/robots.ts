export interface RobotConfig {
  id: string;
  name: string;
  type: "quadruped" | "humanoid";
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
          "body_x",
          "body_y",
          "body_z",
          "body_qw",
          "body_qx",
          "body_qy",
          "body_qz",
        ],
      },
      {
        label: "Front-Right Leg",
        keys: ["FR_hip_joint", "FR_thigh_joint", "FR_calf_joint"],
      },
      {
        label: "Front-Left Leg",
        keys: ["FL_hip_joint", "FL_thigh_joint", "FL_calf_joint"],
      },
      {
        label: "Rear-Right Leg",
        keys: ["RR_hip_joint", "RR_thigh_joint", "RR_calf_joint"],
      },
      {
        label: "Rear-Left Leg",
        keys: ["RL_hip_joint", "RL_thigh_joint", "RL_calf_joint"],
      },
    ],
    actions: [
      "reset",
      "pause",
      "set_pos",
      "set_ctrl",
      "FR_hip_joint",
      "FR_thigh_joint",
      "FR_calf_joint",
      "FL_hip_joint",
      "FL_thigh_joint",
      "FL_calf_joint",
      "RR_hip_joint",
      "RR_thigh_joint",
      "RR_calf_joint",
      "RL_hip_joint",
      "RL_thigh_joint",
      "RL_calf_joint",
    ],
  },
  {
    id: "unitree-g1",
    name: "Unitree G1",
    type: "humanoid",
    description:
      "Humanoid robot with 23 degrees of freedom spanning legs, torso, and arms. Capable of bipedal walking and manipulation tasks.",
    actuatorCount: 23,
    actuatorDescription: "23 DOF across legs, torso, and arms",
    stateGroups: [
      {
        label: "Body",
        keys: [
          "body_x",
          "body_y",
          "body_z",
          "body_qw",
          "body_qx",
          "body_qy",
          "body_qz",
        ],
      },
      {
        label: "Left Leg",
        keys: [
          "left_hip_pitch_joint",
          "left_hip_roll_joint",
          "left_hip_yaw_joint",
          "left_knee_joint",
          "left_ankle_pitch_joint",
          "left_ankle_roll_joint",
        ],
      },
      {
        label: "Right Leg",
        keys: [
          "right_hip_pitch_joint",
          "right_hip_roll_joint",
          "right_hip_yaw_joint",
          "right_knee_joint",
          "right_ankle_pitch_joint",
          "right_ankle_roll_joint",
        ],
      },
      {
        label: "Torso",
        keys: ["torso_joint"],
      },
      {
        label: "Left Arm",
        keys: [
          "left_shoulder_pitch_joint",
          "left_shoulder_roll_joint",
          "left_shoulder_yaw_joint",
          "left_elbow_joint",
          "left_wrist_roll_joint",
        ],
      },
      {
        label: "Right Arm",
        keys: [
          "right_shoulder_pitch_joint",
          "right_shoulder_roll_joint",
          "right_shoulder_yaw_joint",
          "right_elbow_joint",
          "right_wrist_roll_joint",
        ],
      },
    ],
    actions: [
      "reset",
      "pause",
      "set_pos",
      "set_ctrl",
      "left_hip_pitch_joint",
      "left_hip_roll_joint",
      "left_hip_yaw_joint",
      "left_knee_joint",
      "left_ankle_pitch_joint",
      "left_ankle_roll_joint",
      "right_hip_pitch_joint",
      "right_hip_roll_joint",
      "right_hip_yaw_joint",
      "right_knee_joint",
      "right_ankle_pitch_joint",
      "right_ankle_roll_joint",
      "torso_joint",
      "left_shoulder_pitch_joint",
      "left_shoulder_roll_joint",
      "left_shoulder_yaw_joint",
      "left_elbow_joint",
      "left_wrist_roll_joint",
      "right_shoulder_pitch_joint",
      "right_shoulder_roll_joint",
      "right_shoulder_yaw_joint",
      "right_elbow_joint",
      "right_wrist_roll_joint",
    ],
  },
];

export const ROBOT_MAP: Record<string, RobotConfig> = Object.fromEntries(
  ROBOTS.map((r) => [r.id, r]),
);

export function getRobot(id: string): RobotConfig | undefined {
  return ROBOT_MAP[id];
}
