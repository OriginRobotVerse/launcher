import { api } from "./client.js";
import { exec } from "node:child_process";

interface LaunchResponse {
  ok: boolean;
  frontendUrl: string;
  backendUrl?: string;
}

export async function runLaunch(args: string[]): Promise<void> {
  const appId = args[0];
  if (!appId) {
    console.error("Usage: origin launch <app-id> --device <device-id>");
    process.exit(1);
  }

  let deviceId: string | undefined;
  let mode: "dev" | "prod" = "dev";
  let openBrowser = false;

  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case "--device":
      case "-d":
        deviceId = args[++i];
        break;
      case "--mode":
        mode = args[++i] as "dev" | "prod";
        break;
      case "--open":
        openBrowser = true;
        break;
    }
  }

  if (!deviceId) {
    console.error("Error: --device <device-id> is required");
    process.exit(1);
  }

  console.log(`  Launching ${appId} on device ${deviceId} (${mode})...`);

  const result = await api<LaunchResponse>("POST", `/api/apps/${encodeURIComponent(appId)}/launch`, {
    deviceId,
    mode,
  });

  console.log(`  ✓ ${appId} is running`);
  console.log(`    frontend → ${result.frontendUrl}`);
  if (result.backendUrl) {
    console.log(`    backend  → ${result.backendUrl}`);
  }

  if (openBrowser) {
    const openCmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
    exec(`${openCmd} ${result.frontendUrl}`);
  }
}
