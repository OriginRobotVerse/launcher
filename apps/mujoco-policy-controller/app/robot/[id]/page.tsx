"use client";

import { use, useMemo, useCallback } from "react";
import { Header } from "@/components/header";
import { ChatPanel } from "@/components/chat-panel";
import { TelemetryPanel } from "@/components/telemetry-panel";
import { TelemetryProvider, useTelemetry } from "@/components/telemetry-context";
import { Providers } from "@/app/providers";
import { getRobot } from "@/lib/robots";
import { createGloveClient } from "@/lib/glove";
import type { RobotConfig } from "@/lib/robots";

interface RobotPageProps {
  params: Promise<{ id: string }>;
}

export default function RobotPage({ params }: RobotPageProps) {
  const { id } = use(params);
  const robot = getRobot(id);

  if (!robot) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100vh",
        }}
      >
        <Header showBack />
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              fontSize: 48,
              color: "var(--dim-dark)",
            }}
          >
            ?
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "var(--signal)",
            }}
          >
            Robot Not Found
          </div>
          <div
            style={{
              fontSize: 13,
              color: "var(--dim)",
            }}
          >
            No robot configuration exists for device ID &quot;{id}&quot;.
          </div>
        </div>
      </div>
    );
  }

  return <RobotPageInner robot={robot} />;
}

/**
 * Inner component that lives inside TelemetryProvider so it can
 * wire telemetry callbacks into the GloveClient's tools.
 */
function RobotPageInner({ robot }: { robot: RobotConfig }) {
  return (
    <TelemetryProvider>
      <RobotPageContent robot={robot} />
    </TelemetryProvider>
  );
}

function RobotPageContent({ robot }: { robot: RobotConfig }) {
  const telemetry = useTelemetry();

  // Stable callback refs — these close over the telemetry context
  const onStateReceived = useCallback(
    (state: Record<string, number>, deviceId: string) => {
      telemetry.pushState(state, deviceId);
      telemetry.pushActivity({
        type: "state",
        label: "State snapshot",
        status: "success",
        detail: `${Object.keys(state).length} values`,
      });
    },
    [telemetry.pushState, telemetry.pushActivity],
  );

  const onOpenPanel = useCallback(() => {
    telemetry.openPanel();
  }, [telemetry.openPanel]);

  const onActivity = useCallback(
    (entry: {
      type: "action" | "policy" | "command" | "state";
      label: string;
      status: "executing" | "success" | "error";
      detail?: string;
    }) => {
      telemetry.pushActivity(entry);
    },
    [telemetry.pushActivity],
  );

  const gloveClient = useMemo(() => {
    return createGloveClient(robot.id, robot, {
      onStateReceived,
      onOpenPanel,
      onActivity,
    });
  }, [robot, onStateReceived, onOpenPanel, onActivity]);

  return (
    <Providers client={gloveClient}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100vh",
        }}
      >
        <Header
          robot={robot}
          showBack
          panelOpen={telemetry.panelOpen}
          onTogglePanel={telemetry.togglePanel}
          unreadCount={telemetry.unreadCount}
        />

        {/* Compact live status bar — minimal, always visible */}
        <LiveStatusBar deviceId={robot.id} />

        {/* Main content: chat + optional telemetry panel */}
        <div
          style={{
            flex: 1,
            display: "flex",
            overflow: "hidden",
          }}
        >
          {/* Chat takes all remaining space */}
          <div style={{ flex: 1, overflow: "hidden" }}>
            <ChatPanel robot={robot} />
          </div>

          {/* Telemetry panel slides in from the right */}
          <TelemetryPanel
            deviceId={robot.id}
            stateGroups={robot.stateGroups}
          />
        </div>
      </div>
    </Providers>
  );
}

/**
 * Slim status bar showing connection + key metrics in a single line.
 * Much lighter than the old LiveStatus — just the essentials.
 */
import { useEffect, useState } from "react";
import { ORIGIN_URL } from "@/lib/origin";
import { BACKEND_URL } from "@/lib/backend";

function LiveStatusBar({ deviceId }: { deviceId: string }) {
  const [connected, setConnected] = useState(false);
  const [activePolicy, setActivePolicy] = useState<string | null>(null);

  useEffect(() => {
    const url = `${ORIGIN_URL}/devices/${encodeURIComponent(deviceId)}/events`;
    let es: EventSource | null = null;
    try {
      es = new EventSource(url);
      es.onopen = () => setConnected(true);
      es.onerror = () => setConnected(false);
    } catch {
      setConnected(false);
    }
    return () => { es?.close(); };
  }, [deviceId]);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      while (!cancelled) {
        try {
          const res = await fetch(`${BACKEND_URL}/api/status`);
          if (res.ok) {
            const data = await res.json();
            if (!cancelled) setActivePolicy(data.active_policy);
          }
        } catch {}
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
    poll();
    return () => { cancelled = true; };
  }, []);

  return (
    <div
      style={{
        height: 28,
        borderBottom: "1px solid var(--wire)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        background: "var(--panel)",
        fontSize: 10,
        flexShrink: 0,
        letterSpacing: "0.04em",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: connected ? "#22c55e" : "var(--dim-dark)",
          }}
          className={connected ? "animate-pulse-dot" : undefined}
        />
        <span style={{ color: "var(--dim)" }}>
          {connected ? "LIVE" : "OFFLINE"}
        </span>
      </div>

      <div style={{ display: "flex", gap: 16, alignItems: "center", color: "var(--dim)" }}>
        <span>
          policy:{" "}
          <span
            style={{
              color: activePolicy ? "var(--phosphor)" : "var(--dim-dark)",
              fontWeight: 500,
            }}
          >
            {activePolicy ?? "none"}
          </span>
        </span>
        {activePolicy && (
          <button
            onClick={async () => {
              try {
                await fetch(`${BACKEND_URL}/api/policies/stop`, { method: "POST" });
                setActivePolicy(null);
              } catch {}
            }}
            style={{
              background: "rgba(239, 68, 68, 0.15)",
              color: "#ef4444",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: 4,
              padding: "1px 8px",
              fontSize: 10,
              fontWeight: 600,
              fontFamily: "inherit",
              letterSpacing: "0.04em",
              cursor: "pointer",
              lineHeight: "16px",
            }}
          >
            STOP
          </button>
        )}
      </div>
    </div>
  );
}
