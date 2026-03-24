import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { spawn, spawnSync, exec, type ChildProcess } from "node:child_process";
import { DeviceManager } from "../device-manager.js";
import { AppManager } from "../app-manager.js";
import { SimulatorManager } from "../simulator-manager.js";
import { SSEManager } from "../sse.js";
import { WebhookManager } from "../webhooks.js";
import { createOriginServer } from "../server.js";
import { createAuthMiddleware } from "../auth.js";
import { MemoryStorageAdapter } from "../storage.js";
import { SqliteStorageAdapter } from "../storage-sqlite.js";
import type { SSEEvent, OriginConfig } from "../types.js";

interface UpFlags {
  serial: string[];
  bluetooth: string[];
  tcp: number[];
  port: number;
  dashboardPort: number;
  baudRate: number;
  token: string | null;
  noDashboard: boolean;
  open: boolean;
}

function toArray(val: string | string[] | undefined): string[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

// JSON config shape — plain values only, no code
interface JsonConfig {
  port?: number;
  dashboardPort?: number;
  tcp?: number | number[];
  serial?: string | string[];
  bluetooth?: string | string[];
  baudRate?: number;
  token?: string;
  appsDir?: string;
  dataDir?: string;
}

async function loadConfigFile(): Promise<OriginConfig | null> {
  const homeDir = process.env.HOME ?? process.env.USERPROFILE ?? "";
  const originDir = homeDir ? resolve(homeDir, ".origin") : null;

  // Search order: CWD first, then ~/.origin/
  const searchDirs = [process.cwd()];
  if (originDir) searchDirs.push(originDir);

  for (const dir of searchDirs) {
    // Try JSON config first (preferred for published package)
    const jsonPath = resolve(dir, "origin.json");
    if (existsSync(jsonPath)) {
      try {
        const raw: JsonConfig = JSON.parse(readFileSync(jsonPath, "utf-8"));
        const dataDir = raw.dataDir ? resolve(dir, raw.dataDir) : undefined;
        return {
          port: raw.port,
          dashboardPort: raw.dashboardPort,
          tcp: raw.tcp,
          serial: raw.serial,
          bluetooth: raw.bluetooth,
          baudRate: raw.baudRate,
          token: raw.token,
          appsDir: raw.appsDir ? resolve(dir, raw.appsDir) : undefined,
          storage: dataDir
            ? new SqliteStorageAdapter(resolve(dataDir, "origin.db"))
            : undefined,
        } as OriginConfig;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[config] Failed to load ${jsonPath}: ${message}`);
      }
    }

    // Fall back to TS/JS config (for advanced use cases)
    for (const name of ["config.ts", "config.js"]) {
      const filePath = resolve(dir, name);
      if (!existsSync(filePath)) continue;
      try {
        const fileUrl = pathToFileURL(filePath).href;
        const mod = await import(fileUrl);
        const config: OriginConfig = mod.default ?? mod;
        return config;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[config] Failed to load ${filePath}: ${message}`);
      }
    }
  }
  return null;
}

export function parseUpFlags(args: string[]): UpFlags {
  const flags: UpFlags = {
    serial: [],
    bluetooth: [],
    tcp: [],
    port: 0,
    dashboardPort: 0,
    baudRate: 0,
    token: null,
    noDashboard: false,
    open: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    switch (arg) {
      case "--serial":
      case "-s":
        if (next) { flags.serial.push(next); i++; }
        break;
      case "--bluetooth":
      case "-b":
        if (next) { flags.bluetooth.push(next); i++; }
        break;
      case "--port":
      case "-p":
        if (next) { flags.port = parseInt(next, 10); i++; }
        break;
      case "--dashboard-port":
        if (next) { flags.dashboardPort = parseInt(next, 10); i++; }
        break;
      case "--baud":
        if (next) { flags.baudRate = parseInt(next, 10); i++; }
        break;
      case "--tcp":
        if (next) { flags.tcp.push(parseInt(next, 10)); i++; }
        break;
      case "--token":
      case "-t":
        if (next) { flags.token = next; i++; }
        break;
      case "--no-dashboard":
        flags.noDashboard = true;
        break;
      case "--open":
        flags.open = true;
        break;
    }
  }

  return flags;
}

export async function runUp(args: string[]): Promise<void> {
  const flags = parseUpFlags(args);
  const fileConfig = await loadConfigFile();

  const fileTcp = fileConfig?.tcp
    ? (Array.isArray(fileConfig.tcp) ? fileConfig.tcp : [fileConfig.tcp])
    : [];

  const port = flags.port || fileConfig?.port || 5050;
  const dashboardPort = flags.dashboardPort || fileConfig?.dashboardPort || 5051;
  const baudRate = flags.baudRate || fileConfig?.baudRate || 9600;
  const token = flags.token ?? fileConfig?.token ?? null;
  const serial = flags.serial.length > 0 ? flags.serial : toArray(fileConfig?.serial);
  const bluetooth = flags.bluetooth.length > 0 ? flags.bluetooth : toArray(fileConfig?.bluetooth);
  const tcp = flags.tcp.length > 0 ? flags.tcp : fileTcp;
  // Default apps/data dir: use ~/.origin/ for global installs, ./apps for local dev
  const homeDir = process.env.HOME ?? process.env.USERPROFILE ?? ".";
  const defaultOriginDir = resolve(homeDir, ".origin");
  const appsDir = fileConfig?.appsDir ?? resolve(defaultOriginDir, "apps");

  // Resolve the package root (server/) for bundled assets
  const __dir = typeof import.meta.dirname === "string"
    ? import.meta.dirname
    : dirname(fileURLToPath(import.meta.url));
  // __dir is src/commands/ (dev) or dist/commands/ (built) — go up 2 levels to server/
  const packageRoot = resolve(__dir, "..", "..");

  // Create managers — default to SQLite in ~/.origin/data/ for persistence
  let storage = fileConfig?.storage;
  if (!storage) {
    const dataDir = resolve(defaultOriginDir, "data");
    if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
    storage = new SqliteStorageAdapter(resolve(dataDir, "origin.db"));
  }
  const deviceManager = new DeviceManager(storage);
  const appManager = new AppManager(storage, appsDir);
  const tcpPort = tcp.length > 0 ? tcp[0] : 5051;
  const simulatorManager = new SimulatorManager(tcpPort);
  const sseManager = new SSEManager();
  const webhookManager = new WebhookManager(storage);
  const authCheck = createAuthMiddleware(token);

  // Wire up SSE and webhooks
  deviceManager.on("sse", (event: SSEEvent) => {
    sseManager.broadcast(event);
    webhookManager.dispatch(event).catch((err) => {
      console.error("[webhook] Dispatch error:", err);
    });
  });

  // Scan installed apps
  await appManager.scan();

  // Create HTTP server
  const server = createOriginServer({
    port,
    deviceManager,
    appManager,
    simulatorManager,
    sseManager,
    webhookManager,
    authCheck,
    storage,
  });

  // Open hardware transports
  const portPromises: Promise<void>[] = [];
  for (const path of serial) {
    portPromises.push(deviceManager.addPort({ type: "serial", path, baudRate }));
  }
  for (const path of bluetooth) {
    portPromises.push(deviceManager.addPort({ type: "bluetooth", path, baudRate }));
  }
  await Promise.allSettled(portPromises);

  for (const tcpPort of tcp) {
    deviceManager.addTcpListener(tcpPort);
  }

  // Start HTTP server
  server.listen(port, () => {
    console.log("");
    console.log("  origin v0.2.0");
    console.log("");
    console.log(`  core server  → http://localhost:${port}`);
  });

  // Start dashboard
  let dashboardProcess: ChildProcess | null = null;
  if (!flags.noDashboard) {
    const dashboardDir = resolve(packageRoot, "dashboard");

    if (existsSync(dashboardDir)) {
      // Resolve the next binary — check dashboard's own node_modules first,
      // then the parent package's node_modules (where it lives when published)
      const localNextBin = resolve(dashboardDir, "node_modules", ".bin", "next");
      const parentNextBin = resolve(packageRoot, "node_modules", ".bin", "next");
      const nextBin = existsSync(localNextBin) ? localNextBin
        : existsSync(parentNextBin) ? parentNextBin
        : null;

      if (!nextBin) {
        console.log("  dashboard    → next not found, skipping");
      } else {
        // Check if dashboard is already built
        const nextDir = resolve(dashboardDir, ".next");
        const isBuilt = existsSync(nextDir);

        // Dev mode: dashboard has its own node_modules (local development)
        const isDev = existsSync(localNextBin);

        if (isDev) {
          // Dev mode — use next dev for hot reload
          dashboardProcess = spawn(nextBin, ["dev", "-p", String(dashboardPort)], {
            cwd: dashboardDir,
            env: {
              ...process.env,
              NEXT_PUBLIC_ORIGIN_URL: `http://localhost:${port}`,
              PORT: String(dashboardPort),
            },
            stdio: "pipe",
          });
          console.log(`  dashboard    → http://localhost:${dashboardPort} (dev)`);
        } else {
          // Production mode — build if needed, then next start
          if (!isBuilt) {
            console.log("  [dashboard] Building...");
            spawnSync(nextBin, ["build"], {
              cwd: dashboardDir,
              env: {
                ...process.env,
                NEXT_PUBLIC_ORIGIN_URL: `http://localhost:${port}`,
              },
              stdio: "pipe",
            });
          }

          dashboardProcess = spawn(nextBin, ["start", "-p", String(dashboardPort)], {
            cwd: dashboardDir,
            env: {
              ...process.env,
              PORT: String(dashboardPort),
            },
            stdio: "pipe",
          });
          console.log(`  dashboard    → http://localhost:${dashboardPort}`);
        }

        dashboardProcess.stdout?.on("data", (d: Buffer) => {
          const text = String(d).trim();
          if (text) process.stdout.write(`  [dashboard] ${text}\n`);
        });
        dashboardProcess.stderr?.on("data", (d: Buffer) => {
          const text = String(d).trim();
          if (text) process.stderr.write(`  [dashboard] ${text}\n`);
        });
      }
    } else {
      console.log(`  dashboard    → not found (${dashboardDir})`);
    }
  }

  console.log("");
  if (token) {
    console.log("  auth         → enabled (Bearer token required)");
  }
  const ports = deviceManager.getPortStatuses();
  if (ports.length > 0) {
    console.log(`  ports        → ${ports.map((p) => `${p.path} (${p.status})`).join(", ")}`);
  }
  const installed = appManager.listInstalled();
  if (installed.length > 0) {
    console.log(`  apps         → ${installed.length} installed`);
  }
  console.log("");

  if (flags.open) {
    const openCmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
    setTimeout(() => {
      exec(`${openCmd} http://localhost:${dashboardPort}`);
    }, 3000);
  }

  // Graceful shutdown
  let shuttingDown = false;
  async function shutdown() {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log("\n[shutdown] Closing connections...");
    sseManager.closeAll();
    await simulatorManager.shutdown();
    await appManager.shutdown();
    await deviceManager.shutdown();
    if (dashboardProcess && !dashboardProcess.killed) {
      dashboardProcess.kill("SIGTERM");
    }
    await new Promise<void>((resolve) => server.close(() => resolve()));
    console.log("[shutdown] Done.");
    process.exit(0);
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
