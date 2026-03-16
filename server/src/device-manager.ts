import { EventEmitter } from "node:events";
import type {
  ServerTransport,
  DeviceManifest,
  DeviceSummary,
  DeviceDetail,
  AnnounceMessage,
  ReadingsMessage,
  ActionMessage,
  SSEEvent,
  SSEEventType,
} from "./types.js";

interface ManagedDevice {
  manifest: DeviceManifest;
  transport: ServerTransport;
  state: Record<string, number>;
  connectedAt: Date;
  lastUpdated: Date | null;
}

export class DeviceManager extends EventEmitter {
  private devices: Map<string, ManagedDevice> = new Map();

  // Add a transport and begin listening for announce messages.
  // Returns a promise that resolves with the device ID after handshake.
  async addTransport(transport: ServerTransport): Promise<string> {
    await transport.open();

    return new Promise<string>((resolve) => {
      let resolved = false;

      transport.onData((line: string) => {
        let msg: any;
        try {
          msg = JSON.parse(line);
        } catch {
          return; // Ignore non-JSON lines
        }

        if (msg.type === "announce" && !resolved) {
          this.handleAnnounce(msg as AnnounceMessage, transport);
          resolved = true;
          resolve(msg.id);
        } else if (msg.type === "readings" && resolved) {
          // Find the device associated with this transport
          for (const [id, device] of this.devices) {
            if (device.transport === transport) {
              this.handleReadings(id, msg as ReadingsMessage);
              break;
            }
          }
        }
      });

      transport.onClose(() => {
        for (const [id, device] of this.devices) {
          if (device.transport === transport) {
            this.devices.delete(id);
            this.emitSSE("device.disconnected", id, { id });
            break;
          }
        }
      });
    });
  }

  private handleAnnounce(msg: AnnounceMessage, transport: ServerTransport): void {
    const manifest: DeviceManifest = {
      id: msg.id,
      version: msg.version,
      sensors: msg.sensors,
      chips: msg.chips,
      actions: msg.actions,
      state: msg.state,
    };

    this.devices.set(msg.id, {
      manifest,
      transport,
      state: {},
      connectedAt: new Date(),
      lastUpdated: null,
    });

    // Send ack
    transport.write(JSON.stringify({ type: "ack" }));

    this.emitSSE("device.connected", msg.id, { manifest });
  }

  private handleReadings(deviceId: string, msg: ReadingsMessage): void {
    const device = this.devices.get(deviceId);
    if (!device) return;

    const prevState = { ...device.state };
    let changed = false;

    // Diff and update
    for (const [key, value] of Object.entries(msg.data)) {
      if (device.state[key] !== value) {
        device.state[key] = value;
        changed = true;
      }
    }

    if (changed) {
      device.lastUpdated = new Date();
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

    // Validate action name
    if (!device.manifest.actions.includes(name)) {
      return false;
    }

    const msg: ActionMessage = {
      type: "action",
      name,
      params: params ?? {},
    };

    device.transport.write(JSON.stringify(msg));

    this.emitSSE("action.sent", deviceId, { name, params: params ?? {} });
    return true;
  }

  listDevices(): DeviceSummary[] {
    return Array.from(this.devices.keys())
      .map((id) => this.getDeviceSummary(id))
      .filter((d): d is DeviceSummary => d !== null);
  }

  hasDevice(id: string): boolean {
    return this.devices.has(id);
  }

  async removeDevice(id: string): Promise<void> {
    const device = this.devices.get(id);
    if (!device) return;
    await device.transport.close();
    this.devices.delete(id);
    this.emitSSE("device.disconnected", id, { id });
  }

  async shutdown(): Promise<void> {
    for (const [id, device] of this.devices) {
      await device.transport.close();
      this.emitSSE("device.disconnected", id, { id });
    }
    this.devices.clear();
  }
}
