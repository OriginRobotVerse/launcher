"use client";

interface ActionResultCardProps {
  action: string;
  speed?: number;
  angle?: number;
  status: "executing" | "success" | "error" | "blocked";
  message?: string;
  distance?: number;
}

const ACTION_ICONS: Record<string, { arrow: string; label: string }> = {
  moveFwd: { arrow: "\u2191", label: "Forward" },
  moveRight: { arrow: "\u2192", label: "Right" },
  moveLeft: { arrow: "\u2190", label: "Left" },
  stop: { arrow: "\u25A0", label: "Stop" },
};

export function ActionResultCard({
  action,
  speed,
  angle,
  status,
  message,
  distance,
}: ActionResultCardProps) {
  const info = ACTION_ICONS[action] ?? { arrow: "?", label: action };

  const statusColor =
    status === "executing"
      ? "var(--phosphor)"
      : status === "success"
        ? "#22c55e"
        : status === "blocked"
          ? "#f97316"
          : "#ef4444";

  const statusLabel =
    status === "executing"
      ? "running"
      : status === "blocked"
        ? "blocked"
        : status;

  return (
    <div
      style={{
        background: "var(--panel)",
        border: "1px solid var(--wire)",
        borderLeft: `3px solid ${statusColor}`,
        borderRadius: 8,
        padding: 16,
        fontFamily: "var(--font-jetbrains), monospace",
        fontSize: 13,
        maxWidth: 320,
        display: "flex",
        gap: 14,
        alignItems: "flex-start",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 8,
          background:
            status === "blocked"
              ? "rgba(249, 115, 22, 0.1)"
              : "var(--panel-raised)",
          border: `1px solid ${status === "blocked" ? "rgba(249, 115, 22, 0.3)" : "var(--wire)"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 20,
          color:
            status === "blocked"
              ? "#f97316"
              : action === "stop"
                ? "#ef4444"
                : "var(--phosphor)",
          flexShrink: 0,
        }}
      >
        {status === "blocked" ? "\u26A0" : info.arrow}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 4,
          }}
        >
          <span style={{ fontWeight: 700, color: "var(--signal)" }}>
            {info.label}
          </span>
          <span
            style={{
              fontSize: 10,
              padding: "2px 6px",
              borderRadius: 4,
              background:
                status === "executing"
                  ? "var(--phosphor-glow-strong)"
                  : status === "success"
                    ? "rgba(34, 197, 94, 0.1)"
                    : status === "blocked"
                      ? "rgba(249, 115, 22, 0.1)"
                      : "rgba(239, 68, 68, 0.1)",
              color: statusColor,
              textTransform: "uppercase" as const,
              letterSpacing: "0.06em",
            }}
          >
            {statusLabel}
          </span>
        </div>

        <div style={{ display: "flex", gap: 12, color: "var(--dim)", fontSize: 12 }}>
          {speed != null && <span>speed: {speed}</span>}
          {angle != null && <span>angle: {angle}°</span>}
          {distance != null && (
            <span style={{ color: distance < 15 ? "#ef4444" : "var(--dim)" }}>
              dist: {distance.toFixed(1)}cm
            </span>
          )}
        </div>

        {message && (
          <div
            style={{
              marginTop: 6,
              fontSize: 11,
              color:
                status === "error"
                  ? "#ef4444"
                  : status === "blocked"
                    ? "#f97316"
                    : "var(--dim)",
              lineHeight: 1.5,
            }}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
