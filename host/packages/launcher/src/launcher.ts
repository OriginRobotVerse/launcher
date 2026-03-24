import { OriginClient } from "originrobot-core";
import type { OriginApp, AppContext, Transport } from "originrobot-core";

export interface LauncherOptions {
  /** Tick interval in ms — how often the app loop runs (default: 50ms / ~20Hz) */
  tickInterval?: number;
}

export class Launcher {
  private client: OriginClient;
  private app: OriginApp | null = null;
  private running = false;
  private tickInterval: number;
  private loopTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(transport: Transport, options?: LauncherOptions) {
    this.client = new OriginClient(transport);
    this.tickInterval = options?.tickInterval ?? 50;
  }

  async connect(): Promise<void> {
    await this.client.connect();
  }

  async disconnect(): Promise<void> {
    await this.stop();
    await this.client.disconnect();
  }

  /** Load and start an app */
  async run(app: OriginApp): Promise<void> {
    // Stop current app if running
    if (this.running) {
      await this.stop();
    }

    this.app = app;
    this.running = true;

    console.log(`[origin] starting app: ${app.name}`);

    if (app.setup) {
      const ctx: AppContext = {
        readings: this.client.readings,
        send: (action, params?) => this.client.send(action, params),
        read: () => this.client.poll(),
      };
      await app.setup(ctx);
    }

    this.startLoop();
  }

  /** Stop the current app */
  async stop(): Promise<void> {
    this.running = false;

    if (this.loopTimer) {
      clearTimeout(this.loopTimer);
      this.loopTimer = null;
    }

    if (this.app?.teardown) {
      const ctx: AppContext = {
        readings: this.client.readings,
        send: (action, params?) => this.client.send(action, params),
        read: () => this.client.poll(),
      };
      await this.app.teardown(ctx);
    }

    if (this.app) {
      console.log(`[origin] stopped app: ${this.app.name}`);
    }

    this.app = null;
  }

  private startLoop(): void {
    if (!this.running || !this.app) return;

    const tick = async () => {
      if (!this.running || !this.app) return;

      // Poll for fresh readings before each tick
      const readings = await this.client.poll();

      // Build a fresh context each tick with updated readings
      const ctx: AppContext = {
        readings,
        send: (action, params?) => this.client.send(action, params),
        read: () => this.client.poll(),
      };

      try {
        await this.app.loop(ctx);
      } catch (err) {
        console.error(`[origin] error in ${this.app.name}.loop():`, err);
      }

      if (this.running) {
        this.loopTimer = setTimeout(tick, this.tickInterval);
      }
    };

    tick();
  }
}
