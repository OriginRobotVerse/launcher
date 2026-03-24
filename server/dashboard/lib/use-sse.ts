"use client";

import { useEffect, useState } from "react";

const ORIGIN_URL = process.env.NEXT_PUBLIC_ORIGIN_URL ?? "http://localhost:5050";

export function useDeviceSSE(deviceId: string) {
  const [state, setState] = useState<Record<string, number>>({});
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const url = `${ORIGIN_URL}/devices/${encodeURIComponent(deviceId)}/events`;
    const es = new EventSource(url);

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);

    es.addEventListener("state.updated", (e) => {
      try {
        const parsed = JSON.parse((e as MessageEvent).data);
        const newState = parsed.data?.state ?? parsed.data ?? {};
        setState((prev) => ({ ...prev, ...newState }));
      } catch {}
    });

    return () => es.close();
  }, [deviceId]);

  return { state, connected };
}

interface SSEEvent {
  type: string;
  deviceId: string;
  data: unknown;
  timestamp: string;
}

export function useGlobalSSE() {
  const [events, setEvents] = useState<SSEEvent[]>([]);

  useEffect(() => {
    const es = new EventSource(`${ORIGIN_URL}/events`);

    const handler = (type: string) => (e: Event) => {
      try {
        const parsed = JSON.parse((e as MessageEvent).data);
        setEvents((prev) => [{ type, ...parsed }, ...prev].slice(0, 100));
      } catch {}
    };

    es.addEventListener("state.updated", handler("state.updated"));
    es.addEventListener("action.sent", handler("action.sent"));
    es.addEventListener("device.connected", handler("device.connected"));
    es.addEventListener("device.disconnected", handler("device.disconnected"));

    return () => es.close();
  }, []);

  return events;
}
