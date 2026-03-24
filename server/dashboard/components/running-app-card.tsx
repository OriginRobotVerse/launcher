"use client";

import Link from "next/link";
import { StatusDot } from "./status-dot";
import { stopApp } from "@/lib/origin-api";
import { useRouter } from "next/navigation";

interface RunningAppCardProps {
  id: string;
  name: string;
  deviceId: string;
  frontendUrl: string;
  status: string;
  uptime: number;
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

export function RunningAppCard({ id, name, deviceId, frontendUrl, status, uptime }: RunningAppCardProps) {
  const router = useRouter();

  const handleStop = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await stopApp(id);
      router.refresh();
    } catch (err) {
      console.error("Failed to stop app:", err);
    }
  };

  return (
    <Link
      href={`/apps/running?id=${encodeURIComponent(id)}`}
      className="block border border-wire bg-panel p-4 hover:border-wire-bright hover:bg-panel-raised transition-colors"
    >
      <div className="flex items-center gap-2 mb-2">
        <StatusDot status={status === "running" ? "running" : status === "error" ? "error" : "starting"} />
        <span className="text-sm font-medium text-signal">{name}</span>
      </div>
      <div className="flex items-center gap-4 text-[11px] text-dim mb-3">
        <span>device: {deviceId}</span>
        <span>uptime: {formatUptime(uptime)}</span>
      </div>
      <div className="flex items-center gap-2">
        <a
          href={frontendUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="border border-wire px-3 py-1 text-[11px] text-phosphor hover:bg-phosphor-glow transition-colors"
        >
          OPEN
        </a>
        <button
          onClick={handleStop}
          className="border border-wire px-3 py-1 text-[11px] text-dim hover:text-red-400 hover:border-red-400/30 transition-colors"
        >
          STOP
        </button>
      </div>
    </Link>
  );
}
