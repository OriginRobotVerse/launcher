"use client";

/**
 * Compact inline chip for tool results in the chat timeline.
 * Replaces the large StateCard / ActionResultCard / PolicyResultCard
 * that previously cluttered the conversation. Shows a single-line
 * summary with a status dot and an optional "View" button to open
 * the telemetry panel.
 */

interface InlineToolChipProps {
  icon: string;
  label: string;
  status: "executing" | "success" | "error";
  detail?: string;
  onViewDetail?: () => void;
}

export function InlineToolChip({
  icon,
  label,
  status,
  detail,
  onViewDetail,
}: InlineToolChipProps) {
  const statusColor =
    status === "executing"
      ? "var(--phosphor)"
      : status === "success"
        ? "#22c55e"
        : "#ef4444";

  return (
    <div
      className="animate-fade-in"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 12px",
        borderRadius: 6,
        background: "var(--panel)",
        border: "1px solid var(--wire)",
        borderLeft: `3px solid ${statusColor}`,
        fontSize: 12,
        fontFamily: "var(--font-jetbrains), monospace",
        maxWidth: 480,
        marginBottom: 8,
      }}
    >
      {/* Status dot */}
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: statusColor,
          flexShrink: 0,
        }}
        className={status === "executing" ? "animate-pulse-dot" : undefined}
      />

      {/* Icon */}
      <span style={{ fontSize: 12, color: "var(--dim)", flexShrink: 0 }}>
        {icon}
      </span>

      {/* Label */}
      <span
        style={{
          color: "var(--signal)",
          fontWeight: 500,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>

      {/* Brief detail */}
      {detail && (
        <span
          style={{
            color: "var(--dim)",
            fontSize: 11,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flexShrink: 1,
            minWidth: 0,
          }}
        >
          {detail}
        </span>
      )}

      {/* View button — opens telemetry panel */}
      {onViewDetail && status !== "executing" && (
        <button
          onClick={onViewDetail}
          style={{
            background: "var(--panel-raised)",
            border: "1px solid var(--wire-bright)",
            borderRadius: 4,
            padding: "2px 8px",
            fontSize: 10,
            color: "var(--phosphor)",
            cursor: "pointer",
            fontFamily: "inherit",
            letterSpacing: "0.04em",
            flexShrink: 0,
            transition: "border-color 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--phosphor-dim)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--wire-bright)";
          }}
        >
          VIEW
        </button>
      )}
    </div>
  );
}
