"use client";

import { useEffect, useState } from "react";

interface LiveState {
  distance: number;
  speed: number;
  angle: number;
}

export function LiveStatus() {
  const [state, setState] = useState<LiveState | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const originUrl = process.env.NEXT_PUBLIC_ORIGIN_URL ?? "http://localhost:5050";
    const deviceId = process.env.NEXT_PUBLIC_DEFAULT_DEVICE ?? "toy-car";
    const url = `${originUrl}/devices/${encodeURIComponent(deviceId)}/events`;

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
          setState((prev) => ({
            distance: d.distance ?? prev?.distance ?? -1,
            speed: d.speed ?? prev?.speed ?? 0,
            angle: d.angle ?? prev?.angle ?? 0,
          }));
        } catch {
          // ignore parse errors
        }
      });
    } catch {
      setConnected(false);
    }

    return () => {
      es?.close();
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

      {state ? (
        <div style={{ display: "flex", gap: 20, color: "var(--dim)" }}>
          <span>
            dist:{" "}
            <span
              style={{
                color:
                  state.distance != null && state.distance >= 0 && state.distance < 15
                    ? "#ef4444"
                    : state.distance != null && state.distance < 30
                      ? "var(--phosphor)"
                      : "var(--signal)",
                fontWeight: 500,
              }}
            >
              {state.distance == null || state.distance < 0
                ? "N/A"
                : `${Number(state.distance).toFixed(1)}cm`}
            </span>
          </span>
          <span>
            spd:{" "}
            <span style={{ color: "var(--signal)", fontWeight: 500 }}>
              {state.speed ?? 0}
            </span>
          </span>
          <span>
            ang:{" "}
            <span style={{ color: "var(--signal)", fontWeight: 500 }}>
              {state.angle ?? 0}°
            </span>
          </span>
        </div>
      ) : (
        <span style={{ color: "var(--dim-dark)" }}>
          {connected ? "Waiting for data..." : "No connection to Origin server"}
        </span>
      )}
    </div>
  );
}
