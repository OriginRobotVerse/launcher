import Database from "better-sqlite3";
import type { StorageAdapter, StoredDevice, Webhook, StoredApp, DeviceProfile } from "./types.js";

export class SqliteStorageAdapter implements StorageAdapter {
  private db: Database.Database;

  constructor(path: string) {
    this.db = new Database(path);
    this.db.pragma("journal_mode = WAL");
    this.init();
  }

  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS devices (
        id TEXT PRIMARY KEY,
        manifest TEXT NOT NULL,
        state TEXT NOT NULL,
        connected_at TEXT NOT NULL,
        last_updated TEXT
      );

      CREATE TABLE IF NOT EXISTS webhooks (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        events TEXT NOT NULL,
        created_at TEXT NOT NULL,
        secret TEXT
      );

      CREATE TABLE IF NOT EXISTS apps (
        id TEXT PRIMARY KEY,
        manifest TEXT NOT NULL,
        install_path TEXT NOT NULL,
        installed_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS app_secrets (
        app_id TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        PRIMARY KEY (app_id, key)
      );

      CREATE TABLE IF NOT EXISTS device_profiles (
        device_id TEXT PRIMARY KEY,
        profile TEXT NOT NULL
      );
    `);
  }

  // --- Devices ---

  async getDevice(id: string): Promise<StoredDevice | null> {
    const row = this.db.prepare("SELECT * FROM devices WHERE id = ?").get(id) as any;
    if (!row) return null;
    return {
      manifest: JSON.parse(row.manifest),
      state: JSON.parse(row.state),
      connectedAt: row.connected_at,
      lastUpdated: row.last_updated,
    };
  }

  async setDevice(id: string, device: StoredDevice): Promise<void> {
    this.db.prepare(`
      INSERT INTO devices (id, manifest, state, connected_at, last_updated)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        manifest = excluded.manifest,
        state = excluded.state,
        connected_at = excluded.connected_at,
        last_updated = excluded.last_updated
    `).run(
      id,
      JSON.stringify(device.manifest),
      JSON.stringify(device.state),
      device.connectedAt,
      device.lastUpdated,
    );
  }

  async removeDevice(id: string): Promise<void> {
    this.db.prepare("DELETE FROM devices WHERE id = ?").run(id);
  }

  async listDevices(): Promise<StoredDevice[]> {
    const rows = this.db.prepare("SELECT * FROM devices").all() as any[];
    return rows.map((row) => ({
      manifest: JSON.parse(row.manifest),
      state: JSON.parse(row.state),
      connectedAt: row.connected_at,
      lastUpdated: row.last_updated,
    }));
  }

  // --- Webhooks ---

  async getWebhook(id: string): Promise<Webhook | null> {
    const row = this.db.prepare("SELECT * FROM webhooks WHERE id = ?").get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      url: row.url,
      events: JSON.parse(row.events),
      createdAt: row.created_at,
      secret: row.secret ?? undefined,
    };
  }

  async setWebhook(id: string, webhook: Webhook): Promise<void> {
    this.db.prepare(`
      INSERT INTO webhooks (id, url, events, created_at, secret)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        url = excluded.url,
        events = excluded.events,
        created_at = excluded.created_at,
        secret = excluded.secret
    `).run(
      id,
      webhook.url,
      JSON.stringify(webhook.events),
      webhook.createdAt,
      webhook.secret ?? null,
    );
  }

  async removeWebhook(id: string): Promise<void> {
    this.db.prepare("DELETE FROM webhooks WHERE id = ?").run(id);
  }

  async listWebhooks(): Promise<Webhook[]> {
    const rows = this.db.prepare("SELECT * FROM webhooks").all() as any[];
    return rows.map((row) => ({
      id: row.id,
      url: row.url,
      events: JSON.parse(row.events),
      createdAt: row.created_at,
      secret: row.secret ?? undefined,
    }));
  }

  // --- Apps ---

  async getApp(id: string): Promise<StoredApp | null> {
    const row = this.db.prepare("SELECT * FROM apps WHERE id = ?").get(id) as any;
    if (!row) return null;
    return {
      manifest: JSON.parse(row.manifest),
      installPath: row.install_path,
      installedAt: row.installed_at,
    };
  }

  async setApp(id: string, app: StoredApp): Promise<void> {
    this.db.prepare(`
      INSERT INTO apps (id, manifest, install_path, installed_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        manifest = excluded.manifest,
        install_path = excluded.install_path,
        installed_at = excluded.installed_at
    `).run(
      id,
      JSON.stringify(app.manifest),
      app.installPath,
      app.installedAt,
    );
  }

  async removeApp(id: string): Promise<void> {
    this.db.prepare("DELETE FROM apps WHERE id = ?").run(id);
    this.db.prepare("DELETE FROM app_secrets WHERE app_id = ?").run(id);
  }

  async listApps(): Promise<StoredApp[]> {
    const rows = this.db.prepare("SELECT * FROM apps").all() as any[];
    return rows.map((row) => ({
      manifest: JSON.parse(row.manifest),
      installPath: row.install_path,
      installedAt: row.installed_at,
    }));
  }

  // --- App Secrets ---

  async getAppSecrets(appId: string): Promise<Record<string, string>> {
    const rows = this.db.prepare("SELECT key, value FROM app_secrets WHERE app_id = ?").all(appId) as any[];
    const secrets: Record<string, string> = {};
    for (const row of rows) {
      secrets[row.key] = row.value;
    }
    return secrets;
  }

  async setAppSecrets(appId: string, secrets: Record<string, string>): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO app_secrets (app_id, key, value)
      VALUES (?, ?, ?)
      ON CONFLICT(app_id, key) DO UPDATE SET value = excluded.value
    `);
    const transaction = this.db.transaction(() => {
      for (const [key, value] of Object.entries(secrets)) {
        stmt.run(appId, key, value);
      }
    });
    transaction();
  }

  // --- Device Profiles ---

  async getProfile(deviceId: string): Promise<DeviceProfile | null> {
    const row = this.db.prepare("SELECT * FROM device_profiles WHERE device_id = ?").get(deviceId) as any;
    if (!row) return null;
    return JSON.parse(row.profile);
  }

  async setProfile(deviceId: string, profile: DeviceProfile): Promise<void> {
    this.db.prepare(`
      INSERT INTO device_profiles (device_id, profile)
      VALUES (?, ?)
      ON CONFLICT(device_id) DO UPDATE SET profile = excluded.profile
    `).run(deviceId, JSON.stringify(profile));
  }

  async removeProfile(deviceId: string): Promise<void> {
    this.db.prepare("DELETE FROM device_profiles WHERE device_id = ?").run(deviceId);
  }

  async listProfiles(): Promise<DeviceProfile[]> {
    const rows = this.db.prepare("SELECT * FROM device_profiles").all() as any[];
    return rows.map((row) => JSON.parse(row.profile));
  }
}
