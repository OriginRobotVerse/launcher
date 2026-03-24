import { api } from "./client.js";

export async function runUninstall(args: string[]): Promise<void> {
  const appId = args[0];
  if (!appId) {
    console.error("Usage: origin uninstall <app-id>");
    process.exit(1);
  }

  await api("DELETE", `/api/apps/${encodeURIComponent(appId)}`);
  console.log(`  ✓ Uninstalled ${appId}`);
}
