// --- Wire protocol messages (firmware <-> server) ---

export interface AnnounceMessage {
  type: "announce";
  id: string;
  version: string;
  sensors: Array<{ name: string; pins: number[] }>;
  chips: Array<{ name: string; pins: number[] }>;
  actions: string[];
  state: Array<{ key: string; type: "float" | "int" | "bool" | "string" }>;
}

export interface AckMessage {
  type: "ack";
}

export interface DiscoverMessage {
  type: "discover";
}

export interface ReadingsMessage {
  type: "readings";
  data: Record<string, number>;
}

export interface ActionMessage {
  type: "action";
  name: string;
  params: Record<string, number>;
}

export type FirmwareMessage = AnnounceMessage | ReadingsMessage;
export type ServerToFirmwareMessage = AckMessage | DiscoverMessage | ActionMessage;

// --- Device model ---

export interface DeviceManifest {
  id: string;
  version: string;
  sensors: Array<{ name: string; pins: number[] }>;
  chips: Array<{ name: string; pins: number[] }>;
  actions: string[];
  state: Array<{ key: string; type: "float" | "int" | "bool" | "string" }>;
}

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
  manifest: DeviceManifest;
  state: Record<string, number>;
  lastUpdated: string | null;
}

// --- HTTP API shapes ---

export interface ServerInfo {
  name: string;
  version: string;
  uptime: number;
  deviceCount: number;
}

export interface ActionRequest {
  name: string;
  params?: Record<string, number>;
}

export interface WebhookRegistration {
  url: string;
  events?: string[];
  secret?: string;
}

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  createdAt: string;
  secret?: string;
}

// --- SSE event types ---

export type SSEEventType =
  | "state.updated"
  | "action.sent"
  | "device.connected"
  | "device.disconnected";

export interface SSEEvent {
  event: SSEEventType;
  deviceId: string;
  data: unknown;
  timestamp: string;
}

// --- Storage adapter ---

export interface StoredDevice {
  manifest: DeviceManifest;
  state: Record<string, number>;
  connectedAt: string;
  lastUpdated: string | null;
}

export interface StorageAdapter {
  // Device state
  getDevice(id: string): Promise<StoredDevice | null>;
  setDevice(id: string, device: StoredDevice): Promise<void>;
  removeDevice(id: string): Promise<void>;
  listDevices(): Promise<StoredDevice[]>;

  // Webhooks
  getWebhook(id: string): Promise<Webhook | null>;
  setWebhook(id: string, webhook: Webhook): Promise<void>;
  removeWebhook(id: string): Promise<void>;
  listWebhooks(): Promise<Webhook[]>;

  // Apps
  getApp(id: string): Promise<StoredApp | null>;
  setApp(id: string, app: StoredApp): Promise<void>;
  removeApp(id: string): Promise<void>;
  listApps(): Promise<StoredApp[]>;

  // App secrets
  getAppSecrets(appId: string): Promise<Record<string, string>>;
  setAppSecrets(appId: string, secrets: Record<string, string>): Promise<void>;

  // Device profiles
  getProfile(deviceId: string): Promise<DeviceProfile | null>;
  setProfile(deviceId: string, profile: DeviceProfile): Promise<void>;
  removeProfile(deviceId: string): Promise<void>;
  listProfiles(): Promise<DeviceProfile[]>;
}

// --- App manifest (origin-app.json) ---

export type DeviceType = "wheeled" | "quadruped" | "humanoid" | "arm" | "generic";

export interface AppManifestDevice {
  type: DeviceType;
  requiredActions?: string[];
  requiredState?: string[];
  optionalActions?: string[];
  optionalState?: string[];
  minActuators?: number | null;
  maxActuators?: number | null;
}

export interface AppManifestRuntime {
  type: string;
  entry: string;
  setupCmd?: string;
  buildCmd?: string;
  devCmd?: string;
  startCmd?: string;
  port: number;
  env?: Record<string, string>;
  healthCheck?: string;
}

export interface AppManifestBackend {
  type: string;
  entry: string;
  setupCmd?: string;
  installCmd?: string;
  args?: string[];
  port: number;
  env?: Record<string, string>;
  healthCheck?: string;
}

export interface AppManifestSecret {
  key: string;
  description: string;
  required: boolean;
}

export interface AppManifest {
  name: string;
  id: string;
  version: string;
  author?: string;
  description?: string;
  icon?: string;
  setup?: string;
  device: AppManifestDevice;
  runtime: AppManifestRuntime;
  backend?: AppManifestBackend;
  secrets?: AppManifestSecret[];
}

// --- Device profiles ---

export interface JointGroup {
  label: string;
  keys: string[];
  actuatorIndices?: number[];
}

export interface DeviceProfile {
  deviceId: string;
  type: DeviceType;
  displayName: string;
  description: string;
  stateGroups: JointGroup[];
  capabilities: {
    positionControl: boolean;
    torqueControl: boolean;
    locomotion: boolean;
    manipulation: boolean;
  };
  actionAliases?: Record<string, string>;
  needsConfiguration?: boolean;
}

// --- Installed / Running app types ---

export interface InstalledApp {
  manifest: AppManifest;
  installPath: string;
  installedAt: string;
  secrets: Record<string, string>;
  source?: string;
}

export interface RunningApp {
  id: string;
  manifest: AppManifest;
  deviceId: string;
  frontendProcess: import("node:child_process").ChildProcess | null;
  backendProcess: import("node:child_process").ChildProcess | null;
  frontendUrl: string;
  backendUrl: string | null;
  status: "starting" | "running" | "stopping" | "stopped" | "error";
  error?: string;
  startedAt: Date;
  logs: string[];
}

export interface CompatResult {
  compatible: boolean;
  missingActions: string[];
  missingState: string[];
  warnings: string[];
}

// --- Storage adapter (extended) ---

export interface StoredApp {
  manifest: AppManifest;
  installPath: string;
  installedAt: string;
  source?: string;
}

// --- Config file (config.ts in cwd) ---

export interface OriginConfig {
  serial?: string | string[];
  bluetooth?: string | string[];
  tcp?: number | number[];
  port?: number;
  dashboardPort?: number;
  baudRate?: number;
  token?: string;
  webhooks?: WebhookRegistration[];
  storage?: StorageAdapter;
  appsDir?: string;
}

export function defineConfig(config: OriginConfig = {}): OriginConfig {
  return {
    port: 5050,
    dashboardPort: 5051,
    baudRate: 9600,
    ...config,
  };
}

// --- Transport interface (server side) ---

export interface ServerTransport {
  open(): Promise<void>;
  close(): Promise<void>;
  write(data: string): void;
  onData(callback: (line: string) => void): void;
  onClose(callback: () => void): void;
}
