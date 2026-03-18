"use client";

interface DeviceStateCardProps {
  state: Record<string, number>;
  deviceId: string;
}

export function DeviceStateCard({ state, deviceId }: DeviceStateCardProps) {
  const distance = state.distance ?? -1;
  const speed = state.speed ?? 0;
  const angle = state.angle ?? 0;

  const distanceWarning = distance >= 0 && distance < 15;
  const distanceColor = distanceWarning
    ? "#ef4444"
    : distance < 30
      ? "var(--phosphor)"
      : "var(--signal)";

  return (
    <div
      style={{
        background: "var(--panel)",
        border: "1px solid var(--wire)",
        borderRadius: 8,
        padding: 16,
        fontFamily: "var(--font-jetbrains), monospace",
        fontSize: 13,
        maxWidth: 360,
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
          <circle cx="7" cy="7" r="6" stroke="var(--phosphor)" strokeWidth="1.5" />
          <circle cx="7" cy="7" r="2" fill="var(--phosphor)" />
        </svg>
        <span style={{ color: "var(--dim)", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>
          {deviceId} — sensors
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <SensorGauge
          label="Distance"
          value={distance < 0 ? "N/A" : `${distance.toFixed(1)}cm`}
          color={distanceColor}
          warn={distanceWarning}
        />
        <SensorGauge
          label="Speed"
          value={`${speed}`}
          color="var(--signal)"
          subtext={`/ 255`}
        />
        <SensorGauge
          label="Angle"
          value={`${angle}°`}
          color="var(--signal)"
        />
      </div>

      {distanceWarning && (
        <div
          style={{
            marginTop: 12,
            padding: "8px 12px",
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: 6,
            color: "#ef4444",
            fontSize: 11,
          }}
        >
          Obstacle detected — {distance.toFixed(1)}cm ahead
        </div>
      )}
    </div>
  );
}

function SensorGauge({
  label,
  value,
  color,
  subtext,
  warn,
}: {
  label: string;
  value: string;
  color: string;
  subtext?: string;
  warn?: boolean;
}) {
  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          fontSize: 11,
          color: "var(--dim-dark)",
          letterSpacing: "0.06em",
          textTransform: "uppercase" as const,
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          color,
          lineHeight: 1.2,
        }}
      >
        {value}
        {subtext && (
          <span style={{ fontSize: 11, fontWeight: 400, color: "var(--dim-dark)" }}>
            {subtext}
          </span>
        )}
      </div>
      {warn && (
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#ef4444",
            margin: "6px auto 0",
          }}
          className="animate-pulse-dot"
        />
      )}
    </div>
  );
}
