import { useState, useCallback } from "react";
import { api } from "./api.ts";
import { usePolicies, useStatus } from "./hooks.ts";
import { DeviceHeader } from "./components/DeviceHeader.tsx";
import { PolicyCard } from "./components/PolicyCard.tsx";
import { StatePanel } from "./components/StatePanel.tsx";
import { ActionBar } from "./components/ActionBar.tsx";

export default function App() {
  const { policies, refresh } = usePolicies();
  const status = useStatus(200);
  const [filter, setFilter] = useState("");

  const handleStart = useCallback(
    async (name: string) => {
      await api.startPolicy(name);
      refresh();
    },
    [refresh],
  );

  const handleStop = useCallback(async () => {
    await api.stopPolicy();
    refresh();
  }, [refresh]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      <DeviceHeader status={status} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "340px 1fr",
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        {/* Left: policies + actions */}
        <div
          style={{
            borderRight: "1px solid var(--border)",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            overflowY: "auto",
          }}
        >
          <span
            style={{
              fontWeight: 600,
              fontSize: "14px",
              color: "var(--text-dim)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Policies
          </span>
          {policies.map((p) => (
            <PolicyCard
              key={p.name}
              policy={{
                ...p,
                active: status?.active_policy === p.name,
              }}
              onStart={handleStart}
              onStop={handleStop}
            />
          ))}
          <div style={{ marginTop: "auto", paddingTop: "12px" }}>
            <ActionBar />
          </div>
        </div>

        {/* Right: state panel */}
        <div
          style={{
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          <StatePanel
            state={status?.state ?? {}}
            lastAction={status?.last_action ?? {}}
            filter={filter}
            onFilterChange={setFilter}
          />
        </div>
      </div>
    </div>
  );
}
