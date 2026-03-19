"use client";

import { useEffect, useState } from "react";
import { useTelemetry } from "./telemetry-context";
import type { ActivityEntry } from "./telemetry-context";
import type { StateGroup } from "@/lib/robots";
import { ORIGIN_URL } from "@/lib/origin";
import { BACKEND_URL } from "@/lib/backend";

interface TelemetryPanelProps {
  deviceId: string;
  stateGroups: StateGroup[];
}

export function TelemetryPanel({ deviceId, stateGroups }: TelemetryPanelProps) {
  const telemetry = useTelemetry();

  // --- Live connection status + polling (moved from LiveStatus) ---
  const [connected, setConnected] = useState(false);
  const [liveBodyHeight, setLiveBodyHeight] = useState<number | null>(null);
  const [liveAngularVelocity, setLiveAngularVelocity] = useState<number | null>(null);
  const [activePolicy, setActivePolicy] = useState<string | null>(null);

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
          if (d.body_z != null) setLiveBodyHeight(d.body_z);
          if (d.body_angular_velocity != null) setLiveAngularVelocity(d.body_angular_velocity);
        } catch {}
      });
    } catch {
      setConnected(false);
    }
    return () => { es?.close(); };
  }, [deviceId]);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      while (!cancelled) {
        try {
          const res = await fetch(`${BACKEND_URL}/api/status`);
          if (res.ok) {
            const data = await res.json();
            if (!cancelled) {
              setActivePolicy(data.active_policy);
              if (data.state?.body_z != null) setLiveBodyHeight(data.state.body_z);
            }
          }
        } catch {}
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
    poll();
    return () => { cancelled = true; };
  }, []);

  if (!telemetry.panelOpen) return null;

  const { latestState, activity } = telemetry;

  return (
    <div
      style={{
        width: 360,
        height: "100%",
        borderLeft: "1px solid var(--wire)",
        background: "var(--panel)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      {/* Panel header */}
      <div
        style={{
          height: 48,
          borderBottom: "1px solid var(--wire)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="1" width="12" height="12" rx="2" stroke="var(--phosphor)" strokeWidth="1.2" />
            <line x1="1" y1="5" x2="13" y2="5" stroke="var(--phosphor)" strokeWidth="1" opacity="0.5" />
            <line x1="5" y1="5" x2="5" y2="13" stroke="var(--phosphor)" strokeWidth="1" opacity="0.5" />
          </svg>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase" as const,
              color: "var(--signal)",
            }}
          >
            Telemetry
          </span>
        </div>
        <button
          onClick={telemetry.togglePanel}
          aria-label="Close telemetry panel"
          style={{
            background: "none",
            border: "none",
            color: "var(--dim)",
            cursor: "pointer",
            padding: 4,
            fontSize: 16,
            lineHeight: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          &#x2715;
        </button>
      </div>

      {/* Panel body — scrollable */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {/* Live status section */}
        <PanelSection label="Connection">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: connected ? "#22c55e" : "var(--dim-dark)",
              }}
              className={connected ? "animate-pulse-dot" : undefined}
            />
            <span style={{ color: connected ? "#22c55e" : "var(--dim-dark)", fontSize: 11, letterSpacing: "0.06em" }}>
              {connected ? "LIVE" : "OFFLINE"}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <LiveMetric
              label="height"
              value={liveBodyHeight != null ? `${liveBodyHeight.toFixed(3)}m` : "N/A"}
              warn={liveBodyHeight != null && liveBodyHeight < 0.15}
            />
            {liveAngularVelocity != null && (
              <LiveMetric label="ang.vel" value={liveAngularVelocity.toFixed(2)} />
            )}
            <LiveMetric
              label="policy"
              value={activePolicy ?? "none"}
              highlight={!!activePolicy}
            />
          </div>
        </PanelSection>

        {/* Latest state snapshot */}
        <PanelSection label="Robot State">
          {latestState ? (
            <CompactStateView
              state={latestState.state}
              deviceId={latestState.deviceId}
              stateGroups={stateGroups}
              timestamp={latestState.timestamp}
            />
          ) : (
            <div style={{ fontSize: 11, color: "var(--dim-dark)", fontStyle: "italic" }}>
              No state data yet. Ask the agent to check robot state.
            </div>
          )}
        </PanelSection>

        {/* Activity log */}
        <PanelSection label="Activity">
          {activity.length === 0 ? (
            <div style={{ fontSize: 11, color: "var(--dim-dark)", fontStyle: "italic" }}>
              No actions yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {activity.slice(0, 20).map((entry) => (
                <ActivityRow key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </PanelSection>
      </div>
    </div>
  );
}

// --- Sub-components ---

function PanelSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: "var(--dim)",
          letterSpacing: "0.1em",
          textTransform: "uppercase" as const,
          marginBottom: 8,
          paddingBottom: 4,
          borderBottom: "1px solid var(--wire)",
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function LiveMetric({
  label,
  value,
  warn,
  highlight,
}: {
  label: string;
  value: string;
  warn?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        fontSize: 11,
        padding: "2px 0",
      }}
    >
      <span style={{ color: "var(--dim)" }}>{label}</span>
      <span
        style={{
          fontWeight: 500,
          fontVariantNumeric: "tabular-nums",
          color: warn ? "#ef4444" : highlight ? "var(--phosphor)" : "var(--signal)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function CompactStateView({
  state,
  deviceId,
  stateGroups,
  timestamp,
}: {
  state: Record<string, number>;
  deviceId: string;
  stateGroups: StateGroup[];
  timestamp: number;
}) {
  const coveredKeys = new Set(stateGroups.flatMap((g) => g.keys));
  const ungroupedKeys = Object.keys(state).filter((k) => !coveredKeys.has(k));
  const timeAgo = formatTimeAgo(timestamp);

  return (
    <div style={{ fontSize: 11 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
          fontSize: 10,
          color: "var(--dim-dark)",
        }}
      >
        <span>{deviceId}</span>
        <span>{timeAgo}</span>
      </div>

      {stateGroups.map((group) => {
        const entries = group.keys
          .filter((k) => state[k] != null)
          .map((k) => ({ key: k, value: state[k] }));
        if (entries.length === 0) return null;

        return (
          <StateGroupView key={group.label} label={group.label} entries={entries} />
        );
      })}

      {ungroupedKeys.length > 0 && (
        <StateGroupView
          label="Other"
          entries={ungroupedKeys.map((k) => ({ key: k, value: state[k] }))}
        />
      )}
    </div>
  );
}

function StateGroupView({
  label,
  entries,
}: {
  label: string;
  entries: { key: string; value: number }[];
}) {
  const [expanded, setExpanded] = useState(false);
  const preview = entries.slice(0, 3);
  const hasMore = entries.length > 3;

  return (
    <div style={{ marginBottom: 8 }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 4,
          fontSize: 10,
          color: "var(--dim)",
          letterSpacing: "0.06em",
          textTransform: "uppercase" as const,
          marginBottom: 4,
          padding: 0,
          fontFamily: "inherit",
          width: "100%",
        }}
      >
        <span
          style={{
            display: "inline-block",
            transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 0.15s",
            fontSize: 8,
            color: "var(--dim-dark)",
          }}
        >
          &#9654;
        </span>
        <span>{label}</span>
        <span style={{ color: "var(--dim-dark)", fontWeight: 400 }}>
          ({entries.length})
        </span>
      </button>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1px 8px",
          paddingLeft: 12,
        }}
      >
        {(expanded ? entries : preview).map(({ key, value }) => {
          const shortLabel = key.replace(/_joint$/, "").replace(/^body_/, "");
          const isVelocity = key.includes("vel");
          const isBodyPos = key.startsWith("body_") && !key.startsWith("body_q");
          const valueColor = isVelocity
            ? "var(--phosphor)"
            : isBodyPos
              ? "#3b82f6"
              : "var(--signal)";

          return (
            <div
              key={key}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                padding: "1px 0",
              }}
            >
              <span
                style={{
                  color: "var(--dim-dark)",
                  fontSize: 10,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  marginRight: 4,
                }}
                title={key}
              >
                {shortLabel}
              </span>
              <span
                style={{
                  color: valueColor,
                  fontWeight: 500,
                  fontSize: 10,
                  fontVariantNumeric: "tabular-nums",
                  flexShrink: 0,
                }}
              >
                {value.toFixed(3)}
              </span>
            </div>
          );
        })}
      </div>

      {!expanded && hasMore && (
        <button
          onClick={() => setExpanded(true)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 10,
            color: "var(--dim-dark)",
            paddingLeft: 12,
            marginTop: 2,
            fontFamily: "inherit",
          }}
        >
          +{entries.length - 3} more...
        </button>
      )}
    </div>
  );
}

function ActivityRow({ entry }: { entry: ActivityEntry }) {
  const statusColor =
    entry.status === "executing"
      ? "var(--phosphor)"
      : entry.status === "success"
        ? "#22c55e"
        : "#ef4444";

  const icon =
    entry.type === "policy"
      ? "\u25B6"
      : entry.type === "command"
        ? "\u2192"
        : entry.type === "state"
          ? "\u25CB"
          : "\u2699";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "4px 0",
        fontSize: 11,
        borderBottom: "1px solid var(--wire)",
      }}
    >
      <span style={{ color: statusColor, fontSize: 10, flexShrink: 0, width: 12, textAlign: "center" }}>
        {icon}
      </span>
      <span
        style={{
          color: "var(--signal)",
          flex: 1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={entry.detail}
      >
        {entry.label}
      </span>
      <span
        style={{
          fontSize: 9,
          padding: "1px 4px",
          borderRadius: 3,
          background:
            entry.status === "success"
              ? "rgba(34, 197, 94, 0.1)"
              : entry.status === "error"
                ? "rgba(239, 68, 68, 0.1)"
                : "var(--phosphor-glow-strong)",
          color: statusColor,
          textTransform: "uppercase" as const,
          letterSpacing: "0.04em",
          flexShrink: 0,
        }}
      >
        {entry.status === "executing" ? "..." : entry.status === "success" ? "ok" : "err"}
      </span>
    </div>
  );
}

function formatTimeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 5) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}
