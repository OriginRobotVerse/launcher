"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/header";
import { LobbyCard } from "@/components/lobby-card";
import { ROBOTS } from "@/lib/robots";
import { listDevices } from "@/lib/origin";
import type { DeviceSummary } from "@/lib/origin";

export default function LobbyPage() {
  const [devices, setDevices] = useState<DeviceSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchDevices() {
      try {
        const result = await listDevices();
        if (!cancelled) {
          setDevices(result);
        }
      } catch {
        // Origin server not available, all robots show as offline
        if (!cancelled) {
          setDevices([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchDevices();

    // Poll for device status every 5 seconds
    const interval = setInterval(fetchDevices, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const connectedIds = new Set(devices.map((d) => d.id));

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
      }}
    >
      <Header />

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "48px 24px",
        }}
      >
        <div
          style={{
            maxWidth: 860,
            margin: "0 auto",
          }}
        >
          {/* Title */}
          <div style={{ marginBottom: 40, textAlign: "center" }}>
            <h1
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: "var(--signal)",
                marginBottom: 8,
              }}
            >
              MuJoCo Policy Controller
            </h1>
            <p
              style={{
                fontSize: 13,
                color: "var(--dim)",
                maxWidth: 480,
                margin: "0 auto",
                lineHeight: 1.7,
              }}
            >
              Select a robot to control through the Glove AI agent. The agent
              can manage control policies, read joint states, and send actions.
            </p>
          </div>

          {/* Robot cards */}
          {loading ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                padding: 48,
                color: "var(--dim)",
                fontSize: 12,
                letterSpacing: "0.06em",
              }}
            >
              Connecting to Origin server...
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
                gap: 24,
                justifyItems: "center",
              }}
            >
              {ROBOTS.map((robot) => (
                <LobbyCard
                  key={robot.id}
                  robot={robot}
                  connected={connectedIds.has(robot.id)}
                />
              ))}
            </div>
          )}

          {/* Connection info */}
          <div
            style={{
              marginTop: 48,
              textAlign: "center",
              fontSize: 11,
              color: "var(--dim-dark)",
              letterSpacing: "0.04em",
            }}
          >
            Origin server:{" "}
            <span style={{ color: "var(--dim)" }}>
              {process.env.NEXT_PUBLIC_ORIGIN_URL ?? "http://localhost:5050"}
            </span>
            {" / "}
            Backend:{" "}
            <span style={{ color: "var(--dim)" }}>
              {process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
