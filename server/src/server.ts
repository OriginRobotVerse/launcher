import { createServer, IncomingMessage, ServerResponse } from "node:http";
import type { DeviceManager } from "./device-manager.js";
import type { SSEManager } from "./sse.js";
import type { WebhookManager } from "./webhooks.js";
import type { ActionRequest, WebhookRegistration } from "./types.js";

interface ServerOptions {
  port: number;
  deviceManager: DeviceManager;
  sseManager: SSEManager;
  webhookManager: WebhookManager;
  authCheck: (req: IncomingMessage, res: ServerResponse) => boolean;
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
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
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

export function createOriginServer(opts: ServerOptions) {
  const { deviceManager, sseManager, webhookManager, authCheck } = opts;

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const method = req.method ?? "GET";
    const { path } = parseUrl(req.url ?? "/");

    // CORS preflight
    if (method === "OPTIONS") {
      cors(res);
      return;
    }

    // Auth check
    if (!authCheck(req, res)) return;

    try {
      // --- Root ---
      if (path === "/" && method === "GET") {
        json(res, 200, {
          name: "origin-server",
          version: "0.2.0",
          uptime: Math.floor((Date.now() - startTime) / 1000),
          deviceCount: deviceManager.getDeviceIds().length,
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

      notFound(res);
    } catch (err) {
      console.error("[server] Unhandled error:", err);
      json(res, 500, { error: "Internal server error" });
    }
  });

  return server;
}
