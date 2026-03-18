import type { StorageAdapter, StoredDevice, Webhook } from "./types.js";

export class MemoryStorageAdapter implements StorageAdapter {
  private devices: Map<string, StoredDevice> = new Map();
  private webhooks: Map<string, Webhook> = new Map();

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
}
