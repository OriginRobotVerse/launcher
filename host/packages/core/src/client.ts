import type { Transport } from "./transport.js";
import type { ReadingValue } from "./state.js";

export class OriginClient {
  private transport: Transport;
  private _readings: Record<string, ReadingValue> = {};

  constructor(transport: Transport) {
    this.transport = transport;
  }

  async connect(): Promise<void> {
    await this.transport.connect();
  }

  async disconnect(): Promise<void> {
    await this.transport.disconnect();
  }

  /** Send an action to the device */
  async send(action: string, params?: Record<string, ReadingValue>): Promise<void> {
    const message = JSON.stringify({ action, params: params ?? {} });
    await this.transport.send(message);
  }

  /** Read the latest readings from the device */
  async read(): Promise<Record<string, ReadingValue>> {
    const raw = await this.transport.receive();
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.readings) {
          this._readings = { ...this._readings, ...parsed.readings };
        }
      } catch {
        // skip malformed messages
      }
    }
    return { ...this._readings };
  }

  /** Get cached readings without waiting for new data */
  get readings(): Record<string, ReadingValue> {
    return { ...this._readings };
  }

  /** Drain all available messages from transport and update readings */
  async poll(): Promise<Record<string, ReadingValue>> {
    // Read until no more data — keeps readings fresh
    let raw: string;
    try {
      raw = await this.transport.receive();
    } catch {
      return { ...this._readings };
    }

    while (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.readings) {
          this._readings = { ...this._readings, ...parsed.readings };
        }
      } catch {
        // skip malformed
      }
      try {
        raw = await this.transport.receive();
      } catch {
        break;
      }
    }

    return { ...this._readings };
  }
}
