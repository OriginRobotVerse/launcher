#!/usr/bin/env node

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { DeviceManager } from "./device-manager.js";
import { SSEManager } from "./sse.js";
import { WebhookManager } from "./webhooks.js";
import { createOriginServer } from "./server.js";
import { createAuthMiddleware } from "./auth.js";
import { MemoryStorageAdapter } from "./storage.js";
import type { SSEEvent, OriginConfig } from "./types.js";

// --- CLI argument parsing ---

interface Config {
  serial: string[];
  bluetooth: string[];
  port: number;
  baudRate: number;
  token: string | null;
}

function parseArgs(args: string[]): Config {
  const config: Config = {
    serial: [],
    bluetooth: [],
    port: 3000,
    baudRate: 9600,
    token: null,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    switch (arg) {
      case "--serial":
      case "-s":
        if (next) { config.serial.push(next); i++; }
        break;
      case "--bluetooth":
      case "-b":
        if (next) { config.bluetooth.push(next); i++; }
        break;
      case "--port":
      case "-p":
        if (next) { config.port = parseInt(next, 10); i++; }
        break;
      case "--baud":
        if (next) { config.baudRate = parseInt(next, 10); i++; }
        break;
      case "--token":
      case "-t":
        if (next) { config.token = next; i++; }
        break;
      case "--config":
      case "-c":
        if (next) {
          const configPath = resolve(next);
          if (existsSync(configPath)) {
            const fileConfig = JSON.parse(readFileSync(configPath, "utf-8"));
            if (fileConfig.serial) config.serial.push(...(Array.isArray(fileConfig.serial) ? fileConfig.serial : [fileConfig.serial]));
            if (fileConfig.bluetooth) config.bluetooth.push(...(Array.isArray(fileConfig.bluetooth) ? fileConfig.bluetooth : [fileConfig.bluetooth]));
            if (fileConfig.port) config.port = fileConfig.port;
            if (fileConfig.baudRate) config.baudRate = fileConfig.baudRate;
            if (fileConfig.token) config.token = fileConfig.token;
          } else {
            console.error(`Config file not found: ${configPath}`);
            process.exit(1);
          }
          i++;
        }
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
        break;
      default:
        if (arg.startsWith("-")) {
          console.error(`Unknown option: ${arg}`);
          printHelp();
          process.exit(1);
        }
    }
  }

  return config;
}

function printHelp(): void {
  console.log(`
origin-server — HTTP API bridge for Origin devices

Usage:
  origin-server [options]

Options:
  --serial, -s <path>     Serial port path (can repeat for multiple devices)
  --bluetooth, -b <path>  Bluetooth serial path (can repeat)
  --port, -p <number>     HTTP port (default: 3000)
  --baud <number>         Baud rate (default: 9600)
  --token, -t <string>    Bearer token for API auth (optional)
  --config, -c <path>     Load config from JSON file
  --help, -h              Show this help

Config file (config.ts in cwd):
  import { defineConfig } from "origin-server";

  export default defineConfig({
    token: "my-secret-token",
  });
  // defaults: bluetooth HC-05, port 3000, baud 9600

JSON config file (--config):
  {
    "serial": ["/dev/ttyUSB0"],
    "bluetooth": ["/dev/tty.HC-05"],
    "port": 3000,
    "baudRate": 9600,
    "token": "my-secret-token"
  }

Examples:
  origin-server                                      # uses config.ts from cwd
  origin-server --serial /dev/ttyUSB0
  origin-server -s /dev/ttyUSB0 -s /dev/ttyUSB1 -p 8080
  origin-server --bluetooth /dev/tty.HC-05 --token my-secret
  origin-server --config origin.config.json
`);
}

// --- Config file loader ---

function toArray(val: string | string[] | undefined): string[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

async function loadConfigFile(): Promise<OriginConfig | null> {
  // Try config.ts first (must be compiled), then config.js
  for (const name of ["config.ts", "config.js"]) {
    const filePath = resolve(process.cwd(), name);
    if (!existsSync(filePath)) continue;

    try {
      const fileUrl = pathToFileURL(filePath).href;
      const mod = await import(fileUrl);
      const config: OriginConfig = mod.default ?? mod;
      console.log(`[config] Loaded ${name}`);
      return config;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[config] Failed to load ${name}: ${message}`);
    }
  }
  return null;
}

// --- Main ---

async function main() {
  // Load config.ts from cwd as the base, then overlay CLI args
  const fileConfig = await loadConfigFile();
  const cliConfig = parseArgs(process.argv.slice(2));

  const config: Config = {
    serial: cliConfig.serial.length > 0 ? cliConfig.serial : toArray(fileConfig?.serial),
    bluetooth: cliConfig.bluetooth.length > 0 ? cliConfig.bluetooth : toArray(fileConfig?.bluetooth),
    port: cliConfig.port !== 3000 ? cliConfig.port : (fileConfig?.port ?? 3000),
    baudRate: cliConfig.baudRate !== 9600 ? cliConfig.baudRate : (fileConfig?.baudRate ?? 9600),
    token: cliConfig.token ?? fileConfig?.token ?? null,
  };

  // Create managers
  const storage = fileConfig?.storage ?? new MemoryStorageAdapter();
  const deviceManager = new DeviceManager(storage);
  const sseManager = new SSEManager();
  const webhookManager = new WebhookManager(storage);
  const authCheck = createAuthMiddleware(config.token);

  // Wire up SSE and webhooks to device events
  deviceManager.on("sse", (event: SSEEvent) => {
    sseManager.broadcast(event);
    webhookManager.dispatch(event).catch((err) => {
      console.error("[webhook] Dispatch error:", err);
    });
  });

  // Create HTTP server
  const server = createOriginServer({
    port: config.port,
    deviceManager,
    sseManager,
    webhookManager,
    authCheck,
  });

  // Register and open all configured ports (persistent listeners)
  const portPromises: Promise<void>[] = [];
  for (const path of config.serial) {
    portPromises.push(deviceManager.addPort({ type: "serial", path, baudRate: config.baudRate }));
  }
  for (const path of config.bluetooth) {
    portPromises.push(deviceManager.addPort({ type: "bluetooth", path, baudRate: config.baudRate }));
  }
  await Promise.allSettled(portPromises);

  // Start HTTP server
  server.listen(config.port, () => {
    console.log(`[server] Origin server listening on http://localhost:${config.port}`);
    if (config.token) {
      console.log("[server] Auth enabled — requests require Bearer token");
    }
    console.log(`[server] Ports: ${deviceManager.getPortStatuses().map((p) => `${p.path} (${p.status})`).join(", ") || "none"}`);
    console.log(`[server] Call POST /discover to query devices`);
  });

  // Graceful shutdown
  async function shutdown() {
    console.log("\n[shutdown] Closing connections...");
    sseManager.closeAll();
    await deviceManager.shutdown();
    server.close();
    console.log("[shutdown] Done.");
    process.exit(0);
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
