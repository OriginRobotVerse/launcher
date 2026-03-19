"use client";

import { useEffect, useState } from "react";
import { ORIGIN_URL } from "@/lib/origin";
import { BACKEND_URL } from "@/lib/backend";

interface LiveStatusProps {
  deviceId: string;
}

interface BackendState {
  active_policy: string | null;
  state: Record<string, number>;
}

export function LiveStatus({ deviceId }: LiveStatusProps) {
  const [connected, setConnected] = useState(false);
  const [bodyHeight, setBodyHeight] = useState<number | null>(null);
  const [angularVelocity, setAngularVelocity] = useState<number | null>(null);
  const [activePolicy, setActivePolicy] = useState<string | null>(null);

  // SSE connection to Origin for live device state
  useEffect(() => {
    const url = `${ORIGIN_URL}/devices/${encodeURIComponent(deviceId)}/events`;

    let es: EventSource | null = null;

    try {
      es = new EventSource(url);

      es.onopen = () => setConnected(true);
      es.onerror = () => setConnected(false);

      es.addEventListener("state.updated", (e: Event) => {
        try {
          const msg = e as MessageEvent;
          const parsed = JSON.parse(msg.data);
          const d = parsed.data ?? parsed;
          if (d.body_z != null) {
            setBodyHeight(d.body_z);
          }
          if (d.body_angular_velocity != null) {
            setAngularVelocity(d.body_angular_velocity);
          }
        } catch {
          // ignore parse errors from malformed SSE data
        }
      });
    } catch {
      setConnected(false);
    }

    return () => {
      es?.close();
    };
  }, [deviceId]);

  // Poll backend for active policy name
  useEffect(() => {
    let cancelled = false;

    async function poll() {
      while (!cancelled) {
        try {
          const res = await fetch(`${BACKEND_URL}/api/status`);
          if (res.ok) {
            const data: BackendState = await res.json();
            if (!cancelled) {
              setActivePolicy(data.active_policy);
              if (data.state.body_z != null) {
                setBodyHeight(data.state.body_z);
              }
            }
          }
        } catch {
          // backend not available, keep polling
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    poll();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      style={{
        height: 36,
        borderBottom: "1px solid var(--wire)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        background: "var(--panel)",
        fontSize: 11,
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: connected ? "#22c55e" : "var(--dim-dark)",
          }}
          className={connected ? "animate-pulse-dot" : undefined}
        />
        <span style={{ color: "var(--dim)", letterSpacing: "0.06em" }}>
          {connected ? "LIVE" : "OFFLINE"}
        </span>
      </div>

      <div style={{ display: "flex", gap: 20, color: "var(--dim)" }}>
        <span>
          height:{" "}
          <span
            style={{
              color:
                bodyHeight != null && bodyHeight < 0.15
                  ? "#ef4444"
                  : "var(--signal)",
              fontWeight: 500,
            }}
          >
            {bodyHeight != null ? `${bodyHeight.toFixed(3)}m` : "N/A"}
          </span>
        </span>
        {angularVelocity != null && (
          <span>
            ang.vel:{" "}
            <span style={{ color: "var(--signal)", fontWeight: 500 }}>
              {angularVelocity.toFixed(2)}
            </span>
          </span>
        )}
        <span>
          policy:{" "}
          <span
            style={{
              color: activePolicy ? "var(--phosphor)" : "var(--dim-dark)",
              fontWeight: 500,
            }}
          >
            {activePolicy ?? "none"}
          </span>
        </span>
      </div>
    </div>
  );
}
