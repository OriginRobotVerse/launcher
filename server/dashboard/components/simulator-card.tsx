"use client";

import Link from "next/link";
import { StatusDot } from "./status-dot";

interface SimulatorCardProps {
  modelId: string;
  name: string;
  type: string;
  description: string;
  running: boolean;
  deviceId?: string;
  status?: string;
  uptime?: number;
  onLaunch: (modelId: string, headless: boolean) => void;
  onStop: (deviceId: string) => void;
  launching?: boolean;
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

export function SimulatorCard({
  modelId,
  name,
  type,
  description,
  running,
  deviceId,
  status,
  uptime,
  onLaunch,
  onStop,
  launching,
}: SimulatorCardProps) {
  return (
    <div className="border border-wire bg-panel p-4 hover:border-wire-bright transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="text-xs text-signal font-medium">{name}</div>
          <div className="text-[10px] text-dim mt-0.5">{description}</div>
        </div>
        <span className="text-[9px] text-dim-dark border border-wire px-1.5 py-0.5 uppercase">
          {type}
        </span>
      </div>

      {running && deviceId ? (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2">
            <StatusDot status="running" />
            <span className="text-[10px] text-phosphor">
              {status} as {deviceId}
            </span>
            {uptime !== undefined && (
              <span className="text-[10px] text-dim ml-auto">{formatUptime(uptime)}</span>
            )}
          </div>
          <div className="flex gap-2">
            <Link
              href={`/simulators/${encodeURIComponent(deviceId)}`}
              className="border border-wire px-2 py-1 text-[10px] text-dim hover:text-signal hover:border-wire-bright transition-colors"
            >
              LOGS
            </Link>
            <button
              onClick={() => onStop(deviceId)}
              className="border border-wire px-2 py-1 text-[10px] text-red-400 hover:bg-red-400/10 transition-colors"
            >
              STOP
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => onLaunch(modelId, true)}
            disabled={launching}
            className="border border-wire px-2 py-1 text-[10px] text-phosphor hover:bg-phosphor-glow transition-colors disabled:opacity-50"
          >
            {launching ? "STARTING..." : "LAUNCH HEADLESS"}
          </button>
          <button
            onClick={() => onLaunch(modelId, false)}
            disabled={launching}
            className="border border-wire px-2 py-1 text-[10px] text-dim hover:text-signal hover:border-wire-bright transition-colors disabled:opacity-50"
          >
            {launching ? "..." : "LAUNCH WITH VIEWER"}
          </button>
        </div>
      )}
    </div>
  );
}
