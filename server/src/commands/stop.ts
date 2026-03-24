import { api } from "./client.js";

export async function runStop(args: string[]): Promise<void> {
  const appId = args[0];
  if (!appId) {
    console.error("Usage: origin stop <app-id>");
    process.exit(1);
  }

  await api("POST", `/api/apps/${encodeURIComponent(appId)}/stop`);
  console.log(`  ✓ Stopped ${appId}`);
}
