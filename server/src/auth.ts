import type { IncomingMessage, ServerResponse } from "node:http";

/**
 * Optional bearer token auth middleware.
 * If token is null/undefined, all requests are allowed.
 * Otherwise, the Authorization header must contain "Bearer <token>".
 */
export function createAuthMiddleware(
  token: string | null | undefined,
): (req: IncomingMessage, res: ServerResponse) => boolean {
  if (!token) {
    // No auth configured — allow all requests
    return () => true;
  }

  return (req: IncomingMessage, res: ServerResponse): boolean => {
    // Skip auth for CORS preflight
    if (req.method === "OPTIONS") return true;

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Authorization header required" }));
      return false;
    }

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer" || parts[1] !== token) {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid token" }));
      return false;
    }

    return true;
  };
}
