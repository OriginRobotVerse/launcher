"use client";

import Link from "next/link";
import type { RobotConfig } from "@/lib/robots";

interface HeaderProps {
  robot?: RobotConfig;
  showBack?: boolean;
  /** Telemetry panel controls — only shown when robot is present */
  panelOpen?: boolean;
  onTogglePanel?: () => void;
  unreadCount?: number;
}

export function Header({
  robot,
  showBack,
  panelOpen,
  onTogglePanel,
  unreadCount = 0,
}: HeaderProps) {
  return (
    <header
      style={{
        height: 56,
        borderBottom: "1px solid var(--wire)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        background: "rgba(10, 10, 10, 0.9)",
        backdropFilter: "blur(12px)",
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {showBack && (
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              borderRadius: 6,
              border: "1px solid var(--wire)",
              background: "var(--panel)",
              color: "var(--dim)",
              textDecoration: "none",
              fontSize: 16,
              transition: "border-color 0.2s, color 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--phosphor-dim)";
              e.currentTarget.style.color = "var(--phosphor)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--wire)";
              e.currentTarget.style.color = "var(--dim)";
            }}
          >
            &#8592;
          </Link>
        )}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="var(--wire-bright)"
            strokeWidth="1.5"
          />
          <line
            x1="12"
            y1="2"
            x2="12"
            y2="22"
            stroke="var(--phosphor)"
            strokeWidth="1"
            opacity="0.6"
          />
          <line
            x1="2"
            y1="12"
            x2="22"
            y2="12"
            stroke="var(--phosphor)"
            strokeWidth="1"
            opacity="0.6"
          />
          <circle cx="12" cy="12" r="3" fill="var(--phosphor)" />
        </svg>
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: "0.05em",
            color: "var(--signal)",
          }}
        >
          origin<span style={{ color: "var(--dim)" }}>/</span>
          <span style={{ color: "var(--phosphor)" }}>mujoco</span>
        </span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        {robot && (
          <div
            style={{
              fontSize: 11,
              color: "var(--dim-dark)",
              letterSpacing: "0.06em",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                padding: "2px 6px",
                borderRadius: 4,
                background: "var(--phosphor-glow-strong)",
                color: "var(--phosphor)",
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              {robot.type}
            </span>
            <span>{robot.name}</span>
          </div>
        )}
        {!robot && (
          <span
            style={{
              fontSize: 11,
              color: "var(--dim-dark)",
              letterSpacing: "0.06em",
            }}
          >
            policy controller
          </span>
        )}

        {/* Telemetry panel toggle */}
        {onTogglePanel && (
          <button
            onClick={onTogglePanel}
            aria-label={panelOpen ? "Close telemetry panel" : "Open telemetry panel"}
            title={panelOpen ? "Close telemetry" : "Open telemetry"}
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              borderRadius: 6,
              border: panelOpen
                ? "1px solid var(--phosphor-dim)"
                : "1px solid var(--wire)",
              background: panelOpen
                ? "var(--phosphor-glow-strong)"
                : "var(--panel)",
              color: panelOpen ? "var(--phosphor)" : "var(--dim)",
              cursor: "pointer",
              fontSize: 14,
              transition: "all 0.2s",
              fontFamily: "inherit",
            }}
            onMouseEnter={(e) => {
              if (!panelOpen) {
                e.currentTarget.style.borderColor = "var(--phosphor-dim)";
                e.currentTarget.style.color = "var(--phosphor)";
              }
            }}
            onMouseLeave={(e) => {
              if (!panelOpen) {
                e.currentTarget.style.borderColor = "var(--wire)";
                e.currentTarget.style.color = "var(--dim)";
              }
            }}
          >
            {/* Grid/panel icon */}
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2" />
              <line x1="1" y1="5" x2="13" y2="5" stroke="currentColor" strokeWidth="1" opacity="0.6" />
              <line x1="5" y1="5" x2="5" y2="13" stroke="currentColor" strokeWidth="1" opacity="0.6" />
            </svg>

            {/* Unread badge */}
            {unreadCount > 0 && !panelOpen && (
              <span
                style={{
                  position: "absolute",
                  top: -4,
                  right: -4,
                  minWidth: 14,
                  height: 14,
                  borderRadius: 7,
                  background: "var(--phosphor)",
                  color: "var(--void)",
                  fontSize: 9,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 3px",
                }}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        )}
      </div>
    </header>
  );
}
