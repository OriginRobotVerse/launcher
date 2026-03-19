"use client";

import Link from "next/link";
import type { RobotConfig } from "@/lib/robots";

interface LobbyCardProps {
  robot: RobotConfig;
  connected: boolean;
}

export function LobbyCard({ robot, connected }: LobbyCardProps) {
  const typeColor = robot.type === "quadruped" ? "#3b82f6" : "#8b5cf6";

  return (
    <div
      style={{
        background: "var(--panel)",
        border: "1px solid var(--wire)",
        borderRadius: 12,
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        transition: "border-color 0.2s",
        maxWidth: 400,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--wire-bright)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--wire)";
      }}
    >
      {/* Robot illustration */}
      <div
        style={{
          width: "100%",
          height: 120,
          borderRadius: 8,
          background: "var(--panel-raised)",
          border: "1px solid var(--wire)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          {robot.type === "quadruped" ? (
            <>
              {/* Quadruped body */}
              <rect
                x="12"
                y="18"
                width="24"
                height="12"
                rx="3"
                stroke={typeColor}
                strokeWidth="1.5"
                fill="none"
              />
              {/* Legs */}
              <line x1="16" y1="30" x2="14" y2="40" stroke={typeColor} strokeWidth="1.5" />
              <line x1="20" y1="30" x2="18" y2="40" stroke={typeColor} strokeWidth="1.5" />
              <line x1="28" y1="30" x2="30" y2="40" stroke={typeColor} strokeWidth="1.5" />
              <line x1="32" y1="30" x2="34" y2="40" stroke={typeColor} strokeWidth="1.5" />
              {/* Head */}
              <circle cx="38" cy="16" r="4" stroke={typeColor} strokeWidth="1.5" fill="none" />
              <circle cx="39" cy="15" r="1" fill={typeColor} />
            </>
          ) : (
            <>
              {/* Humanoid head */}
              <circle cx="24" cy="10" r="5" stroke={typeColor} strokeWidth="1.5" fill="none" />
              <circle cx="23" cy="9" r="1" fill={typeColor} />
              <circle cx="25" cy="9" r="1" fill={typeColor} />
              {/* Torso */}
              <line x1="24" y1="15" x2="24" y2="30" stroke={typeColor} strokeWidth="1.5" />
              {/* Arms */}
              <line x1="24" y1="18" x2="14" y2="26" stroke={typeColor} strokeWidth="1.5" />
              <line x1="24" y1="18" x2="34" y2="26" stroke={typeColor} strokeWidth="1.5" />
              {/* Legs */}
              <line x1="24" y1="30" x2="18" y2="42" stroke={typeColor} strokeWidth="1.5" />
              <line x1="24" y1="30" x2="30" y2="42" stroke={typeColor} strokeWidth="1.5" />
            </>
          )}
        </svg>
      </div>

      {/* Info */}
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 8,
          }}
        >
          <span
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "var(--signal)",
            }}
          >
            {robot.name}
          </span>
          <span
            style={{
              padding: "2px 8px",
              borderRadius: 4,
              background: `${typeColor}15`,
              color: typeColor,
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              fontWeight: 500,
            }}
          >
            {robot.type}
          </span>
        </div>

        <div
          style={{
            fontSize: 12,
            color: "var(--dim)",
            lineHeight: 1.6,
            marginBottom: 12,
          }}
        >
          {robot.description}
        </div>

        <div
          style={{
            display: "flex",
            gap: 16,
            fontSize: 11,
            color: "var(--dim-dark)",
          }}
        >
          <span>
            {robot.actuatorCount} actuators
          </span>
          <span>{robot.actuatorDescription}</span>
        </div>
      </div>

      {/* Status + control button */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 12,
          borderTop: "1px solid var(--wire)",
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
          <span
            style={{
              fontSize: 11,
              color: connected ? "var(--dim)" : "var(--dim-dark)",
              letterSpacing: "0.06em",
            }}
          >
            {connected ? "CONNECTED" : "OFFLINE"}
          </span>
        </div>

        <Link
          href={`/robot/${robot.id}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 16px",
            borderRadius: 6,
            background: connected ? "var(--phosphor)" : "var(--wire)",
            color: connected ? "var(--void)" : "var(--dim-dark)",
            textDecoration: "none",
            fontSize: 12,
            fontWeight: 700,
            fontFamily: "inherit",
            letterSpacing: "0.06em",
            cursor: connected ? "pointer" : "not-allowed",
            transition: "background 0.2s",
            pointerEvents: connected ? "auto" : "none",
          }}
        >
          CONTROL
          <span style={{ fontSize: 14 }}>&#8594;</span>
        </Link>
      </div>
    </div>
  );
}
