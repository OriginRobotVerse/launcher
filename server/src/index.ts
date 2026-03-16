#!/usr/bin/env node

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { DeviceManager } from "./device-manager.js";
import { SSEManager } from "./sse.js";
import { WebhookManager } from "./webhooks.js";
import { createOriginServer } from "./server.js";
import { createAuthMiddleware } from "./auth.js";
import { SerialServerTransport, BluetoothServerTransport } from "./transport.js";
import type { SSEEvent, ServerTransport } from "./types.js";

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

Config file format:
  {
    "serial": ["/dev/ttyUSB0"],
    "bluetooth": ["/dev/tty.HC-05"],
    "port": 3000,
    "baudRate": 9600,
    "token": "my-secret-token"
  }

Examples:
  origin-server --serial /dev/ttyUSB0
  origin-server -s /dev/ttyUSB0 -s /dev/ttyUSB1 -p 8080
  origin-server --bluetooth /dev/tty.HC-05 --token my-secret
  origin-server --config origin.config.json
`);
}

// --- Main ---

async function main() {
  const config = parseArgs(process.argv.slice(2));

  if (config.serial.length === 0 && config.bluetooth.length === 0) {
    console.error("Error: At least one --serial or --bluetooth device path is required.");
    printHelp();
    process.exit(1);
  }

  // Create managers
  const deviceManager = new DeviceManager();
  const sseManager = new SSEManager();
  const webhookManager = new WebhookManager();
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

  // Connect transports
  const transports: ServerTransport[] = [];

  for (const path of config.serial) {
    console.log(`[init] Connecting serial: ${path} @ ${config.baudRate} baud`);
    const transport = new SerialServerTransport(path, config.baudRate);
    transports.push(transport);
  }

  for (const path of config.bluetooth) {
    console.log(`[init] Connecting bluetooth: ${path} @ ${config.baudRate} baud`);
    const transport = new BluetoothServerTransport(path, config.baudRate);
    transports.push(transport);
  }

  // Add transports and wait for handshake
  const connectPromises = transports.map(async (transport) => {
    try {
      const deviceId = await deviceManager.addTransport(transport);
      console.log(`[init] Device connected: ${deviceId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[init] Failed to connect transport: ${message}`);
    }
  });

  // Start HTTP server immediately (devices connect in the background)
  server.listen(config.port, () => {
    console.log(`[server] Origin server listening on http://localhost:${config.port}`);
    if (config.token) {
      console.log("[server] Auth enabled — requests require Bearer token");
    }
  });

  // Wait for all devices
  await Promise.allSettled(connectPromises);

  const deviceCount = deviceManager.getDeviceIds().length;
  console.log(`[init] ${deviceCount} device(s) connected`);

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
