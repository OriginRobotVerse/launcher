const ORIGIN_URL =
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_ORIGIN_URL ?? "http://localhost:5050")
    : "http://localhost:5050";

const DEFAULT_DEVICE =
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_DEFAULT_DEVICE ?? "toy-car")
    : "toy-car";

export { DEFAULT_DEVICE };

async function originFetch<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const url = `${ORIGIN_URL}${path}`;
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body != null ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(`Origin API error ${res.status}: ${text}`);
  }

  return (await res.json()) as T;
}

export interface DeviceSummary {
  id: string;
  version: string;
  connectedAt: string;
  actions: string[];
  sensorCount: number;
  chipCount: number;
}

export interface DeviceDetail {
  id: string;
  version: string;
  connectedAt: string;
  manifest: {
    id: string;
    version: string;
    sensors: Array<{ name: string; pins: number[] }>;
    chips: Array<{ name: string; pins: number[] }>;
    actions: string[];
    state: Array<{ key: string; type: string }>;
  };
  state: Record<string, number>;
  lastUpdated: string | null;
}

export async function listDevices(): Promise<DeviceSummary[]> {
  return originFetch<DeviceSummary[]>("GET", "/devices");
}

export async function getDevice(id: string): Promise<DeviceDetail> {
  return originFetch<DeviceDetail>("GET", `/devices/${encodeURIComponent(id)}`);
}

export async function getDeviceState(
  id: string,
): Promise<Record<string, number>> {
  return originFetch<Record<string, number>>(
    "GET",
    `/devices/${encodeURIComponent(id)}/state`,
  );
}

export async function sendAction(
  deviceId: string,
  name: string,
  params?: Record<string, number>,
): Promise<{ ok: boolean; action: string }> {
  return originFetch("POST", `/devices/${encodeURIComponent(deviceId)}/actions`, {
    name,
    params,
  });
}
