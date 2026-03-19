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
}

// --- Config file (config.ts in cwd) ---

export interface OriginConfig {
  serial?: string | string[];
  bluetooth?: string | string[];
  tcp?: number | number[];
  port?: number;
  baudRate?: number;
  token?: string;
  webhooks?: WebhookRegistration[];
  storage?: StorageAdapter;
}

export function defineConfig(config: OriginConfig = {}): OriginConfig {
  return {
    port: 3000,
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
