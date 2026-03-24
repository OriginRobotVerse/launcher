#!/usr/bin/env node

import { runUp } from "./commands/up.js";
import { runStatus } from "./commands/status.js";
import { runDevices } from "./commands/devices.js";
import { runApps } from "./commands/apps.js";
import { runInstall } from "./commands/install.js";
import { runUninstall } from "./commands/uninstall.js";
import { runLaunch } from "./commands/launch.js";
import { runStop } from "./commands/stop.js";
import { runSecrets } from "./commands/secrets.js";
import { runDiscover } from "./commands/discover.js";
import { runProfiles } from "./commands/profiles.js";

function printHelp(): void {
  console.log(`
origin — CLI for the Origin robotics platform

Usage:
  origin <command> [options]

Commands:
  up [options]                          Start core server + dashboard
    --port, -p <number>                 Core server port (default: 5050)
    --dashboard-port <number>           Dashboard port (default: 5051)
    --serial, -s <path>                 Serial port (repeatable)
    --bluetooth, -b <path>              Bluetooth port (repeatable)
    --tcp <port>                        TCP listener for simulators (repeatable)
    --baud <number>                     Baud rate (default: 9600)
    --no-dashboard                      Skip starting the dashboard
    --open                              Auto-open dashboard in browser

  devices                               List connected devices
    --json                              Output as JSON
  devices info <device-id>              Device detail + profile

  apps                                  List installed apps
    --json                              Output as JSON

  install <source>                      Install an app
    source: GitHub URL, local path, or tarball URL
    --name <override-id>                Override app ID

  uninstall <app-id>                    Remove an installed app

  launch <app-id>                       Launch an app
    --device, -d <device-id>            Required
    --mode <dev|prod>                   Default: dev
    --open                              Auto-open in browser

  stop <app-id>                         Stop a running app

  secrets set <app-id> <key> <value>    Set a secret for an app
  secrets list <app-id>                 Show secret status for an app

  status                                Server info, devices, running apps
    --json                              Output as JSON

  discover                              Trigger device discovery

  profiles                              List device profiles
  profiles show <device-id>             Show profile detail

  help                                  Show this help
`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const rest = args.slice(1);

  switch (command) {
    case "up":
      await runUp(rest);
      break;
    case "status":
      await runStatus(rest);
      break;
    case "devices":
      await runDevices(rest);
      break;
    case "apps":
      await runApps(rest);
      break;
    case "install":
      await runInstall(rest);
      break;
    case "uninstall":
      await runUninstall(rest);
      break;
    case "launch":
      await runLaunch(rest);
      break;
    case "stop":
      await runStop(rest);
      break;
    case "secrets":
      await runSecrets(rest);
      break;
    case "discover":
      await runDiscover(rest);
      break;
    case "profiles":
      await runProfiles(rest);
      break;
    case "help":
    case "--help":
    case "-h":
    case undefined:
      printHelp();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
