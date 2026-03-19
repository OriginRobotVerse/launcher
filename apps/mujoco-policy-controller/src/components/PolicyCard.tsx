import type { CSSProperties } from "react";
import type { PolicyInfo } from "../api.ts";

const ICONS: Record<string, string> = {
  stand: "\u2693",
  "sine-wave": "\u223F",
  trot: "\u2B95",
  crouch: "\u2B07",
  wave: "\u270B",
  bounce: "\u2B06",
};

interface Props {
  policy: PolicyInfo;
  onStart: (name: string) => void;
  onStop: () => void;
}

export function PolicyCard({ policy, onStart, onStop }: Props) {
  const icon = ICONS[policy.name] ?? "\u2699";

  return (
    <div
      style={{
        background: policy.active
          ? "var(--surface-hover)"
          : "var(--surface)",
        border: `1px solid ${policy.active ? "var(--accent)" : "var(--border)"}`,
        borderRadius: "var(--radius)",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        transition: "border-color 0.15s, background 0.15s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ fontSize: "22px" }}>{icon}</span>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: "15px",
              textTransform: "capitalize",
            }}
          >
            {policy.name.replace("-", " ")}
          </div>
          <div style={{ color: "var(--text-dim)", fontSize: "13px" }}>
            {policy.description}
          </div>
        </div>
      </div>
      {policy.active ? (
        <button onClick={onStop} style={stopBtnStyle}>
          Stop
        </button>
      ) : (
        <button onClick={() => onStart(policy.name)} style={startBtnStyle}>
          Run
        </button>
      )}
    </div>
  );
}

const startBtnStyle: CSSProperties = {
  background: "var(--accent)",
  color: "#fff",
  border: "none",
  borderRadius: "var(--radius-sm)",
  padding: "8px 0",
  fontWeight: 500,
  fontSize: "13px",
  transition: "background 0.15s",
};

const stopBtnStyle: CSSProperties = {
  background: "var(--red)",
  color: "#fff",
  border: "none",
  borderRadius: "var(--radius-sm)",
  padding: "8px 0",
  fontWeight: 500,
  fontSize: "13px",
  transition: "background 0.15s",
};
