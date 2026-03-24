import { EventEmitter } from "node:events";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const MAX_LOG_LINES = 500;

// Resolve the package root (server/) from this source file's location.
// Works both in dev (src/) and published (dist/).
const __dirname_compat = typeof import.meta.dirname === "string"
  ? import.meta.dirname
  : dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(__dirname_compat, "..");

export interface SimulatorModel {
  id: string;
  name: string;
  type: "quadruped" | "humanoid" | "arm" | "generic";
  description: string;
}

export const AVAILABLE_MODELS: SimulatorModel[] = [
  { id: "unitree_go2", name: "Unitree Go2", type: "quadruped", description: "12-DOF quadruped robot" },
  { id: "unitree_g1", name: "Unitree G1", type: "humanoid", description: "23-DOF humanoid robot" },
  { id: "unitree_h1", name: "Unitree H1", type: "humanoid", description: "Full-size humanoid robot" },
  { id: "anymal_c", name: "ANYmal C", type: "quadruped", description: "Industrial quadruped robot" },
  { id: "shadow_hand", name: "Shadow Hand", type: "arm", description: "Dexterous robotic hand" },
];

export interface RunningSimulator {
  model: string;
  deviceId: string;
  process: ChildProcess;
  status: "starting" | "running" | "stopping" | "stopped" | "error";
  error?: string;
  startedAt: Date;
  logs: string[];
  headless: boolean;
  hz: number;
}

export interface LaunchOptions {
  deviceId?: string;
  headless?: boolean;
  hz?: number;
}

export class SimulatorManager extends EventEmitter {
  private running: Map<string, RunningSimulator> = new Map();
  private tcpPort: number;
  private simulatorsDir: string;

  constructor(tcpPort: number, simulatorsDir?: string) {
    super();
    this.tcpPort = tcpPort;
    // Resolution order for simulators directory:
    // 1. Explicit path passed in (from config or CLI)
    // 2. Bundled with the package at server/simulators/
    // 3. Sibling to the package at ../simulators/ (dev/monorepo)
    if (simulatorsDir) {
      this.simulatorsDir = resolve(simulatorsDir);
    } else {
      const bundled = join(PACKAGE_ROOT, "simulators");
      const sibling = resolve(PACKAGE_ROOT, "..", "simulators");
      this.simulatorsDir = existsSync(bundled) ? bundled : sibling;
    }
  }

  getAvailableModels(): SimulatorModel[] {
    return AVAILABLE_MODELS;
  }

  getSimulatorsDir(): string {
    return this.simulatorsDir;
  }

  async launch(model: string, opts: LaunchOptions = {}): Promise<RunningSimulator> {
    const deviceId = opts.deviceId ?? model.replace(/_/g, "-");

    if (this.running.has(deviceId)) {
      throw new Error(`Simulator for '${deviceId}' is already running`);
    }

    const headless = opts.headless ?? true;
    const hz = opts.hz ?? 30;

    const args = [
      "-m", "simulators.mujoco",
      "--model", model,
      "--server", `localhost:${this.tcpPort}`,
      "--device-id", deviceId,
      "--hz", String(hz),
    ];
    if (headless) {
      args.push("--headless");
    }

    const sim: RunningSimulator = {
      model,
      deviceId,
      process: null!,
      status: "starting",
      startedAt: new Date(),
      logs: [],
      headless,
      hz,
    };

    const addLog = (data: Buffer | string) => {
      const lines = String(data).split("\n").filter((l) => l.trim());
      for (const line of lines) {
        sim.logs.push(line);
        if (sim.logs.length > MAX_LOG_LINES) {
          sim.logs.shift();
        }
      }
    };

    // The cwd for python must be the parent of "simulators/" so that
    // `python -m simulators.mujoco` resolves the package correctly.
    const pythonCwd = resolve(this.simulatorsDir, "..");
    let venvBin = this.findVenvBin();

    // Auto-setup: create venv and install deps if no venv exists,
    // or if the venv is missing required packages
    if (!venvBin) {
      addLog("[simulator] No Python venv found — setting up automatically...");
      venvBin = await this.setupVenv(addLog);
    } else if (!this.venvHasRequiredPackages(venvBin)) {
      addLog("[simulator] Venv exists but missing packages — installing...");
      await this.installDepsInVenv(venvBin, addLog);
    }

    let pythonExe: string;
    if (venvBin && !headless && existsSync(join(venvBin, "mjpython"))) {
      pythonExe = join(venvBin, "mjpython");
    } else if (venvBin && existsSync(join(venvBin, "python3"))) {
      pythonExe = join(venvBin, "python3");
    } else {
      pythonExe = "python3";
    }

    const proc = spawn(pythonExe, args, {
      cwd: pythonCwd,
      env: { ...process.env },
      stdio: "pipe",
    });

    sim.process = proc;
    this.running.set(deviceId, sim);

    proc.stdout?.on("data", (d) => addLog(d));
    proc.stderr?.on("data", (d) => addLog(d));

    proc.on("exit", (code) => {
      addLog(`Process exited with code ${code}`);
      if (sim.status === "running" || sim.status === "starting") {
        sim.status = "error";
        sim.error = `Exited with code ${code}`;
        this.emit("simulator:error", { deviceId, error: sim.error });
      }
    });

    sim.status = "running";
    this.emit("simulator:launched", { deviceId, model });

    return sim;
  }

  async stop(deviceId: string): Promise<void> {
    const sim = this.running.get(deviceId);
    if (!sim) throw new Error(`No simulator running for '${deviceId}'`);

    sim.status = "stopping";

    if (sim.process && !sim.process.killed) {
      sim.process.kill("SIGTERM");
      setTimeout(() => {
        if (sim.process && !sim.process.killed) {
          sim.process.kill("SIGKILL");
        }
      }, 5000);
    }

    sim.status = "stopped";
    this.running.delete(deviceId);
    this.emit("simulator:stopped", { deviceId });
  }

  async shutdown(): Promise<void> {
    const ids = Array.from(this.running.keys());
    for (const id of ids) {
      try {
        await this.stop(id);
      } catch {}
    }
  }

  listRunning(): RunningSimulator[] {
    return Array.from(this.running.values());
  }

  getRunning(deviceId: string): RunningSimulator | null {
    return this.running.get(deviceId) ?? null;
  }

  getLogs(deviceId: string, lines?: number): string[] {
    const sim = this.running.get(deviceId);
    if (!sim) return [];
    const logs = sim.logs;
    if (lines && lines < logs.length) {
      return logs.slice(-lines);
    }
    return [...logs];
  }

  /**
   * Auto-create a Python venv and install mujoco dependencies.
   * The venv is created at simulators/mujoco/.venv/
   */
  private async setupVenv(log: (msg: string) => void): Promise<string | null> {
    const venvDir = join(this.simulatorsDir, "mujoco", ".venv");
    const venvBin = join(venvDir, "bin");
    const requirementsFile = join(this.simulatorsDir, "mujoco", "requirements.txt");

    // Step 1: Create the venv
    log("[simulator] Creating Python virtual environment...");
    const createResult = spawnSync("python3", ["-m", "venv", venvDir], {
      encoding: "utf-8",
      timeout: 30000,
      stdio: ["pipe", "pipe", "pipe"],
    });

    if (createResult.status !== 0) {
      const err = createResult.stderr?.trim() || `exit code ${createResult.status}`;
      log(`[simulator] Failed to create venv: ${err}`);
      return null;
    }

    // Step 2: Install requirements
    const pip = join(venvBin, "pip");
    if (!existsSync(pip)) {
      log("[simulator] pip not found in venv — cannot install dependencies");
      return null;
    }

    if (existsSync(requirementsFile)) {
      log("[simulator] Installing dependencies (mujoco, numpy)... this may take a minute.");
      const installResult = spawnSync(pip, ["install", "-r", requirementsFile], {
        encoding: "utf-8",
        timeout: 300000, // 5 min — mujoco is a large package
        stdio: ["pipe", "pipe", "pipe"],
      });

      if (installResult.status !== 0) {
        const err = installResult.stderr?.trim().split("\n").slice(-3).join("\n") || `exit code ${installResult.status}`;
        log(`[simulator] pip install failed:\n${err}`);
        return null;
      }
    } else {
      // Fallback: install known deps directly
      log("[simulator] No requirements.txt found — installing mujoco and numpy directly...");
      const installResult = spawnSync(pip, ["install", "mujoco", "numpy"], {
        encoding: "utf-8",
        timeout: 300000,
        stdio: ["pipe", "pipe", "pipe"],
      });

      if (installResult.status !== 0) {
        const err = installResult.stderr?.trim().split("\n").slice(-3).join("\n") || `exit code ${installResult.status}`;
        log(`[simulator] pip install failed:\n${err}`);
        return null;
      }
    }

    log("[simulator] Dependencies installed successfully.");

    if (existsSync(join(venvBin, "python3"))) {
      return venvBin;
    }
    return null;
  }

  /**
   * Check if the venv has all required packages by trying to import them.
   */
  private venvHasRequiredPackages(venvBin: string): boolean {
    const python = join(venvBin, "python3");
    if (!existsSync(python)) return false;

    const result = spawnSync(python, [
      "-c",
      "import mujoco; import numpy; import robot_descriptions",
    ], {
      encoding: "utf-8",
      timeout: 10000,
      stdio: ["pipe", "pipe", "pipe"],
    });

    return result.status === 0;
  }

  /**
   * Install requirements into an existing venv.
   */
  private async installDepsInVenv(venvBin: string, log: (msg: string) => void): Promise<void> {
    const pip = join(venvBin, "pip");
    if (!existsSync(pip)) {
      log("[simulator] pip not found in venv — cannot install dependencies");
      return;
    }

    const requirementsFile = join(this.simulatorsDir, "mujoco", "requirements.txt");

    if (existsSync(requirementsFile)) {
      log("[simulator] Installing missing dependencies from requirements.txt...");
      const installResult = spawnSync(pip, ["install", "-r", requirementsFile], {
        encoding: "utf-8",
        timeout: 300000,
        stdio: ["pipe", "pipe", "pipe"],
      });

      if (installResult.status !== 0) {
        const err = installResult.stderr?.trim().split("\n").slice(-3).join("\n") || `exit code ${installResult.status}`;
        log(`[simulator] pip install failed:\n${err}`);
        return;
      }
    } else {
      log("[simulator] Installing mujoco, numpy, robot_descriptions...");
      const installResult = spawnSync(pip, ["install", "mujoco", "numpy", "robot_descriptions"], {
        encoding: "utf-8",
        timeout: 300000,
        stdio: ["pipe", "pipe", "pipe"],
      });

      if (installResult.status !== 0) {
        const err = installResult.stderr?.trim().split("\n").slice(-3).join("\n") || `exit code ${installResult.status}`;
        log(`[simulator] pip install failed:\n${err}`);
        return;
      }
    }

    log("[simulator] Dependencies installed successfully.");
  }

  private findVenvBin(): string | null {
    const candidates = [
      // Bundled venv (if user ran origin setup-simulator)
      join(this.simulatorsDir, "mujoco", ".venv", "bin"),
    ];

    // If in a git worktree, also check the main repo
    const worktreeMarker = ".claude/worktrees/";
    const idx = this.simulatorsDir.indexOf(worktreeMarker);
    if (idx !== -1) {
      const mainRoot = this.simulatorsDir.substring(0, idx);
      candidates.push(join(mainRoot, "simulators", "mujoco", ".venv", "bin"));
    }

    // Also check sibling simulators dir (monorepo dev)
    const siblingVenv = resolve(PACKAGE_ROOT, "..", "simulators", "mujoco", ".venv", "bin");
    if (!candidates.includes(siblingVenv)) {
      candidates.push(siblingVenv);
    }

    for (const candidate of candidates) {
      if (existsSync(join(candidate, "python3"))) {
        return candidate;
      }
    }
    return null;
  }
}
