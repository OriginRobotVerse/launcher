import type { Status } from "../api.ts";

interface Props {
  status: Status | null;
}

export function DeviceHeader({ status }: Props) {
  const connected = status?.connected ?? false;
  const deviceId = status?.device_id ?? "...";
  const activePolicy = status?.active_policy;

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 24px",
        borderBottom: "1px solid var(--border)",
        background: "var(--surface)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <h1
          style={{
            fontSize: "18px",
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}
        >
          Policy Controller
        </h1>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "13px",
            color: "var(--text-dim)",
          }}
        >
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: connected ? "var(--green)" : "var(--red)",
              display: "inline-block",
            }}
          />
          {deviceId}
        </div>
      </div>
      <div style={{ fontSize: "13px", color: "var(--text-dim)" }}>
        {activePolicy ? (
          <>
            Running:{" "}
            <span
              style={{
                color: "var(--accent)",
                fontWeight: 600,
                textTransform: "capitalize",
              }}
            >
              {activePolicy.replace("-", " ")}
            </span>
          </>
        ) : (
          "Idle"
        )}
      </div>
    </header>
  );
}
