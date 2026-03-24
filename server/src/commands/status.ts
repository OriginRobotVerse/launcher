import { api } from "./client.js";

interface StatusResponse {
  version: string;
  uptime: number;
  coreUrl: string;
  dashboardUrl: string;
  devices: Array<{
    id: string;
    type: string;
    displayName: string;
    connected: boolean;
    stateKeyCount: number;
    actionCount: number;
  }>;
  apps: {
    installed: number;
    running: Array<{
      id: string;
      name: string;
      deviceId: string;
      frontendUrl: string;
      backendUrl?: string;
      status: string;
      uptime: number;
    }>;
  };
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

export async function runStatus(args: string[]): Promise<void> {
  const jsonOutput = args.includes("--json");
  const status = await api<StatusResponse>("GET", "/api/status");

  if (jsonOutput) {
    console.log(JSON.stringify(status, null, 2));
    return;
  }

  console.log("");
  console.log(`  origin v${status.version}`);
  console.log("");
  console.log(`  core server  → ${status.coreUrl}`);
  console.log(`  dashboard    → ${status.dashboardUrl}`);
  console.log("");

  if (status.devices.length > 0) {
    console.log("  devices");
    for (const d of status.devices) {
      const dot = d.connected ? "●" : "○";
      const padding = " ".repeat(Math.max(1, 18 - d.id.length));
      console.log(`    ${dot} ${d.id}${padding}${d.type.padEnd(12)}${d.stateKeyCount} state keys    ${d.actionCount} actions`);
    }
    console.log("");
  }

  if (status.apps.installed > 0 || status.apps.running.length > 0) {
    console.log("  apps");
    if (status.apps.running.length > 0) {
      for (const app of status.apps.running) {
        const padding = " ".repeat(Math.max(1, 30 - app.id.length));
        console.log(`    ${app.id}${padding}▶ running → ${app.frontendUrl}`);
        console.log(`    ${" ".repeat(30)}device: ${app.deviceId} | uptime: ${formatUptime(app.uptime)}`);
      }
    }
    if (status.apps.installed > status.apps.running.length) {
      console.log(`    ${status.apps.installed - status.apps.running.length} installed (not running)`);
    }
    console.log("");
  }
}
