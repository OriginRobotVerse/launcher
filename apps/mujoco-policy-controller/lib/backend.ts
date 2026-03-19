const BACKEND_URL =
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000")
    : "http://localhost:8000";

export { BACKEND_URL };

async function backendFetch<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const url = `${BACKEND_URL}${path}`;
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body != null ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(`Backend API error ${res.status}: ${text}`);
  }

  return (await res.json()) as T;
}

export interface PolicyInfo {
  name: string;
  description: string;
  active: boolean;
}

export interface BackendStatus {
  device_id: string;
  connected: boolean;
  active_policy: string | null;
  state: Record<string, number>;
  last_action: Record<string, number>;
}

export async function listPolicies(): Promise<PolicyInfo[]> {
  return backendFetch<PolicyInfo[]>("GET", "/api/policies");
}

export async function startPolicy(
  name: string,
): Promise<{ ok: boolean; policy: string }> {
  return backendFetch("POST", "/api/policies/start", { name });
}

export async function stopPolicy(): Promise<{ ok: boolean }> {
  return backendFetch("POST", "/api/policies/stop");
}

export async function getStatus(): Promise<BackendStatus> {
  return backendFetch<BackendStatus>("GET", "/api/status");
}

export async function sendCommand(
  vx: number,
  vy: number,
  yaw: number,
): Promise<{ ok: boolean }> {
  return backendFetch("POST", "/api/command", { vx, vy, yaw });
}
