import Database from "better-sqlite3";
import type { StorageAdapter, StoredDevice, Webhook } from "./types.js";

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
}
