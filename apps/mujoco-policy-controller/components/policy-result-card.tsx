"use client";

interface PolicyResultCardProps {
  policy: string;
  action: "start" | "stop";
  status: "executing" | "success" | "error";
  message?: string;
}

export function PolicyResultCard({
  policy,
  action,
  status,
  message,
}: PolicyResultCardProps) {
  const statusColor =
    status === "executing"
      ? "var(--phosphor)"
      : status === "success"
        ? "#22c55e"
        : "#ef4444";

  const statusLabel =
    status === "executing" ? "running" : status;

  const icon = action === "start" ? "\u25B6" : "\u25A0";
  const actionLabel = action === "start" ? "Start Policy" : "Stop Policy";

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
        maxWidth: 360,
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
            status === "success"
              ? "rgba(34, 197, 94, 0.1)"
              : status === "error"
                ? "rgba(239, 68, 68, 0.1)"
                : "var(--phosphor-glow-strong)",
          border: `1px solid ${
            status === "success"
              ? "rgba(34, 197, 94, 0.3)"
              : status === "error"
                ? "rgba(239, 68, 68, 0.3)"
                : "var(--phosphor-dim)"
          }`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
          color: statusColor,
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
            {actionLabel}
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

        <div style={{ fontSize: 12, color: "var(--dim)" }}>
          policy: <span style={{ color: "var(--phosphor)", fontWeight: 500 }}>{policy}</span>
        </div>

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
