import type { ReadingValue } from "./state.js";

export interface AppContext {
  /** Latest sensor readings from the device — always fresh */
  readings: Record<string, ReadingValue>;
  /** Send an action to the device (persists until next send) */
  send(action: string, params?: Record<string, ReadingValue>): Promise<void>;
  /** Pull the latest readings explicitly (readings prop auto-updates, but this forces a fresh read) */
  read(): Promise<Record<string, ReadingValue>>;
}

export interface OriginApp {
  name: string;
  /** Called once when the app starts */
  setup?(ctx: AppContext): Promise<void> | void;
  /** Called continuously in a loop by the launcher */
  loop(ctx: AppContext): Promise<void> | void;
  /** Called when the app is stopped */
  teardown?(ctx: AppContext): Promise<void> | void;
}
