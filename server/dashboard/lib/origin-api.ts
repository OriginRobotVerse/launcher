import type {
  DeviceSummary,
  DeviceDetail,
  DeviceProfile,
  AppSummary,
  AppDetail,
  StatusResponse,
  LogsResponse,
  SimulatorsResponse,
  SimulatorLogsResponse,
} from "./types";

const ORIGIN_URL = process.env.NEXT_PUBLIC_ORIGIN_URL ?? "http://localhost:5050";

async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${ORIGIN_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

// Devices
export const getDevices = () => api<DeviceSummary[]>("GET", "/devices");
export const getDevice = (id: string) => api<DeviceDetail>("GET", `/devices/${encodeURIComponent(id)}`);
export const getDeviceState = (id: string) => api<Record<string, number>>("GET", `/devices/${encodeURIComponent(id)}/state`);
export const sendAction = (id: string, name: string, params?: Record<string, number>) =>
  api("POST", `/devices/${encodeURIComponent(id)}/actions`, { name, params });
export const discover = () => api("POST", "/discover");

// Apps
export const getApps = () => api<{ apps: AppSummary[] }>("GET", "/api/apps");
export const getApp = (id: string) => api<AppDetail>("GET", `/api/apps/${encodeURIComponent(id)}`);
export const launchApp = (id: string, req: { deviceId: string; mode?: string }) =>
  api<{ ok: boolean; frontendUrl: string; backendUrl?: string }>("POST", `/api/apps/${encodeURIComponent(id)}/launch`, req);
export const stopApp = (id: string) => api("POST", `/api/apps/${encodeURIComponent(id)}/stop`);
export const getAppLogs = (id: string, lines = 200) =>
  api<LogsResponse>("GET", `/api/apps/${encodeURIComponent(id)}/logs?lines=${lines}`);
export const installApp = (req: { source: string; name?: string }) =>
  api<{ ok: boolean; app: { id: string; name: string; version: string } }>("POST", "/api/apps/install", req);
export const uninstallApp = (id: string) => api("DELETE", `/api/apps/${encodeURIComponent(id)}`);
export const setAppSecrets = (id: string, secrets: Record<string, string>) =>
  api("POST", `/api/apps/${encodeURIComponent(id)}/secrets`, { secrets });
export const scanApps = () => api("POST", "/api/apps/scan");

// Profiles
export const getProfiles = () => api<DeviceProfile[]>("GET", "/api/profiles");
export const getProfile = (id: string) => api<DeviceProfile>("GET", `/api/profiles/${encodeURIComponent(id)}`);
export const saveProfile = (id: string, profile: DeviceProfile) =>
  api("PUT", `/api/profiles/${encodeURIComponent(id)}`, profile);
export const deleteProfile = (id: string) => api("DELETE", `/api/profiles/${encodeURIComponent(id)}`);

// Status
export const getStatus = () => api<StatusResponse>("GET", "/api/status");

// Simulators
export const getSimulators = () => api<SimulatorsResponse>("GET", "/api/simulators");
export const launchSimulator = (req: { model: string; deviceId?: string; headless?: boolean; hz?: number }) =>
  api<{ ok: boolean; deviceId: string; model: string }>("POST", "/api/simulators/launch", req);
export const stopSimulator = (deviceId: string) =>
  api("POST", `/api/simulators/${encodeURIComponent(deviceId)}/stop`);
export const getSimulatorLogs = (deviceId: string, lines = 200) =>
  api<SimulatorLogsResponse>("GET", `/api/simulators/${encodeURIComponent(deviceId)}/logs?lines=${lines}`);
