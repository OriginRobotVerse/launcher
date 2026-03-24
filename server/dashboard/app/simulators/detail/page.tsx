"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { usePoll } from "@/lib/use-poll";
import { getSimulatorLogs, stopSimulator, getSimulators } from "@/lib/origin-api";
import { StatusDot } from "@/components/status-dot";
import { useDeviceSSE } from "@/lib/use-sse";

export default function SimulatorDetailPage() {
  return (
    <Suspense fallback={<div className="text-dim text-xs mt-12">Loading simulator...</div>}>
      <SimulatorDetailInner />
    </Suspense>
  );
}

function SimulatorDetailInner() {
  const searchParams = useSearchParams();
  const deviceId = searchParams.get("id") ?? "";
  const router = useRouter();
  const [autoScroll, setAutoScroll] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const logsFetcher = useCallback(() => getSimulatorLogs(deviceId), [deviceId]);
  const { data: logsData } = usePoll(logsFetcher, 2000);

  const simFetcher = useCallback(() => getSimulators(), []);
  const { data: simData, refresh } = usePoll(simFetcher, 5000);

  const sim = simData?.running.find((s) => s.deviceId === deviceId);
  const { state, connected } = useDeviceSSE(deviceId);

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logsData?.lines, autoScroll]);

  const handleStop = async () => {
    try {
      await stopSimulator(deviceId);
      refresh();
      router.push("/simulators");
    } catch (err) {
      console.error("Failed to stop simulator:", err);
    }
  };

  if (!deviceId) {
    return <div className="text-dim text-xs mt-12">No simulator ID specified</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm text-signal font-medium">{deviceId}</h1>
          <div className="flex items-center gap-3 mt-1">
            {sim ? (
              <>
                <StatusDot status="running" />
                <span className="text-[10px] text-dim">
                  model: {sim.model} | {sim.headless ? "headless" : "viewer"} | {sim.hz} Hz
                </span>
                <span className="text-[10px] text-dim">
                  uptime: {sim.uptime < 60 ? `${sim.uptime}s` : `${Math.floor(sim.uptime / 60)}m`}
                </span>
              </>
            ) : (
              <>
                <StatusDot status="offline" />
                <span className="text-[10px] text-dim">stopped</span>
              </>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {sim && (
            <button
              onClick={handleStop}
              className="border border-wire px-3 py-1.5 text-[10px] text-red-400 hover:bg-red-400/10 transition-colors"
            >
              STOP
            </button>
          )}
          <button
            onClick={() => router.push("/simulators")}
            className="border border-wire px-3 py-1.5 text-[10px] text-dim hover:text-signal transition-colors"
          >
            BACK
          </button>
        </div>
      </div>

      {/* Device State (if connected) */}
      {connected && Object.keys(state).length > 0 && (
        <section>
          <h2 className="text-[10px] text-dim uppercase tracking-wider mb-2">Live State</h2>
          <div className="border border-wire bg-void p-3 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {Object.entries(state).slice(0, 24).map(([key, value]) => (
              <div key={key} className="text-[10px]">
                <span className="text-dim">{key}: </span>
                <span className="text-phosphor">{typeof value === "number" ? value.toFixed(3) : value}</span>
              </div>
            ))}
            {Object.keys(state).length > 24 && (
              <div className="text-[10px] text-dim-dark">+{Object.keys(state).length - 24} more</div>
            )}
          </div>
        </section>
      )}

      {/* Logs */}
      <section>
        <div className="border border-wire bg-void">
          <div className="flex items-center justify-between border-b border-wire px-3 py-1.5">
            <span className="text-[10px] text-dim uppercase tracking-wider">Simulator Logs</span>
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`text-[10px] px-2 py-0.5 border border-wire transition-colors ${
                autoScroll ? "text-phosphor" : "text-dim"
              }`}
            >
              {autoScroll ? "AUTO-SCROLL ON" : "AUTO-SCROLL OFF"}
            </button>
          </div>
          <div
            ref={containerRef}
            className="h-96 overflow-y-auto p-3 font-mono text-[11px] leading-5"
            onScroll={(e) => {
              const el = e.currentTarget;
              const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 20;
              if (!atBottom && autoScroll) setAutoScroll(false);
              if (atBottom && !autoScroll) setAutoScroll(true);
            }}
          >
            {!logsData || logsData.lines.length === 0 ? (
              <span className="text-dim">No logs yet...</span>
            ) : (
              logsData.lines.map((line, i) => {
                const isError = line.toLowerCase().includes("error");
                const isMujoco = line.startsWith("[mujoco]");
                return (
                  <div
                    key={i}
                    className={
                      isError
                        ? "text-red-400"
                        : isMujoco
                          ? "text-phosphor-dim"
                          : "text-dim"
                    }
                  >
                    {line}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
