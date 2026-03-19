"use client";

interface ActionResultCardProps {
  action: string;
  params?: Record<string, number>;
  status: "executing" | "success" | "error";
  message?: string;
}

const ACTION_LABELS: Record<string, string> = {
  reset: "Reset Pose",
  pause: "Pause Sim",
  set_pos: "Set Positions",
  set_ctrl: "Set Controls",
  send_command: "Velocity Cmd",
};

export function ActionResultCard({
  action,
  params,
  status,
  message,
}: ActionResultCardProps) {
  const label = ACTION_LABELS[action] ?? action;

  const statusColor =
    status === "executing"
      ? "var(--phosphor)"
      : status === "success"
        ? "#22c55e"
        : "#ef4444";

  const statusLabel = status === "executing" ? "running" : status;

  const icon =
    action === "reset"
      ? "\u21BA"
      : action === "pause"
        ? "\u23F8"
        : action === "send_command"
          ? "\u2192"
          : "\u2699";

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
        maxWidth: 400,
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
          background: "var(--panel-raised)",
          border: "1px solid var(--wire)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 20,
          color:
            status === "error"
              ? "#ef4444"
              : "var(--phosphor)",
          flexShrink: 0,
        }}
      >
        {icon}
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
            {label}
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
                    : "rgba(239, 68, 68, 0.1)",
              color: statusColor,
              textTransform: "uppercase" as const,
              letterSpacing: "0.06em",
            }}
          >
            {statusLabel}
          </span>
        </div>

        {params && Object.keys(params).length > 0 && (
          <div
            style={{
              display: "flex",
              gap: 12,
              color: "var(--dim)",
              fontSize: 11,
              flexWrap: "wrap",
            }}
          >
            {Object.entries(params).map(([key, val]) => (
              <span key={key}>
                {key}:{" "}
                <span style={{ color: "var(--signal)", fontWeight: 500 }}>
                  {typeof val === "number" ? val.toFixed(3) : String(val)}
                </span>
              </span>
            ))}
          </div>
        )}

        {message && (
          <div
            style={{
              marginTop: 6,
              fontSize: 11,
              color:
                status === "error"
                  ? "#ef4444"
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
