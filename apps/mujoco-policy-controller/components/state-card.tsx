"use client";

import type { StateGroup } from "@/lib/robots";

interface StateCardProps {
  state: Record<string, number>;
  deviceId: string;
  stateGroups: StateGroup[];
}

export function StateCard({ state, deviceId, stateGroups }: StateCardProps) {
  // Find keys that exist in the state but are not covered by any group
  const coveredKeys = new Set(stateGroups.flatMap((g) => g.keys));
  const ungroupedKeys = Object.keys(state).filter((k) => !coveredKeys.has(k));

  return (
    <div
      style={{
        background: "var(--panel)",
        border: "1px solid var(--wire)",
        borderRadius: 8,
        padding: 16,
        fontFamily: "var(--font-jetbrains), monospace",
        fontSize: 12,
        maxWidth: 480,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle
            cx="7"
            cy="7"
            r="6"
            stroke="var(--phosphor)"
            strokeWidth="1.5"
          />
          <circle cx="7" cy="7" r="2" fill="var(--phosphor)" />
        </svg>
        <span
          style={{
            color: "var(--dim)",
            fontSize: 11,
            letterSpacing: "0.08em",
            textTransform: "uppercase" as const,
          }}
        >
          {deviceId} — state
        </span>
      </div>

      {stateGroups.map((group) => {
        const groupEntries = group.keys
          .filter((k) => state[k] != null)
          .map((k) => ({ key: k, value: state[k] }));

        if (groupEntries.length === 0) return null;

        return (
          <div key={group.label} style={{ marginBottom: 12 }}>
            <div
              style={{
                fontSize: 10,
                color: "var(--dim-dark)",
                letterSpacing: "0.08em",
                textTransform: "uppercase" as const,
                marginBottom: 6,
                paddingBottom: 4,
                borderBottom: "1px solid var(--wire)",
              }}
            >
              {group.label}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                gap: 4,
              }}
            >
              {groupEntries.map(({ key, value }) => (
                <StateValue key={key} label={key} value={value} />
              ))}
            </div>
          </div>
        );
      })}

      {ungroupedKeys.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div
            style={{
              fontSize: 10,
              color: "var(--dim-dark)",
              letterSpacing: "0.08em",
              textTransform: "uppercase" as const,
              marginBottom: 6,
              paddingBottom: 4,
              borderBottom: "1px solid var(--wire)",
            }}
          >
            Other
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: 4,
            }}
          >
            {ungroupedKeys.map((key) => (
              <StateValue key={key} label={key} value={state[key]} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StateValue({ label, value }: { label: string; value: number }) {
  // Color based on whether it's a body quaternion, position, or joint
  const isQuat = label.startsWith("body_q");
  const isBodyPos = label.startsWith("body_") && !isQuat;
  const isVelocity = label.includes("vel");

  const valueColor = isQuat
    ? "var(--dim)"
    : isBodyPos
      ? "#3b82f6"
      : isVelocity
        ? "var(--phosphor)"
        : "var(--signal)";

  // Short label: strip common suffixes for display
  const shortLabel = label
    .replace(/_joint$/, "")
    .replace(/^body_/, "");

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        padding: "2px 4px",
        borderRadius: 4,
      }}
    >
      <span
        style={{
          color: "var(--dim-dark)",
          fontSize: 10,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          marginRight: 8,
        }}
        title={label}
      >
        {shortLabel}
      </span>
      <span
        style={{
          color: valueColor,
          fontWeight: 500,
          fontSize: 11,
          fontVariantNumeric: "tabular-nums",
          flexShrink: 0,
        }}
      >
        {value.toFixed(4)}
      </span>
    </div>
  );
}
