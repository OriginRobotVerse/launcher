import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { resolve, extname } from "node:path";
import type { DeviceManager } from "./device-manager.js";
import type { AppManager } from "./app-manager.js";
import type { SimulatorManager } from "./simulator-manager.js";
import type { SSEManager } from "./sse.js";
import type { WebhookManager } from "./webhooks.js";
import type { ActionRequest, WebhookRegistration, StorageAdapter, DeviceProfile } from "./types.js";
import { resolveProfile, BUILTIN_PROFILES } from "./device-profiles.js";

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain",
  ".map": "application/json",
};

interface ServerOptions {
  port: number;
  deviceManager: DeviceManager;
  appManager: AppManager;
  simulatorManager?: SimulatorManager;
  sseManager: SSEManager;
  webhookManager: WebhookManager;
  authCheck: (req: IncomingMessage, res: ServerResponse) => boolean;
  storage: StorageAdapter;
  /** Path to the pre-built dashboard (dashboard/out/) — if set, serves static files */
  dashboardDir?: string;
}

function parseUrl(url: string): { path: string; query: Record<string, string> } {
  const [path, queryString] = url.split("?");
  const query: Record<string, string> = {};
  if (queryString) {
    for (const part of queryString.split("&")) {
      const [k, v] = part.split("=");
      if (k) query[decodeURIComponent(k)] = decodeURIComponent(v ?? "");
    }
  }
  return { path: path ?? "/", query };
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function json(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify(data));
}

function notFound(res: ServerResponse): void {
  json(res, 404, { error: "Not found" });
}

function cors(res: ServerResponse): void {
  res.writeHead(204, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  });
  res.end();
}

// Route pattern: /devices/:id/...
function matchDeviceRoute(
  path: string,
): { id: string; rest: string } | null {
  const match = path.match(/^\/devices\/([^/]+)(\/.*)?$/);
  if (!match) return null;
  return { id: match[1], rest: match[2] ?? "" };
}

const startTime = Date.now();

/**
 * Serve a static file from the dashboard directory.
 * Returns true if a file was served, false otherwise.
 */
function serveDashboardFile(
  res: ServerResponse,
  dashboardDir: string,
  urlPath: string,
): boolean {
  // Resolve the file path and ensure it's within the dashboard directory
  // (prevents path traversal attacks)
  const safePath = urlPath.replace(/\.\./g, "").replace(/\/\//g, "/");
  const filePath = resolve(dashboardDir, safePath.startsWith("/") ? safePath.slice(1) : safePath);

  if (!filePath.startsWith(dashboardDir)) return false;

  // Try exact file
  if (existsSync(filePath) && statSync(filePath).isFile()) {
    serveStaticFile(res, filePath);
    return true;
  }

  // Try path/index.html (for directory-like URLs e.g. /apps → /apps/index.html)
  const indexPath = resolve(filePath, "index.html");
  if (existsSync(indexPath) && statSync(indexPath).isFile()) {
    serveStaticFile(res, indexPath);
    return true;
  }

  return false;
}

function serveStaticFile(res: ServerResponse, filePath: string): void {
  const ext = extname(filePath);
  const contentType = MIME_TYPES[ext] ?? "application/octet-stream";
  const headers: Record<string, string> = {
    "Content-Type": contentType,
    "Access-Control-Allow-Origin": "*",
  };

  // Immutable cache for hashed assets (_next/static/...)
  if (filePath.includes("/_next/static/")) {
    headers["Cache-Control"] = "public, max-age=31536000, immutable";
  }

  const content = readFileSync(filePath);
  res.writeHead(200, headers);
  res.end(content);
}

export function createOriginServer(opts: ServerOptions) {
  const { deviceManager, appManager, simulatorManager, sseManager, webhookManager, authCheck, storage } = opts;

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const method = req.method ?? "GET";
    const { path, query } = parseUrl(req.url ?? "/");

    // CORS preflight
    if (method === "OPTIONS") {
      cors(res);
      return;
    }

    // Auth check
    if (!authCheck(req, res)) return;

    try {
      // --- Server info (moved from / to /api/info so root serves dashboard) ---
      if ((path === "/api/info" || path === "/api/health") && method === "GET") {
        json(res, 200, {
          name: "origin-server",
          version: "0.6.0",
          uptime: Math.floor((Date.now() - startTime) / 1000),
          deviceCount: deviceManager.getDeviceIds().length,
        });
        return;
      }

      // --- Status ---
      if (path === "/api/status" && method === "GET") {
        const devices = deviceManager.listDevices().map((d) => {
          const detail = deviceManager.getDeviceDetail(d.id);
          return {
            id: d.id,
            type: BUILTIN_PROFILES[d.id]?.type ?? "generic",
            displayName: BUILTIN_PROFILES[d.id]?.displayName ?? d.id,
            connected: true,
            stateKeyCount: detail?.manifest.state.length ?? 0,
            actionCount: d.actions.length,
          };
        });

        const runningApps = appManager.listRunning().map((r) => ({
          id: r.id,
          name: r.manifest.name,
          deviceId: r.deviceId,
          frontendUrl: r.frontendUrl,
          backendUrl: r.backendUrl ?? undefined,
          status: r.status,
          uptime: Math.floor((Date.now() - r.startedAt.getTime()) / 1000),
        }));

        const runningSimulators = simulatorManager ? simulatorManager.listRunning().map((s) => ({
          model: s.model,
          deviceId: s.deviceId,
          status: s.status,
          headless: s.headless,
          hz: s.hz,
          uptime: Math.floor((Date.now() - s.startedAt.getTime()) / 1000),
        })) : [];

        json(res, 200, {
          version: "0.2.0",
          uptime: Math.floor((Date.now() - startTime) / 1000),
          coreUrl: `http://localhost:${opts.port}`,
          dashboardUrl: `http://localhost:${(opts.port ?? 5050) + 1}`,
          devices,
          apps: {
            installed: appManager.listInstalled().length,
            running: runningApps,
          },
          simulators: {
            running: runningSimulators,
          },
        });
        return;
      }

      // --- Discover ---
      if (path === "/discover" && method === "POST") {
        const result = await deviceManager.discover();
        json(res, 200, result);
        return;
      }

      // --- Port statuses ---
      if (path === "/ports" && method === "GET") {
        json(res, 200, deviceManager.getPortStatuses());
        return;
      }

      // --- Devices list ---
      if (path === "/devices" && method === "GET") {
        json(res, 200, deviceManager.listDevices());
        return;
      }

      // --- Global SSE ---
      if (path === "/events" && method === "GET") {
        sseManager.addConnection(res, null);
        return;
      }

      // --- Webhooks ---
      if (path === "/webhooks") {
        if (method === "GET") {
          json(res, 200, await webhookManager.list());
          return;
        }
        if (method === "POST") {
          const body = await readBody(req);
          let registration: WebhookRegistration;
          try {
            registration = JSON.parse(body);
          } catch {
            json(res, 400, { error: "Invalid JSON" });
            return;
          }
          if (!registration.url) {
            json(res, 400, { error: "url is required" });
            return;
          }
          const webhook = await webhookManager.register(registration);
          json(res, 201, webhook);
          return;
        }
      }

      // --- Webhook delete ---
      const webhookDelete = path.match(/^\/webhooks\/([^/]+)$/);
      if (webhookDelete && method === "DELETE") {
        const removed = await webhookManager.remove(webhookDelete[1]);
        if (removed) {
          json(res, 200, { ok: true });
        } else {
          notFound(res);
        }
        return;
      }

      // ============================================
      // NEW: App routes — /api/apps/*
      // ============================================

      // GET /api/apps — list installed apps
      if (path === "/api/apps" && method === "GET") {
        const installed = appManager.listInstalled();
        const apps = await Promise.all(installed.map(async (app) => {
          const running = appManager.getRunning(app.manifest.id);
          const secretStatus = await appManager.getSecretStatus(app.manifest.id);
          return {
            id: app.manifest.id,
            name: app.manifest.name,
            version: app.manifest.version,
            author: app.manifest.author,
            description: app.manifest.description,
            icon: app.manifest.icon,
            deviceType: app.manifest.device.type,
            running: running !== null,
            runningDeviceId: running?.deviceId,
            frontendUrl: running?.frontendUrl,
            secretsConfigured: secretStatus.every((s) => !s.required || s.configured),
            source: app.source,
          };
        }));
        json(res, 200, { apps });
        return;
      }

      // POST /api/apps/install — install an app
      if (path === "/api/apps/install" && method === "POST") {
        const body = await readBody(req);
        let req_body: { source: string; name?: string };
        try {
          req_body = JSON.parse(body);
        } catch {
          json(res, 400, { error: "Invalid JSON" });
          return;
        }
        if (!req_body.source) {
          json(res, 400, { error: "source is required" });
          return;
        }
        try {
          const app = await appManager.install(req_body.source, { name: req_body.name });
          json(res, 200, {
            ok: true,
            app: { id: app.manifest.id, name: app.manifest.name, version: app.manifest.version },
          });
        } catch (err) {
          json(res, 400, { error: err instanceof Error ? err.message : String(err) });
        }
        return;
      }

      // POST /api/apps/scan — rescan apps directory
      if (path === "/api/apps/scan" && method === "POST") {
        await appManager.scan();
        json(res, 200, { ok: true, count: appManager.listInstalled().length });
        return;
      }

      // App-specific routes: /api/apps/:id/*
      const appRoute = path.match(/^\/api\/apps\/([^/]+)(\/.*)?$/);
      if (appRoute && appRoute[1] !== "install" && appRoute[1] !== "scan") {
        const appId = decodeURIComponent(appRoute[1]);
        const appRest = appRoute[2] ?? "";

        const installed = appManager.getInstalled(appId);
        if (!installed) {
          json(res, 404, { error: `App '${appId}' not found` });
          return;
        }

        // GET /api/apps/:id — app detail
        if (appRest === "" && method === "GET") {
          const running = appManager.getRunning(appId);
          const secretStatus = await appManager.getSecretStatus(appId);

          // Build compatibility matrix for all connected devices
          const compatibility: Record<string, any> = {};
          for (const d of deviceManager.listDevices()) {
            const detail = deviceManager.getDeviceDetail(d.id);
            if (detail) {
              compatibility[d.id] = appManager.checkCompatibility(appId, detail.manifest);
            }
          }

          json(res, 200, {
            manifest: installed.manifest,
            installPath: installed.installPath,
            source: installed.source,
            running: running !== null,
            status: running?.status,
            frontendUrl: running?.frontendUrl,
            backendUrl: running?.backendUrl,
            uptime: running ? Math.floor((Date.now() - running.startedAt.getTime()) / 1000) : undefined,
            compatibility,
            secrets: secretStatus,
          });
          return;
        }

        // POST /api/apps/:id/reinstall
        if (appRest === "/reinstall" && method === "POST") {
          try {
            const reinstalled = await appManager.reinstall(appId);
            json(res, 200, {
              ok: true,
              app: { id: reinstalled.manifest.id, name: reinstalled.manifest.name, version: reinstalled.manifest.version },
            });
          } catch (err) {
            json(res, 400, { error: err instanceof Error ? err.message : String(err) });
          }
          return;
        }

        // POST /api/apps/:id/launch
        if (appRest === "/launch" && method === "POST") {
          const body = await readBody(req);
          let req_body: { deviceId: string; mode?: "dev" | "prod" };
          try {
            req_body = JSON.parse(body);
          } catch {
            json(res, 400, { error: "Invalid JSON" });
            return;
          }
          if (!req_body.deviceId) {
            json(res, 400, { error: "deviceId is required" });
            return;
          }
          try {
            const running = await appManager.launch(appId, req_body.deviceId, req_body.mode);
            json(res, 200, {
              ok: true,
              frontendUrl: running.frontendUrl,
              backendUrl: running.backendUrl,
            });
          } catch (err) {
            json(res, 400, { error: err instanceof Error ? err.message : String(err) });
          }
          return;
        }

        // POST /api/apps/:id/stop
        if (appRest === "/stop" && method === "POST") {
          try {
            await appManager.stop(appId);
            json(res, 200, { ok: true });
          } catch (err) {
            json(res, 400, { error: err instanceof Error ? err.message : String(err) });
          }
          return;
        }

        // GET /api/apps/:id/logs
        if (appRest === "/logs" && method === "GET") {
          const lines = parseInt(query.lines ?? "200", 10);
          json(res, 200, {
            appId,
            status: appManager.getRunning(appId)?.status ?? "stopped",
            lines: appManager.getAppLogs(appId, lines),
          });
          return;
        }

        // POST /api/apps/:id/secrets
        if (appRest === "/secrets" && method === "POST") {
          const body = await readBody(req);
          let req_body: { secrets: Record<string, string> };
          try {
            req_body = JSON.parse(body);
          } catch {
            json(res, 400, { error: "Invalid JSON" });
            return;
          }
          try {
            await appManager.setSecrets(appId, req_body.secrets);
            json(res, 200, { ok: true });
          } catch (err) {
            json(res, 400, { error: err instanceof Error ? err.message : String(err) });
          }
          return;
        }

        // DELETE /api/apps/:id — uninstall
        if (appRest === "" && method === "DELETE") {
          try {
            await appManager.uninstall(appId);
            json(res, 200, { ok: true });
          } catch (err) {
            json(res, 400, { error: err instanceof Error ? err.message : String(err) });
          }
          return;
        }

        notFound(res);
        return;
      }

      // ============================================
      // NEW: Profile routes — /api/profiles/*
      // ============================================

      // GET /api/profiles — list all profiles
      if (path === "/api/profiles" && method === "GET") {
        const storedProfiles = await storage.listProfiles();
        // Also include builtin profiles for connected devices
        const allProfiles: DeviceProfile[] = [...storedProfiles];
        for (const deviceId of deviceManager.getDeviceIds()) {
          if (!allProfiles.find((p) => p.deviceId === deviceId)) {
            const detail = deviceManager.getDeviceDetail(deviceId);
            const profile = await resolveProfile(deviceId, storage, detail?.manifest);
            allProfiles.push(profile);
          }
        }
        json(res, 200, allProfiles);
        return;
      }

      // Profile by device ID: /api/profiles/:deviceId
      const profileRoute = path.match(/^\/api\/profiles\/([^/]+)$/);
      if (profileRoute) {
        const deviceId = profileRoute[1];

        // GET
        if (method === "GET") {
          const detail = deviceManager.getDeviceDetail(deviceId);
          const profile = await resolveProfile(deviceId, storage, detail?.manifest);
          json(res, 200, profile);
          return;
        }

        // PUT — save/update
        if (method === "PUT") {
          const body = await readBody(req);
          let profile: DeviceProfile;
          try {
            profile = JSON.parse(body);
          } catch {
            json(res, 400, { error: "Invalid JSON" });
            return;
          }
          profile.deviceId = deviceId;
          await storage.setProfile(deviceId, profile);
          json(res, 200, profile);
          return;
        }

        // DELETE
        if (method === "DELETE") {
          await storage.removeProfile(deviceId);
          json(res, 200, { ok: true });
          return;
        }
      }

      // ============================================
      // NEW: Simulator routes — /api/simulators/*
      // ============================================

      if (simulatorManager) {
        // GET /api/simulators — list models + running
        if (path === "/api/simulators" && method === "GET") {
          const models = simulatorManager.getAvailableModels().map((m) => {
            const running = simulatorManager.listRunning().find((r) => r.model === m.id);
            return {
              ...m,
              running: running !== null && running !== undefined,
              deviceId: running?.deviceId,
              status: running?.status,
              uptime: running ? Math.floor((Date.now() - running.startedAt.getTime()) / 1000) : undefined,
            };
          });
          const running = simulatorManager.listRunning().map((r) => ({
            model: r.model,
            deviceId: r.deviceId,
            status: r.status,
            headless: r.headless,
            hz: r.hz,
            uptime: Math.floor((Date.now() - r.startedAt.getTime()) / 1000),
            startedAt: r.startedAt.toISOString(),
          }));
          json(res, 200, { models, running });
          return;
        }

        // POST /api/simulators/launch
        if (path === "/api/simulators/launch" && method === "POST") {
          const body = await readBody(req);
          let req_body: { model: string; deviceId?: string; headless?: boolean; hz?: number };
          try {
            req_body = JSON.parse(body);
          } catch {
            json(res, 400, { error: "Invalid JSON" });
            return;
          }
          if (!req_body.model) {
            json(res, 400, { error: "model is required" });
            return;
          }
          try {
            const sim = await simulatorManager.launch(req_body.model, {
              deviceId: req_body.deviceId,
              headless: req_body.headless,
              hz: req_body.hz,
            });
            json(res, 200, { ok: true, deviceId: sim.deviceId, model: sim.model });
          } catch (err) {
            json(res, 400, { error: err instanceof Error ? err.message : String(err) });
          }
          return;
        }

        // Simulator-specific routes: /api/simulators/:deviceId/*
        const simRoute = path.match(/^\/api\/simulators\/([^/]+)(\/.*)?$/);
        if (simRoute && simRoute[1] !== "launch") {
          const simDeviceId = simRoute[1];
          const simRest = simRoute[2] ?? "";

          // POST /api/simulators/:deviceId/stop
          if (simRest === "/stop" && method === "POST") {
            try {
              await simulatorManager.stop(simDeviceId);
              json(res, 200, { ok: true });
            } catch (err) {
              json(res, 400, { error: err instanceof Error ? err.message : String(err) });
            }
            return;
          }

          // GET /api/simulators/:deviceId/logs
          if (simRest === "/logs" && method === "GET") {
            const lines = parseInt(query.lines ?? "200", 10);
            const sim = simulatorManager.getRunning(simDeviceId);
            json(res, 200, {
              deviceId: simDeviceId,
              status: sim?.status ?? "stopped",
              lines: simulatorManager.getLogs(simDeviceId, lines),
            });
            return;
          }

          notFound(res);
          return;
        }
      }

      // --- Device routes ---
      const deviceRoute = matchDeviceRoute(path);
      if (deviceRoute) {
        const { id, rest } = deviceRoute;

        if (!deviceManager.hasDevice(id)) {
          json(res, 404, { error: `Device '${id}' not found` });
          return;
        }

        // GET /devices/:id
        if (rest === "" && method === "GET") {
          json(res, 200, deviceManager.getDeviceDetail(id));
          return;
        }

        // GET /devices/:id/state
        if (rest === "/state" && method === "GET") {
          json(res, 200, deviceManager.getDeviceState(id));
          return;
        }

        // POST /devices/:id/actions
        if (rest === "/actions" && method === "POST") {
          const body = await readBody(req);
          let actionReq: ActionRequest;
          try {
            actionReq = JSON.parse(body);
          } catch {
            json(res, 400, { error: "Invalid JSON" });
            return;
          }

          if (!actionReq.name) {
            json(res, 400, { error: "name is required" });
            return;
          }

          const sent = deviceManager.sendAction(id, actionReq.name, actionReq.params);
          if (sent) {
            json(res, 200, { ok: true, action: actionReq.name });
          } else {
            json(res, 400, {
              error: `Unknown action '${actionReq.name}'. Available: ${
                deviceManager.getDeviceDetail(id)?.manifest.actions.join(", ") ?? "none"
              }`,
            });
          }
          return;
        }

        // GET /devices/:id/events (SSE)
        if (rest === "/events" && method === "GET") {
          sseManager.addConnection(res, id);
          return;
        }

        notFound(res);
        return;
      }

      // --- Dashboard static files ---
      if (opts.dashboardDir && method === "GET") {
        // Try to serve the exact file or path/index.html
        if (serveDashboardFile(res, opts.dashboardDir, path)) return;

        // SPA fallback: serve index.html for any unmatched GET request
        // (client-side Next.js router handles routing)
        const indexHtml = resolve(opts.dashboardDir, "index.html");
        if (existsSync(indexHtml)) {
          serveStaticFile(res, indexHtml);
          return;
        }
      }

      notFound(res);
    } catch (err) {
      console.error("[server] Unhandled error:", err);
      json(res, 500, { error: "Internal server error" });
    }
  });

  return server;
}
