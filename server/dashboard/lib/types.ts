export type DeviceType = "wheeled" | "quadruped" | "humanoid" | "arm" | "generic";

export interface DeviceSummary {
  id: string;
  version: string;
  connectedAt: string;
  actions: string[];
  sensorCount: number;
  chipCount: number;
}

export interface DeviceDetail {
  id: string;
  version: string;
  connectedAt: string;
  manifest: {
    id: string;
    version: string;
    sensors: Array<{ name: string; pins: number[] }>;
    chips: Array<{ name: string; pins: number[] }>;
    actions: string[];
    state: Array<{ key: string; type: string }>;
  };
  state: Record<string, number>;
  lastUpdated: string | null;
}

export interface DeviceProfile {
  deviceId: string;
  type: DeviceType;
  displayName: string;
  description: string;
  stateGroups: Array<{ label: string; keys: string[]; actuatorIndices?: number[] }>;
  capabilities: {
    positionControl: boolean;
    torqueControl: boolean;
    locomotion: boolean;
    manipulation: boolean;
  };
  actionAliases?: Record<string, string>;
  needsConfiguration?: boolean;
}

export interface AppSummary {
  id: string;
  name: string;
  version: string;
  author?: string;
  description?: string;
  icon?: string;
  deviceType: DeviceType;
  running: boolean;
  runningDeviceId?: string;
  frontendUrl?: string;
  secretsConfigured: boolean;
  source?: string;
}

export interface AppDetail {
  manifest: {
    name: string;
    id: string;
    version: string;
    author?: string;
    description?: string;
    icon?: string;
    device: {
      type: DeviceType;
      requiredActions?: string[];
      requiredState?: string[];
      optionalActions?: string[];
      optionalState?: string[];
      minActuators?: number | null;
      maxActuators?: number | null;
    };
    runtime: {
      type: string;
      entry: string;
      port: number;
      env?: Record<string, string>;
    };
    backend?: {
      type: string;
      entry: string;
      port: number;
    };
    secrets?: Array<{ key: string; description: string; required: boolean }>;
  };
  installPath: string;
  source?: string;
  running: boolean;
  status?: string;
  frontendUrl?: string;
  backendUrl?: string;
  uptime?: number;
  compatibility: Record<string, {
    compatible: boolean;
    missingActions: string[];
    missingState: string[];
    warnings: string[];
  }>;
  secrets: Array<{
    key: string;
    description: string;
    required: boolean;
    configured: boolean;
  }>;
}

export interface StatusResponse {
  version: string;
  uptime: number;
  coreUrl: string;
  dashboardUrl: string;
  devices: Array<{
    id: string;
    type: DeviceType;
    displayName: string;
    connected: boolean;
    stateKeyCount: number;
    actionCount: number;
  }>;
  apps: {
    installed: number;
    running: Array<{
      id: string;
      name: string;
      deviceId: string;
      frontendUrl: string;
      backendUrl?: string;
      status: string;
      uptime: number;
    }>;
  };
  simulators?: {
    running: Array<{
      model: string;
      deviceId: string;
      status: string;
      headless: boolean;
      hz: number;
      uptime: number;
    }>;
  };
}

export interface LogsResponse {
  lines: string[];
  appId: string;
  status: string;
}

// Simulators

export interface SimulatorModel {
  id: string;
  name: string;
  type: string;
  description: string;
  running: boolean;
  deviceId?: string;
  status?: string;
  uptime?: number;
}

export interface RunningSimulatorSummary {
  model: string;
  deviceId: string;
  status: string;
  headless: boolean;
  hz: number;
  uptime: number;
  startedAt: string;
}

export interface SimulatorsResponse {
  models: SimulatorModel[];
  running: RunningSimulatorSummary[];
}

export interface SimulatorLogsResponse {
  deviceId: string;
  status: string;
  lines: string[];
}
