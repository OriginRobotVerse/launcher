import { EventEmitter } from "node:events";
import { SerialServerTransport, BluetoothServerTransport } from "./transport.js";
import type {
  ServerTransport,
  StorageAdapter,
  DeviceManifest,
  DeviceSummary,
  DeviceDetail,
  AnnounceMessage,
  ReadingsMessage,
  ActionMessage,
  SSEEvent,
  SSEEventType,
} from "./types.js";

export interface TransportConfig {
  type: "serial" | "bluetooth";
  path: string;
  baudRate: number;
}

// A persistent port listener that stays open and processes all incoming messages
interface PortListener {
  config: TransportConfig;
  transport: ServerTransport | null;
  deviceId: string | null;
  status: "disconnected" | "open" | "identified";
}

interface ManagedDevice {
  manifest: DeviceManifest;
  portListener: PortListener;
  state: Record<string, number>;
  connectedAt: Date;
  lastUpdated: Date | null;
}

export class DeviceManager extends EventEmitter {
  private devices: Map<string, ManagedDevice> = new Map();
  private storage: StorageAdapter;
  private listeners: Map<string, PortListener> = new Map(); // keyed by path

  constructor(storage: StorageAdapter) {
    super();
    this.storage = storage;
  }

  // Register and immediately start listening on a port
  async addPort(config: TransportConfig): Promise<void> {
    if (this.listeners.has(config.path)) return;

    const listener: PortListener = {
      config,
      transport: null,
      deviceId: null,
      status: "disconnected",
    };
    this.listeners.set(config.path, listener);

    await this.openPort(listener);
  }

  private createTransport(config: TransportConfig): ServerTransport {
    if (config.type === "bluetooth") {
      return new BluetoothServerTransport(config.path, config.baudRate);
    }
    return new SerialServerTransport(config.path, config.baudRate);
  }

  private async openPort(listener: PortListener): Promise<void> {
    // Close existing if any
    if (listener.transport) {
      try { await listener.transport.close(); } catch {}
      listener.transport = null;
    }

    const transport = this.createTransport(listener.config);

    try {
      await transport.open();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[port] Failed to open ${listener.config.path}: ${message}`);
      listener.status = "disconnected";
      return;
    }

    listener.transport = transport;
    listener.status = "open";
    console.log(`[port] Opened ${listener.config.path}`);

    // Persistent data handler — always active while port is open
    transport.onData((line: string) => {
      let msg: any;
      try {
        msg = JSON.parse(line);
      } catch {
        console.log(`[port] ${listener.config.path} non-JSON data: ${line}`);
        return;
      }
      this.handleMessage(listener, msg);
    });

    // Send initial discover to trigger handshake
    transport.write(JSON.stringify({ type: "discover" }));

    transport.onClose(() => {
      console.log(`[port] Closed ${listener.config.path}`);
      const prevDeviceId = listener.deviceId;
      listener.transport = null;
      listener.deviceId = null;
      listener.status = "disconnected";

      if (prevDeviceId && this.devices.has(prevDeviceId)) {
        this.devices.delete(prevDeviceId);
        this.emitSSE("device.disconnected", prevDeviceId, { id: prevDeviceId });
      }
    });
  }

  private handleMessage(listener: PortListener, msg: any): void {
    if (msg.type === "announce") {
      console.log(`[port] ${listener.config.path} received announce from ${msg.id}`);
    }

    switch (msg.type) {
      case "announce":
        this.handleAnnounce(listener, msg as AnnounceMessage);
        break;
      case "readings":
        if (listener.deviceId) {
          this.handleReadings(listener.deviceId, msg as ReadingsMessage);
        }
        break;
    }
  }

  private handleAnnounce(listener: PortListener, msg: AnnounceMessage): void {
    const manifest: DeviceManifest = {
      id: msg.id,
      version: msg.version,
      sensors: msg.sensors,
      chips: msg.chips,
      actions: msg.actions,
      state: msg.state,
    };

    const now = new Date();
    const isNew = !this.devices.has(msg.id);

    // Update or create managed device
    const existing = this.devices.get(msg.id);
    if (existing) {
      existing.manifest = manifest;
      existing.lastUpdated = now;
    } else {
      this.devices.set(msg.id, {
        manifest,
        portListener: listener,
        state: {},
        connectedAt: now,
        lastUpdated: null,
      });
    }

    listener.deviceId = msg.id;
    listener.status = "identified";

    // Persist
    const device = this.devices.get(msg.id)!;
    this.storage.setDevice(msg.id, {
      manifest,
      state: { ...device.state },
      connectedAt: device.connectedAt.toISOString(),
      lastUpdated: device.lastUpdated?.toISOString() ?? null,
    });

    // Ack
    listener.transport?.write(JSON.stringify({ type: "ack" }));

    if (isNew) {
      this.emitSSE("device.connected", msg.id, { manifest });
    }

    // Notify discover callers — emit on both device ID and port path
    // so discover can match regardless of whether device was already known
    this.emit(`announce:${listener.config.path}`, manifest);
    this.emit(`announce:${msg.id}`, manifest);
  }

  private handleReadings(deviceId: string, msg: ReadingsMessage): void {
    const device = this.devices.get(deviceId);
    if (!device) return;

    const prevState = { ...device.state };
    let changed = false;

    for (const [key, value] of Object.entries(msg.data)) {
      if (device.state[key] !== value) {
        device.state[key] = value;
        changed = true;
      }
    }

    if (changed) {
      device.lastUpdated = new Date();

      this.storage.setDevice(deviceId, {
        manifest: device.manifest,
        state: { ...device.state },
        connectedAt: device.connectedAt.toISOString(),
        lastUpdated: device.lastUpdated.toISOString(),
      });

      this.emitSSE("state.updated", deviceId, {
        state: device.state,
        previous: prevState,
      });
    }
  }

  private emitSSE(event: SSEEventType, deviceId: string, data: unknown): void {
    const sseEvent: SSEEvent = {
      event,
      deviceId,
      data,
      timestamp: new Date().toISOString(),
    };
    this.emit("sse", sseEvent);
  }

  // --- Public API ---

  // Discover: reopen closed ports, send discover to all open ports, wait for announces
  async discover(timeoutMs: number = 10000): Promise<{ connected: DeviceManifest[]; failed: Array<{ path: string; error: string }> }> {
    const connected: DeviceManifest[] = [];
    const failed: Array<{ path: string; error: string }> = [];

    const promises = Array.from(this.listeners.values()).map(async (listener) => {
      // Reopen disconnected ports
      if (listener.status === "disconnected") {
        console.log(`[discover] Reopening ${listener.config.path}`);
        await this.openPort(listener);
      }

      if (!listener.transport) {
        failed.push({ path: listener.config.path, error: "Could not open port" });
        return;
      }

      // Send discover and wait for announce
      const eventKey = listener.deviceId
        ? `announce:${listener.deviceId}`
        : `announce:${listener.config.path}`;

      console.log(`[discover] ${listener.config.path} status=${listener.status} deviceId=${listener.deviceId} listening on ${eventKey}`);

      const manifest = await new Promise<DeviceManifest | null>((resolve) => {
        const timer = setTimeout(() => {
          this.removeListener(eventKey, onAnnounce);
          resolve(null);
        }, timeoutMs);

        const onAnnounce = (m: DeviceManifest) => {
          clearTimeout(timer);
          resolve(m);
        };

        this.once(eventKey, onAnnounce);

        // Send the discover command
        listener.transport!.write(JSON.stringify({ type: "discover" }));
      });

      if (manifest) {
        connected.push(manifest);
      } else {
        failed.push({ path: listener.config.path, error: "No response from device" });
      }
    });

    await Promise.all(promises);
    return { connected, failed };
  }

  getDeviceIds(): string[] {
    return Array.from(this.devices.keys());
  }

  getDeviceSummary(id: string): DeviceSummary | null {
    const device = this.devices.get(id);
    if (!device) return null;
    return {
      id: device.manifest.id,
      version: device.manifest.version,
      connectedAt: device.connectedAt.toISOString(),
      actions: device.manifest.actions,
      sensorCount: device.manifest.sensors.length,
      chipCount: device.manifest.chips.length,
    };
  }

  getDeviceDetail(id: string): DeviceDetail | null {
    const device = this.devices.get(id);
    if (!device) return null;
    return {
      id: device.manifest.id,
      version: device.manifest.version,
      connectedAt: device.connectedAt.toISOString(),
      manifest: device.manifest,
      state: { ...device.state },
      lastUpdated: device.lastUpdated?.toISOString() ?? null,
    };
  }

  getDeviceState(id: string): Record<string, number> | null {
    const device = this.devices.get(id);
    if (!device) return null;
    return { ...device.state };
  }

  sendAction(deviceId: string, name: string, params?: Record<string, number>): boolean {
    const device = this.devices.get(deviceId);
    if (!device) return false;

    if (!device.manifest.actions.includes(name)) {
      return false;
    }

    const msg: ActionMessage = {
      type: "action",
      name,
      params: params ?? {},
    };

    device.portListener.transport?.write(JSON.stringify(msg));

    this.emitSSE("action.sent", deviceId, { name, params: params ?? {} });
    return true;
  }

  listDevices(): DeviceSummary[] {
    return Array.from(this.devices.keys())
      .map((id) => this.getDeviceSummary(id))
      .filter((d): d is DeviceSummary => d !== null);
  }

  getPortStatuses(): Array<{ path: string; type: string; status: string; deviceId: string | null }> {
    return Array.from(this.listeners.values()).map((l) => ({
      path: l.config.path,
      type: l.config.type,
      status: l.status,
      deviceId: l.deviceId,
    }));
  }

  hasDevice(id: string): boolean {
    return this.devices.has(id);
  }

  async removeDevice(id: string): Promise<void> {
    const device = this.devices.get(id);
    if (!device) return;
    await device.portListener.transport?.close();
    this.devices.delete(id);
    await this.storage.removeDevice(id);
    this.emitSSE("device.disconnected", id, { id });
  }

  async shutdown(): Promise<void> {
    for (const [id, device] of this.devices) {
      this.emitSSE("device.disconnected", id, { id });
    }
    for (const listener of this.listeners.values()) {
      if (listener.transport) {
        try { await listener.transport.close(); } catch {}
      }
    }
    this.devices.clear();
    this.listeners.clear();
  }
}
