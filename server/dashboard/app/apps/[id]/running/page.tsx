"use client";

import { useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePoll } from "@/lib/use-poll";
import { useDeviceSSE } from "@/lib/use-sse";
import { getApp, stopApp } from "@/lib/origin-api";
import { LogViewer } from "@/components/log-viewer";
import { StateViewer } from "@/components/state-viewer";
import { StatusDot } from "@/components/status-dot";

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

export default function RunningAppPage() {
  const params = useParams();
  const router = useRouter();
  const appId = params.id as string;

  const appFetcher = useCallback(() => getApp(appId), [appId]);
  const { data: app, loading } = usePoll(appFetcher, 3000);

  // Get live state from the device this app is running on
  // We need to extract deviceId from the running app info
  const deviceId = app?.running
    ? Object.entries(app.compatibility).find(([_, c]) => c.compatible)?.[0] ?? ""
    : "";

  const { state: liveState } = useDeviceSSE(deviceId || "none");

  if (loading || !app) {
    return <div className="text-dim text-xs mt-12">Loading...</div>;
  }

  // If not running, redirect to detail page
  if (!app.running) {
    router.push(`/apps/${encodeURIComponent(appId)}`);
    return null;
  }

  const handleStop = async () => {
    try {
      await stopApp(appId);
      router.push(`/apps/${encodeURIComponent(appId)}`);
    } catch (err) {
      console.error("Failed to stop app:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Bar */}
      <div className="border border-wire bg-panel p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StatusDot status={app.status === "running" ? "running" : app.status === "error" ? "error" : "starting"} />
            <span className="text-sm font-medium text-signal">{app.manifest.name}</span>
            <span className="text-[10px] text-dim border border-wire px-1.5 py-0.5 uppercase">
              {app.status}
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-dim">
            {app.uptime !== undefined && <span>uptime: {formatUptime(app.uptime)}</span>}
          </div>
        </div>
        <div className="flex items-center gap-6 mt-3 text-[11px]">
          <div>
            <span className="text-dim">Frontend: </span>
            <a href={app.frontendUrl} target="_blank" rel="noopener noreferrer" className="text-phosphor hover:text-phosphor-bright">
              {app.frontendUrl}
            </a>
          </div>
          {app.backendUrl && (
            <div>
              <span className="text-dim">Backend: </span>
              <span className="text-signal">{app.backendUrl}</span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <a
          href={app.frontendUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="border border-phosphor/30 px-4 py-1.5 text-[11px] text-phosphor hover:bg-phosphor-glow transition-colors"
        >
          OPEN APP
        </a>
        <button
          onClick={handleStop}
          className="border border-red-500/30 px-4 py-1.5 text-[11px] text-red-400 hover:bg-red-500/10 transition-colors"
        >
          STOP
        </button>
      </div>

      {/* Logs */}
      <section>
        <h2 className="text-xs text-dim uppercase tracking-wider mb-4">Logs</h2>
        <LogViewer appId={appId} />
      </section>

      {/* Device State */}
      {deviceId && Object.keys(liveState).length > 0 && (
        <section>
          <h2 className="text-xs text-dim uppercase tracking-wider mb-4">Device State ({deviceId})</h2>
          <div className="border border-wire bg-panel p-4">
            <StateViewer state={liveState} />
          </div>
        </section>
      )}
    </div>
  );
}
