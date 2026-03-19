export interface PolicyInfo {
  name: string;
  description: string;
  active: boolean;
}

export interface Status {
  device_id: string;
  connected: boolean;
  active_policy: string | null;
  state: Record<string, number>;
  last_action: Record<string, number>;
}

export interface DeviceInfo {
  id: string;
  version: string;
  connected_at: string;
  actions: string[];
  sensors: Array<{ name: string }>;
  state_schema: Array<{ key: string; type: string }>;
}

const BASE = "/api";

async function request<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status}: ${body}`);
  }
  return res.json();
}

export const api = {
  getPolicies: () => request<PolicyInfo[]>("/policies"),
  getStatus: () => request<Status>("/status"),
  getDevice: () => request<DeviceInfo>("/device"),
  startPolicy: (name: string) =>
    request("/policies/start", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  stopPolicy: () => request("/policies/stop", { method: "POST" }),
  sendAction: (name: string, params: Record<string, number> = {}) =>
    request("/action", {
      method: "POST",
      body: JSON.stringify({ name, params }),
    }),
};
