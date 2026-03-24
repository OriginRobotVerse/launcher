import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createRequire } from "node:module";
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

/**
 * Result of resolving the Next.js binary. Provides the command and args
 * needed to spawn next, regardless of how it was found.
 */
interface ResolvedNext {
  /** The executable path or command name */
  command: string;
  /** Extra args to prepend (e.g. ["next"] when using npx) */
  args: string[];
  /** Whether to spawn with shell: true (needed for npx on Windows) */
  shell: boolean;
}

/**
 * Resolves the `next` binary using multiple strategies, in order of preference:
 *
 * 1. dashboard/node_modules/.bin/next  (local dev with separate install)
 * 2. server/node_modules/.bin/next     (flat npm layout after publish)
 * 3. Walk up from packageRoot looking for node_modules/.bin/next
 *    (handles pnpm global hoisting where deps live higher in the tree)
 * 4. Use Node's module resolution (require.resolve) to find the next package
 *    and derive the CLI binary path from its package.json "bin" field
 * 5. Check if `next` is available on PATH (npm global bin, Homebrew, etc.)
 * 6. Auto-install dashboard dependencies and retry
 * 7. Fall back to `npx next` which downloads and runs on the fly
 */
async function resolveNextBinary(dashboardDir: string, packageRoot: string): Promise<ResolvedNext> {
  const binName = process.platform === "win32" ? "next.cmd" : "next";

  // Strategy 1: dashboard's own node_modules (local dev)
  const dashboardBin = resolve(dashboardDir, "node_modules", ".bin", binName);
  if (existsSync(dashboardBin)) {
    return { command: dashboardBin, args: [], shell: false };
  }

  // Strategy 2: parent package node_modules (flat npm layout)
  const parentBin = resolve(packageRoot, "node_modules", ".bin", binName);
  if (existsSync(parentBin)) {
    return { command: parentBin, args: [], shell: false };
  }

  // Strategy 3: walk up the directory tree from packageRoot
  // pnpm global installs place .bin shims in a parent node_modules higher up
  let searchDir = resolve(packageRoot, "..");
  const root = resolve("/");
  while (searchDir !== root) {
    const candidateBin = resolve(searchDir, "node_modules", ".bin", binName);
    if (existsSync(candidateBin)) {
      return { command: candidateBin, args: [], shell: false };
    }
    // Also check if we're inside a node_modules directory and look for .bin at that level
    const asBin = resolve(searchDir, ".bin", binName);
    if (searchDir.endsWith("node_modules") && existsSync(asBin)) {
      return { command: asBin, args: [], shell: false };
    }
    const parent = resolve(searchDir, "..");
    if (parent === searchDir) break;
    searchDir = parent;
  }

  // Strategy 4: Node module resolution — find the next package's CLI entry
  const foundViaResolve = resolveNextViaNodeModules(packageRoot, dashboardDir);
  if (foundViaResolve) {
    return { command: foundViaResolve, args: [], shell: false };
  }

  // Strategy 5: check if `next` is on PATH
  const onPath = findCommandOnPath("next");
  if (onPath) {
    return { command: onPath, args: [], shell: false };
  }

  // Strategy 6: auto-install dashboard dependencies and retry
  console.log("  [dashboard] Dependencies not found, installing...");
  const installed = await installDashboardDeps(dashboardDir);
  if (installed) {
    const freshBin = resolve(dashboardDir, "node_modules", ".bin", binName);
    if (existsSync(freshBin)) {
      return { command: freshBin, args: [], shell: false };
    }
  }

  // Strategy 7: fall back to npx, which can download and run next on the fly
  console.log("  [dashboard] Using npx to run next...");
  return { command: "npx", args: ["--yes", "next"], shell: process.platform === "win32" };
}

/**
 * Attempt to find the next CLI binary by resolving the `next` module
 * through Node's own resolution algorithm. This works regardless of
 * how node_modules is laid out (flat, hoisted, pnpm content-addressed).
 */
function resolveNextViaNodeModules(packageRoot: string, dashboardDir: string): string | null {
  // Build a list of directories to resolve from. We try multiple starting
  // points because the `next` package could be reachable from any of them
  // depending on the package manager and install layout.
  const currentFileDir = typeof import.meta.dirname === "string"
    ? import.meta.dirname
    : dirname(fileURLToPath(import.meta.url));

  const resolveBases = [
    dashboardDir,
    packageRoot,
    // The directory containing this compiled file — when installed as a
    // dependency, Node's resolution walks up from here and can find `next`
    // even in pnpm's deeply nested virtual store structure.
    currentFileDir,
  ];

  for (const basePath of resolveBases) {
    // First try a direct filesystem check for next in node_modules
    const directPath = resolve(basePath, "node_modules", "next", "package.json");
    if (existsSync(directPath)) {
      const binPath = resolveNextCliBinFromPkgDir(dirname(directPath));
      if (binPath) return binPath;
    }

    // Use createRequire to leverage Node's full resolution algorithm,
    // which follows symlinks, pnpm virtual store paths, etc.
    try {
      const req = createRequire(resolve(basePath, "_resolve_anchor.js"));
      const nextPkgJsonPath = req.resolve("next/package.json");
      const binPath = resolveNextCliBinFromPkgDir(dirname(nextPkgJsonPath));
      if (binPath) return binPath;
    } catch {
      // Module not resolvable from this base — try the next one
    }
  }

  return null;
}

/**
 * Given the directory of an installed `next` package, find the CLI binary.
 * Checks both the known internal path and the package.json "bin" field.
 */
function resolveNextCliBinFromPkgDir(nextPkgDir: string): string | null {
  // next's CLI binary is typically at dist/bin/next
  const knownPath = resolve(nextPkgDir, "dist", "bin", "next");
  if (existsSync(knownPath)) {
    return knownPath;
  }

  // Fall back to reading the package.json "bin" field
  try {
    const pkgJsonPath = resolve(nextPkgDir, "package.json");
    const nextPkg = JSON.parse(readFileSync(pkgJsonPath, "utf-8"));
    if (nextPkg.bin) {
      const binEntry = typeof nextPkg.bin === "string" ? nextPkg.bin : nextPkg.bin.next;
      if (binEntry) {
        const binPath = resolve(nextPkgDir, binEntry);
        if (existsSync(binPath)) {
          return binPath;
        }
      }
    }
  } catch {
    // Could not read or parse package.json
  }

  return null;
}

/**
 * Check if a command exists on PATH using `which` (Unix) or `where` (Windows).
 * Returns the full path if found, null otherwise.
 */
function findCommandOnPath(command: string): string | null {
  const whichCmd = process.platform === "win32" ? "where" : "which";
  try {
    const result = spawnSync(whichCmd, [command], {
      encoding: "utf-8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    if (result.status === 0 && result.stdout) {
      const binPath = result.stdout.trim().split("\n")[0].trim();
      if (binPath && existsSync(binPath)) {
        return binPath;
      }
    }
  } catch {
    // which/where not available or failed
  }
  return null;
}

/**
 * Install dashboard dependencies using whichever package manager is available.
 * Tries npm first (always available with Node), then pnpm, then yarn.
 * Returns true if installation succeeded.
 */
async function installDashboardDeps(dashboardDir: string): Promise<boolean> {
  // Detect package manager: check lockfiles in dashboard dir, then parent dirs
  const pmConfigs = [
    { cmd: "pnpm", args: ["install", "--prod"], lockfile: "pnpm-lock.yaml" },
    { cmd: "npm", args: ["install", "--production", "--no-audit", "--no-fund"], lockfile: "package-lock.json" },
  ];

  // Check which PM has a lockfile (prefer pnpm > npm)
  let detected: typeof pmConfigs[0] | null = null;
  for (const pm of pmConfigs) {
    // Check dashboard dir and parent dirs for lockfile
    let dir = dashboardDir;
    const root = resolve("/");
    while (dir !== root) {
      if (existsSync(resolve(dir, pm.lockfile))) {
        detected = pm;
        break;
      }
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    if (detected) break;
  }

  // Fall back to npm if no lockfile found
  if (!detected) detected = pmConfigs[1];

  try {
    console.log(`  [dashboard] Running ${detected.cmd} install...`);
    const result = spawnSync(detected.cmd, detected.args, {
      cwd: dashboardDir,
      encoding: "utf-8",
      timeout: 120000,
      stdio: ["pipe", "pipe", "pipe"],
      shell: process.platform === "win32",
    });

    if (result.status === 0) {
      console.log("  [dashboard] Dependencies installed successfully.");
      return true;
    }

    if (result.stderr) {
      const errLines = result.stderr.trim().split("\n").slice(0, 5).join("\n");
      console.error(`  [dashboard] ${detected.cmd} install failed:\n${errLines}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  [dashboard] ${detected.cmd} install error: ${msg}`);
  }

  console.error("  [dashboard] Could not install dependencies.");
  return false;
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
      const resolved = await resolveNextBinary(dashboardDir, packageRoot);

      // Use --webpack: Turbopack crashes when resolving modules from
      // pnpm's content-addressable store / nested node_modules layout
      dashboardProcess = spawn(resolved.command, [...resolved.args, "dev", "--webpack", "-p", String(dashboardPort)], {
        cwd: dashboardDir,
        env: {
          ...process.env,
          NEXT_PUBLIC_ORIGIN_URL: `http://localhost:${port}`,
          PORT: String(dashboardPort),
        },
        stdio: "pipe",
        // When using npx or a PATH-resolved command, we need shell on Windows
        shell: resolved.shell,
      });

      dashboardProcess.stdout?.on("data", (d: Buffer) => {
        const text = String(d).trim();
        if (text) process.stdout.write(`  [dashboard] ${text}\n`);
      });
      dashboardProcess.stderr?.on("data", (d: Buffer) => {
        const text = String(d).trim();
        if (text) process.stderr.write(`  [dashboard] ${text}\n`);
      });

      dashboardProcess.on("error", (err: Error) => {
        console.error(`  [dashboard] Failed to start: ${err.message}`);
      });

      console.log(`  dashboard    → http://localhost:${dashboardPort}`);
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
      // Force kill after 2s if it doesn't exit
      const killTimer = setTimeout(() => {
        if (dashboardProcess && !dashboardProcess.killed) {
          dashboardProcess.kill("SIGKILL");
        }
      }, 2000);
      await new Promise<void>((r) => {
        if (dashboardProcess) dashboardProcess.on("exit", () => r());
        else r();
      });
      clearTimeout(killTimer);
    }
    await new Promise<void>((resolve) => server.close(() => resolve()));
    console.log("[shutdown] Done.");
    process.exit(0);
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
