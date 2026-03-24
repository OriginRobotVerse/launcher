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
