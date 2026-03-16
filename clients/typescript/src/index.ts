// --- Types ---

export interface ServerInfo {
  name: string;
  version: string;
  uptime: number;
  deviceCount: number;
}

export interface DeviceSummary {
  id: string;
  version: string;
  connectedAt: string;
  actions: string[];
  sensorCount: number;
  chipCount: number;
}

export interface DeviceManifest {
  id: string;
  version: string;
  sensors: Array<{ name: string; pins: number[] }>;
  chips: Array<{ name: string; pins: number[] }>;
  actions: string[];
  state: Array<{ key: string; type: string }>;
}

export interface DeviceDetail {
  id: string;
  version: string;
  connectedAt: string;
  manifest: DeviceManifest;
  state: Record<string, number>;
  lastUpdated: string | null;
}

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  createdAt: string;
}

export interface SSEEventData {
  deviceId: string;
  data: unknown;
  timestamp: string;
}

export type SSEEventType =
  | "state.updated"
  | "action.sent"
  | "device.connected"
  | "device.disconnected";

// --- Error ---

export class OriginError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "OriginError";
  }
}

// --- Client ---

export class OriginClient {
  private baseUrl: string;
  private token: string | null;

  constructor(options: { url: string; token?: string }) {
    // Remove trailing slash
    this.baseUrl = options.url.replace(/\/$/, "");
    this.token = options.token ?? null;
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.token) {
      h["Authorization"] = `Bearer ${this.token}`;
    }
    return h;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      method,
      headers: this.headers(),
      body: body != null ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      let responseBody: unknown;
      try {
        responseBody = await res.json();
      } catch {
        responseBody = await res.text();
      }
      throw new OriginError(
        `${method} ${path} failed with status ${res.status}`,
        res.status,
        responseBody,
      );
    }

    return (await res.json()) as T;
  }

  // --- API methods ---

  async getServerInfo(): Promise<ServerInfo> {
    return this.request<ServerInfo>("GET", "/");
  }

  async listDevices(): Promise<DeviceSummary[]> {
    return this.request<DeviceSummary[]>("GET", "/devices");
  }

  async getDevice(id: string): Promise<DeviceDetail> {
    return this.request<DeviceDetail>("GET", `/devices/${encodeURIComponent(id)}`);
  }

  async getDeviceState(id: string): Promise<Record<string, number>> {
    return this.request<Record<string, number>>(
      "GET",
      `/devices/${encodeURIComponent(id)}/state`,
    );
  }

  async sendAction(
    deviceId: string,
    name: string,
    params?: Record<string, number>,
  ): Promise<{ ok: boolean; action: string }> {
    return this.request("POST", `/devices/${encodeURIComponent(deviceId)}/actions`, {
      name,
      params,
    });
  }

  async registerWebhook(options: {
    url: string;
    events?: string[];
    secret?: string;
  }): Promise<Webhook> {
    return this.request<Webhook>("POST", "/webhooks", options);
  }

  async listWebhooks(): Promise<Webhook[]> {
    return this.request<Webhook[]>("GET", "/webhooks");
  }

  async deleteWebhook(id: string): Promise<{ ok: boolean }> {
    return this.request<{ ok: boolean }>("DELETE", `/webhooks/${encodeURIComponent(id)}`);
  }

  // --- SSE ---

  subscribe(options?: {
    deviceId?: string;
    onEvent?: (event: SSEEventType, data: SSEEventData) => void;
    onError?: (error: Error) => void;
    onOpen?: () => void;
  }): SSESubscription {
    const path = options?.deviceId
      ? `/devices/${encodeURIComponent(options.deviceId)}/events`
      : "/events";

    const url = `${this.baseUrl}${path}`;
    return new SSESubscription(url, this.token, options);
  }
}

// --- SSE Subscription ---

export class SSESubscription {
  private eventSource: EventSource | null = null;
  private closed = false;

  constructor(
    private url: string,
    private token: string | null,
    private options?: {
      onEvent?: (event: SSEEventType, data: SSEEventData) => void;
      onError?: (error: Error) => void;
      onOpen?: () => void;
    },
  ) {
    this.connect();
  }

  private connect(): void {
    if (this.closed) return;

    // EventSource doesn't support custom headers natively.
    // For auth, append token as query param if needed.
    let url = this.url;
    if (this.token) {
      const sep = url.includes("?") ? "&" : "?";
      url = `${url}${sep}token=${encodeURIComponent(this.token)}`;
    }

    this.eventSource = new EventSource(url);

    this.eventSource.onopen = () => {
      this.options?.onOpen?.();
    };

    this.eventSource.onerror = () => {
      this.options?.onError?.(new Error("SSE connection error"));
    };

    // Listen for typed events
    const eventTypes: SSEEventType[] = [
      "state.updated",
      "action.sent",
      "device.connected",
      "device.disconnected",
    ];

    for (const eventType of eventTypes) {
      this.eventSource.addEventListener(eventType, (e: Event) => {
        const messageEvent = e as MessageEvent;
        try {
          const data = JSON.parse(messageEvent.data) as SSEEventData;
          this.options?.onEvent?.(eventType, data);
        } catch {
          // Ignore parse errors
        }
      });
    }
  }

  close(): void {
    this.closed = true;
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }
}
