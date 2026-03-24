import { api } from "./client.js";
import type { DeviceManifest } from "../types.js";

interface DiscoverResult {
  connected: DeviceManifest[];
  failed: Array<{ path: string; error: string }>;
}

export async function runDiscover(_args: string[]): Promise<void> {
  console.log("  Discovering devices...");

  const result = await api<DiscoverResult>("POST", "/discover");

  if (result.connected.length > 0) {
    console.log("");
    for (const d of result.connected) {
      console.log(`  ✓ ${d.id} (v${d.version}) — ${d.actions.length} actions, ${d.state.length} state keys`);
    }
  }

  if (result.failed.length > 0) {
    console.log("");
    for (const f of result.failed) {
      console.log(`  ✗ ${f.path}: ${f.error}`);
    }
  }

  if (result.connected.length === 0 && result.failed.length === 0) {
    console.log("  No ports configured. Add --serial, --bluetooth, or --tcp to 'origin up'.");
  }

  console.log("");
}
