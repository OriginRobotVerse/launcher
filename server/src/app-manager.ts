import { EventEmitter } from "node:events";
import { spawn, type ChildProcess, execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, lstatSync, symlinkSync, mkdirSync, rmSync } from "node:fs";
import { resolve, join, basename } from "node:path";
import type {
  StorageAdapter,
  AppManifest,
  InstalledApp,
  RunningApp,
  CompatResult,
  DeviceManifest,
  StoredApp,
} from "./types.js";

const MAX_LOG_LINES = 500;

/** Normalise an app ID: lowercase, trim, replace spaces/underscores with hyphens, collapse repeats, strip non-alphanumeric edges. */
export function normalizeAppId(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")   // spaces & underscores → hyphens
    .replace(/-{2,}/g, "-")    // collapse consecutive hyphens
    .replace(/^-|-$/g, "");    // strip leading/trailing hyphens
}

export class AppManager extends EventEmitter {
  private storage: StorageAdapter;
  private appsDir: string;
  private installed: Map<string, InstalledApp> = new Map();
  private running: Map<string, RunningApp> = new Map();

  constructor(storage: StorageAdapter, appsDir: string) {
    super();
    this.storage = storage;
    this.appsDir = resolve(appsDir);

    // Ensure apps directory exists
    if (!existsSync(this.appsDir)) {
      mkdirSync(this.appsDir, { recursive: true });
    }
  }

  // --- Scan ---

  async scan(): Promise<void> {
    // Load from storage
    const storedApps = await this.storage.listApps();
    for (const stored of storedApps) {
      stored.manifest.id = normalizeAppId(stored.manifest.id);
      const secrets = await this.storage.getAppSecrets(stored.manifest.id);
      this.installed.set(stored.manifest.id, {
        manifest: stored.manifest,
        installPath: stored.installPath,
        installedAt: stored.installedAt,
        secrets,
      });
    }

    // Also scan the apps directory for any not yet in storage
    if (!existsSync(this.appsDir)) return;

    const entries = readdirSync(this.appsDir);
    for (const entry of entries) {
      const entryPath = resolve(this.appsDir, entry);
      // Follow symlinks
      let realPath = entryPath;
      try {
        if (lstatSync(entryPath).isSymbolicLink()) {
          realPath = resolve(entryPath);
        }
      } catch { continue; }

      const manifestPath = join(realPath, "origin-app.json");
      if (!existsSync(manifestPath)) continue;

      try {
        const manifest = JSON.parse(readFileSync(manifestPath, "utf-8")) as AppManifest;
        manifest.id = normalizeAppId(manifest.id);
        if (this.installed.has(manifest.id)) continue;

        const secrets = await this.storage.getAppSecrets(manifest.id);
        const app: InstalledApp = {
          manifest,
          installPath: realPath,
          installedAt: new Date().toISOString(),
          secrets,
        };
        this.installed.set(manifest.id, app);
        await this.storage.setApp(manifest.id, {
          manifest,
          installPath: realPath,
          installedAt: app.installedAt,
        });
      } catch (err) {
        console.error(`[apps] Failed to read manifest at ${manifestPath}:`, err);
      }
    }
  }

  // --- Install ---

  async install(source: string, opts?: { name?: string }): Promise<InstalledApp> {
    let installPath: string;

    if (source.startsWith("https://github.com/") || source.startsWith("git@")) {
      // Git clone
      const repoName = opts?.name ?? basename(source).replace(/\.git$/, "");
      installPath = resolve(this.appsDir, repoName);
      if (existsSync(installPath)) {
        throw new Error(`App directory already exists: ${installPath}`);
      }
      execSync(`git clone "${source}" "${installPath}"`, { stdio: "pipe" });
    } else if (source.startsWith("http://") || source.startsWith("https://")) {
      // Tarball URL
      const name = opts?.name ?? "app-" + Date.now();
      installPath = resolve(this.appsDir, name);
      mkdirSync(installPath, { recursive: true });
      execSync(`curl -sL ${source} | tar xz -C ${installPath} --strip-components=1`, { stdio: "pipe" });
    } else {
      // Local path — symlink into apps dir
      const absSource = resolve(source);
      if (!existsSync(absSource)) {
        throw new Error(`Source path does not exist: ${absSource}`);
      }
      const name = opts?.name ?? basename(absSource);
      installPath = resolve(this.appsDir, name);
      if (!existsSync(installPath)) {
        symlinkSync(absSource, installPath);
      }
      installPath = absSource; // Use the actual path for running
    }

    // Read and validate manifest
    const manifestPath = join(installPath, "origin-app.json");
    if (!existsSync(manifestPath)) {
      throw new Error(`No origin-app.json found in ${installPath}`);
    }

    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8")) as AppManifest;
    if (!manifest.id || !manifest.name || !manifest.runtime) {
      throw new Error("Invalid origin-app.json: missing id, name, or runtime");
    }

    // Override ID if name provided, then normalise
    if (opts?.name) {
      manifest.id = opts.name;
    }
    manifest.id = normalizeAppId(manifest.id);

    // Run setup/install/build commands (non-fatal — warn on failure)
    const runCmd = (label: string, cmd: string) => {
      try {
        execSync(cmd, { cwd: installPath, stdio: "pipe" });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`  ⚠ ${label} failed (skipping): ${msg.split("\n")[0]}`);
      }
    };

    if (manifest.setup) {
      runCmd("Setup", manifest.setup);
    }
    if (manifest.runtime.setupCmd) {
      runCmd("Frontend setup", manifest.runtime.setupCmd);
    }
    if (manifest.backend?.setupCmd) {
      runCmd("Backend setup", manifest.backend.setupCmd);
    }
    if (manifest.backend?.installCmd) {
      runCmd("Backend install", manifest.backend.installCmd);
    }
    if (manifest.runtime.buildCmd) {
      runCmd("Build", manifest.runtime.buildCmd);
    }

    const secrets = await this.storage.getAppSecrets(manifest.id);
    const app: InstalledApp = {
      manifest,
      installPath,
      installedAt: new Date().toISOString(),
      secrets,
    };

    this.installed.set(manifest.id, app);
    await this.storage.setApp(manifest.id, {
      manifest,
      installPath,
      installedAt: app.installedAt,
    });

    this.emit("app:installed", app);
    return app;
  }

  // --- Uninstall ---

  async uninstall(appId: string): Promise<void> {
    // Stop if running
    if (this.running.has(appId)) {
      await this.stop(appId);
    }

    const app = this.installed.get(appId);
    if (!app) throw new Error(`App '${appId}' is not installed`);

    // Remove the entry from the apps dir
    // If it's a symlink, only remove the symlink — never the target
    const appsEntry = resolve(this.appsDir, basename(app.installPath));
    if (existsSync(appsEntry)) {
      try {
        if (lstatSync(appsEntry).isSymbolicLink()) {
          // Only remove the symlink, not the target directory
          rmSync(appsEntry);
        } else {
          // It's a cloned/extracted dir — safe to delete entirely
          rmSync(appsEntry, { recursive: true, force: true });
        }
      } catch {}
    }

    this.installed.delete(appId);
    await this.storage.removeApp(appId);
    this.emit("app:uninstalled", appId);
  }

  // --- Launch ---

  async launch(appId: string, deviceId: string, mode: "dev" | "prod" = "dev"): Promise<RunningApp> {
    const app = this.installed.get(appId);
    if (!app) throw new Error(`App '${appId}' is not installed`);

    if (this.running.has(appId)) {
      throw new Error(`App '${appId}' is already running`);
    }

    // Check secrets
    const secretStatus = await this.getSecretStatus(appId);
    const missing = secretStatus.filter((s) => s.required && !s.configured);
    if (missing.length > 0) {
      throw new Error(`Missing required secrets: ${missing.map((s) => s.key).join(", ")}`);
    }

    const manifest = app.manifest;
    const secrets = await this.storage.getAppSecrets(appId);
    const allSecrets = { ...app.secrets, ...secrets };

    // Template variable resolution
    const coreUrl = process.env.ORIGIN_URL ?? "http://localhost:5050";
    const vars: Record<string, string> = {
      "{{origin.url}}": coreUrl,
      "{{device.id}}": deviceId,
      "{{backend.port}}": String(manifest.backend?.port ?? 8000),
      "{{app.port}}": String(manifest.runtime.port),
    };

    const resolveTemplates = (str: string): string => {
      let result = str;
      for (const [key, value] of Object.entries(vars)) {
        result = result.split(key).join(value);
      }
      return result;
    };

    const resolveEnv = (env?: Record<string, string>): Record<string, string> => {
      if (!env) return {};
      const resolved: Record<string, string> = {};
      for (const [key, value] of Object.entries(env)) {
        resolved[key] = resolveTemplates(value);
      }
      return resolved;
    };

    const runningApp: RunningApp = {
      id: appId,
      manifest,
      deviceId,
      frontendProcess: null,
      backendProcess: null,
      frontendUrl: `http://localhost:${manifest.runtime.port}`,
      backendUrl: manifest.backend ? `http://localhost:${manifest.backend.port}` : null,
      status: "starting",
      startedAt: new Date(),
      logs: [],
    };
    this.running.set(appId, runningApp);

    const addLog = (source: string, data: Buffer | string) => {
      const lines = String(data).split("\n").filter((l) => l.trim());
      for (const line of lines) {
        runningApp.logs.push(`[${source}] ${line}`);
        if (runningApp.logs.length > MAX_LOG_LINES) {
          runningApp.logs.shift();
        }
      }
    };

    try {
      // Start backend if configured
      if (manifest.backend) {
        const backendEnv = {
          ...process.env,
          ...resolveEnv(manifest.backend.env),
          ...allSecrets,
        };

        const backendArgs = (manifest.backend.args ?? []).map(resolveTemplates);
        const backendProcess = spawn(
          manifest.backend.type === "python" ? "python3" : "node",
          [manifest.backend.entry, ...backendArgs],
          {
            cwd: app.installPath,
            env: backendEnv,
            stdio: "pipe",
          },
        );

        runningApp.backendProcess = backendProcess;
        backendProcess.stdout?.on("data", (d) => addLog("backend", d));
        backendProcess.stderr?.on("data", (d) => addLog("backend", d));
        backendProcess.on("exit", (code) => {
          addLog("backend", `Process exited with code ${code}`);
          if (runningApp.status === "running") {
            runningApp.status = "error";
            runningApp.error = `Backend exited with code ${code}`;
          }
        });

        // Wait for health check
        if (manifest.backend.healthCheck) {
          await this.waitForHealthCheck(
            `http://localhost:${manifest.backend.port}${manifest.backend.healthCheck}`,
            30000,
          );
        }
      }

      // Start frontend
      const cmd = mode === "dev"
        ? (manifest.runtime.devCmd ?? "npm run dev")
        : (manifest.runtime.startCmd ?? "npm start");

      const [frontendCmd, ...frontendArgs] = cmd.split(" ");
      const frontendEnv: Record<string, string | undefined> = {
        ...process.env,
        ...resolveEnv(manifest.runtime.env),
        ...allSecrets,
        PORT: String(manifest.runtime.port),
      };

      // If backend exists, inject its URL
      if (manifest.backend?.env) {
        for (const [key, value] of Object.entries(manifest.backend.env)) {
          frontendEnv[key] = resolveTemplates(value);
        }
      }

      const frontendProcess = spawn(frontendCmd, frontendArgs, {
        cwd: app.installPath,
        env: frontendEnv,
        stdio: "pipe",
        shell: true,
      });

      runningApp.frontendProcess = frontendProcess;
      frontendProcess.stdout?.on("data", (d) => addLog("frontend", d));
      frontendProcess.stderr?.on("data", (d) => addLog("frontend", d));
      frontendProcess.on("exit", (code) => {
        addLog("frontend", `Process exited with code ${code}`);
        if (runningApp.status === "running") {
          runningApp.status = "error";
          runningApp.error = `Frontend exited with code ${code}`;
        }
      });

      // Wait for frontend health check
      if (manifest.runtime.healthCheck) {
        await this.waitForHealthCheck(
          `http://localhost:${manifest.runtime.port}${manifest.runtime.healthCheck}`,
          30000,
        );
      } else {
        // Just wait for the port to be available
        await this.waitForPort(manifest.runtime.port, 30000);
      }

      runningApp.status = "running";
      this.emit("app:launched", runningApp);
      return runningApp;
    } catch (err) {
      runningApp.status = "error";
      runningApp.error = err instanceof Error ? err.message : String(err);
      // Kill any spawned processes
      runningApp.backendProcess?.kill();
      runningApp.frontendProcess?.kill();
      this.emit("app:error", { appId, error: runningApp.error });
      throw err;
    }
  }

  // --- Stop ---

  async stop(appId: string): Promise<void> {
    const running = this.running.get(appId);
    if (!running) throw new Error(`App '${appId}' is not running`);

    running.status = "stopping";

    // Kill processes
    if (running.frontendProcess && !running.frontendProcess.killed) {
      running.frontendProcess.kill("SIGTERM");
      // Force kill after 5s
      setTimeout(() => {
        if (running.frontendProcess && !running.frontendProcess.killed) {
          running.frontendProcess.kill("SIGKILL");
        }
      }, 5000);
    }

    if (running.backendProcess && !running.backendProcess.killed) {
      running.backendProcess.kill("SIGTERM");
      setTimeout(() => {
        if (running.backendProcess && !running.backendProcess.killed) {
          running.backendProcess.kill("SIGKILL");
        }
      }, 5000);
    }

    running.status = "stopped";
    this.running.delete(appId);
    this.emit("app:stopped", appId);
  }

  // --- Shutdown ---

  async shutdown(): Promise<void> {
    const ids = Array.from(this.running.keys());
    for (const id of ids) {
      try {
        await this.stop(id);
      } catch {}
    }
  }

  // --- Queries ---

  listInstalled(): InstalledApp[] {
    return Array.from(this.installed.values());
  }

  listRunning(): RunningApp[] {
    return Array.from(this.running.values());
  }

  getInstalled(appId: string): InstalledApp | null {
    return this.installed.get(appId) ?? null;
  }

  getRunning(appId: string): RunningApp | null {
    return this.running.get(appId) ?? null;
  }

  getAppLogs(appId: string, lines?: number): string[] {
    const running = this.running.get(appId);
    if (!running) return [];
    const logs = running.logs;
    if (lines && lines < logs.length) {
      return logs.slice(-lines);
    }
    return [...logs];
  }

  // --- Compatibility ---

  checkCompatibility(appId: string, deviceManifest: DeviceManifest): CompatResult {
    const app = this.installed.get(appId);
    if (!app) return { compatible: false, missingActions: [], missingState: [], warnings: ["App not installed"] };

    const appDevice = app.manifest.device;
    const missingActions: string[] = [];
    const missingState: string[] = [];
    const warnings: string[] = [];

    // Check required actions
    if (appDevice.requiredActions) {
      for (const action of appDevice.requiredActions) {
        if (!deviceManifest.actions.includes(action)) {
          missingActions.push(action);
        }
      }
    }

    // Check required state
    if (appDevice.requiredState) {
      const deviceStateKeys = deviceManifest.state.map((s) => s.key);
      for (const key of appDevice.requiredState) {
        if (!deviceStateKeys.includes(key)) {
          missingState.push(key);
        }
      }
    }

    // Check optional (warnings only)
    if (appDevice.optionalActions) {
      for (const action of appDevice.optionalActions) {
        if (!deviceManifest.actions.includes(action)) {
          warnings.push(`Optional action '${action}' not available`);
        }
      }
    }

    return {
      compatible: missingActions.length === 0 && missingState.length === 0,
      missingActions,
      missingState,
      warnings,
    };
  }

  // --- Secrets ---

  async setSecrets(appId: string, secrets: Record<string, string>): Promise<void> {
    const app = this.installed.get(appId);
    if (!app) throw new Error(`App '${appId}' is not installed`);

    await this.storage.setAppSecrets(appId, secrets);
    app.secrets = { ...app.secrets, ...secrets };
  }

  async getSecretStatus(appId: string): Promise<Array<{ key: string; description: string; configured: boolean; required: boolean }>> {
    const app = this.installed.get(appId);
    if (!app) return [];

    const secrets = await this.storage.getAppSecrets(appId);
    const manifestSecrets = app.manifest.secrets ?? [];

    return manifestSecrets.map((s) => ({
      key: s.key,
      description: s.description,
      required: s.required,
      configured: Boolean(secrets[s.key] || app.secrets[s.key]),
    }));
  }

  // --- Private helpers ---

  private async waitForHealthCheck(url: string, timeoutMs: number): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const res = await fetch(url);
        if (res.ok) return;
      } catch {
        // Server not ready yet
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    throw new Error(`Health check timeout: ${url}`);
  }

  private async waitForPort(port: number, timeoutMs: number): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const res = await fetch(`http://localhost:${port}`);
        // Any response means the port is listening
        return;
      } catch (err: any) {
        if (err.cause?.code !== "ECONNREFUSED") {
          // Some other response — port is up
          return;
        }
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    throw new Error(`Port ${port} did not become available within ${timeoutMs}ms`);
  }
}
