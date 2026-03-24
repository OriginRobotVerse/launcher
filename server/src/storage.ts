import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { StorageAdapter, StoredDevice, Webhook, StoredApp, DeviceProfile } from "./types.js";

export class MemoryStorageAdapter implements StorageAdapter {
  private devices: Map<string, StoredDevice> = new Map();
  private webhooks: Map<string, Webhook> = new Map();
  private apps: Map<string, StoredApp> = new Map();
  private appSecrets: Map<string, Record<string, string>> = new Map();
  private profiles: Map<string, DeviceProfile> = new Map();

  async getDevice(id: string): Promise<StoredDevice | null> {
    return this.devices.get(id) ?? null;
  }

  async setDevice(id: string, device: StoredDevice): Promise<void> {
    this.devices.set(id, device);
  }

  async removeDevice(id: string): Promise<void> {
    this.devices.delete(id);
  }

  async listDevices(): Promise<StoredDevice[]> {
    return Array.from(this.devices.values());
  }

  async getWebhook(id: string): Promise<Webhook | null> {
    return this.webhooks.get(id) ?? null;
  }

  async setWebhook(id: string, webhook: Webhook): Promise<void> {
    this.webhooks.set(id, webhook);
  }

  async removeWebhook(id: string): Promise<void> {
    this.webhooks.delete(id);
  }

  async listWebhooks(): Promise<Webhook[]> {
    return Array.from(this.webhooks.values());
  }

  // --- Apps ---

  async getApp(id: string): Promise<StoredApp | null> {
    return this.apps.get(id) ?? null;
  }

  async setApp(id: string, app: StoredApp): Promise<void> {
    this.apps.set(id, app);
  }

  async removeApp(id: string): Promise<void> {
    this.apps.delete(id);
  }

  async listApps(): Promise<StoredApp[]> {
    return Array.from(this.apps.values());
  }

  // --- App Secrets ---

  async getAppSecrets(appId: string): Promise<Record<string, string>> {
    return this.appSecrets.get(appId) ?? {};
  }

  async setAppSecrets(appId: string, secrets: Record<string, string>): Promise<void> {
    const existing = this.appSecrets.get(appId) ?? {};
    this.appSecrets.set(appId, { ...existing, ...secrets });
  }

  // --- Profiles ---

  async getProfile(deviceId: string): Promise<DeviceProfile | null> {
    return this.profiles.get(deviceId) ?? null;
  }

  async setProfile(deviceId: string, profile: DeviceProfile): Promise<void> {
    this.profiles.set(deviceId, profile);
  }

  async removeProfile(deviceId: string): Promise<void> {
    this.profiles.delete(deviceId);
  }

  async listProfiles(): Promise<DeviceProfile[]> {
    return Array.from(this.profiles.values());
  }
}

// --- JSON file storage (no native deps, works everywhere) ---

interface JsonStoreData {
  devices: Record<string, StoredDevice>;
  webhooks: Record<string, Webhook>;
  apps: Record<string, StoredApp>;
  appSecrets: Record<string, Record<string, string>>;
  profiles: Record<string, DeviceProfile>;
}

export class JsonStorageAdapter implements StorageAdapter {
  private filePath: string;
  private data: JsonStoreData;

  constructor(filePath: string) {
    this.filePath = filePath;
    const dir = dirname(filePath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    this.data = this.load();
  }

  private load(): JsonStoreData {
    if (existsSync(this.filePath)) {
      try {
        return JSON.parse(readFileSync(this.filePath, "utf-8"));
      } catch {
        // Corrupted file — start fresh
      }
    }
    return { devices: {}, webhooks: {}, apps: {}, appSecrets: {}, profiles: {} };
  }

  private save(): void {
    writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
  }

  // Devices
  async getDevice(id: string) { return this.data.devices[id] ?? null; }
  async setDevice(id: string, device: StoredDevice) { this.data.devices[id] = device; this.save(); }
  async removeDevice(id: string) { delete this.data.devices[id]; this.save(); }
  async listDevices() { return Object.values(this.data.devices); }

  // Webhooks
  async getWebhook(id: string) { return this.data.webhooks[id] ?? null; }
  async setWebhook(id: string, webhook: Webhook) { this.data.webhooks[id] = webhook; this.save(); }
  async removeWebhook(id: string) { delete this.data.webhooks[id]; this.save(); }
  async listWebhooks() { return Object.values(this.data.webhooks); }

  // Apps
  async getApp(id: string) { return this.data.apps[id] ?? null; }
  async setApp(id: string, app: StoredApp) { this.data.apps[id] = app; this.save(); }
  async removeApp(id: string) { delete this.data.apps[id]; this.save(); }
  async listApps() { return Object.values(this.data.apps); }

  // Secrets
  async getAppSecrets(appId: string) { return this.data.appSecrets[appId] ?? {}; }
  async setAppSecrets(appId: string, secrets: Record<string, string>) {
    this.data.appSecrets[appId] = { ...(this.data.appSecrets[appId] ?? {}), ...secrets };
    this.save();
  }

  // Profiles
  async getProfile(deviceId: string) { return this.data.profiles[deviceId] ?? null; }
  async setProfile(deviceId: string, profile: DeviceProfile) { this.data.profiles[deviceId] = profile; this.save(); }
  async removeProfile(deviceId: string) { delete this.data.profiles[deviceId]; this.save(); }
  async listProfiles() { return Object.values(this.data.profiles); }
}
