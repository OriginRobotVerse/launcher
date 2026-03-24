import { api } from "./client.js";

interface AppsListResponse {
  apps: Array<{
    id: string;
    name: string;
    version: string;
    author?: string;
    description?: string;
    deviceType: string;
    running: boolean;
    runningDeviceId?: string;
    frontendUrl?: string;
    secretsConfigured: boolean;
  }>;
}

export async function runApps(args: string[]): Promise<void> {
  const jsonOutput = args.includes("--json");
  const result = await api<AppsListResponse>("GET", "/api/apps");

  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (result.apps.length === 0) {
    console.log("  No apps installed.");
    console.log("  Install one with: origin install <github-url>");
    return;
  }

  console.log("");
  console.log(`  ${"ID".padEnd(30)}${"VERSION".padEnd(10)}${"DEVICE TYPE".padEnd(14)}STATUS`);

  for (const app of result.apps) {
    let status = "installed";
    if (app.running) {
      status = `▶ running (${app.runningDeviceId})`;
    }
    console.log(`  ${app.id.padEnd(30)}${app.version.padEnd(10)}${app.deviceType.padEnd(14)}${status}`);
  }
  console.log("");
}
