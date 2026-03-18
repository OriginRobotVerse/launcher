import { createHmac } from "node:crypto";
import { randomUUID } from "node:crypto";
import type { SSEEvent, StorageAdapter, Webhook, WebhookRegistration } from "./types.js";

export class WebhookManager {
  private storage: StorageAdapter;

  constructor(storage: StorageAdapter) {
    this.storage = storage;
  }

  async register(registration: WebhookRegistration): Promise<Webhook> {
    const webhook: Webhook = {
      id: randomUUID(),
      url: registration.url,
      events: registration.events ?? [
        "state.updated",
        "action.sent",
        "device.connected",
        "device.disconnected",
      ],
      createdAt: new Date().toISOString(),
      secret: registration.secret,
    };

    await this.storage.setWebhook(webhook.id, webhook);
    return webhook;
  }

  async remove(id: string): Promise<boolean> {
    const existing = await this.storage.getWebhook(id);
    if (!existing) return false;
    await this.storage.removeWebhook(id);
    return true;
  }

  async list(): Promise<Webhook[]> {
    const webhooks = await this.storage.listWebhooks();
    return webhooks.map((w) => ({
      id: w.id,
      url: w.url,
      events: w.events,
      createdAt: w.createdAt,
      // Don't expose the secret in list responses
    }));
  }

  async dispatch(event: SSEEvent): Promise<void> {
    const webhooks = await this.storage.listWebhooks();

    const payload = JSON.stringify({
      event: event.event,
      deviceId: event.deviceId,
      data: event.data,
      timestamp: event.timestamp,
    });

    const promises: Promise<void>[] = [];

    for (const webhook of webhooks) {
      // Only dispatch if the webhook is subscribed to this event type
      if (!webhook.events.includes(event.event)) continue;

      promises.push(this.send(webhook, payload));
    }

    await Promise.allSettled(promises);
  }

  private async send(webhook: Webhook, payload: string): Promise<void> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Add HMAC signature if secret is configured
    if (webhook.secret) {
      const signature = createHmac("sha256", webhook.secret)
        .update(payload)
        .digest("hex");
      headers["X-Origin-Signature"] = `sha256=${signature}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      const res = await fetch(webhook.url, {
        method: "POST",
        headers,
        body: payload,
        signal: controller.signal,
      });

      if (!res.ok) {
        console.warn(
          `[webhook] ${webhook.id} responded ${res.status} from ${webhook.url}`,
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[webhook] ${webhook.id} failed: ${message}`);
    } finally {
      clearTimeout(timeout);
    }
  }
}
