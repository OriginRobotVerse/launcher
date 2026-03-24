import Link from "next/link";
import { StatusDot } from "./status-dot";
import type { DeviceType } from "@/lib/types";

interface DeviceCardProps {
  id: string;
  type?: DeviceType;
  displayName?: string;
  connected: boolean;
  stateKeyCount: number;
  actionCount: number;
}

export function DeviceCard({ id, type, displayName, connected, stateKeyCount, actionCount }: DeviceCardProps) {
  return (
    <Link
      href={`/devices/${encodeURIComponent(id)}`}
      className="block border border-wire bg-panel p-4 hover:border-wire-bright hover:bg-panel-raised transition-colors"
    >
      <div className="flex items-center gap-2 mb-3">
        <StatusDot status={connected ? "connected" : "offline"} />
        <span className="text-sm font-medium text-signal">{displayName ?? id}</span>
        {type && type !== "generic" && (
          <span className="ml-auto text-[10px] text-dim border border-wire px-1.5 py-0.5 uppercase tracking-wider">
            {type}
          </span>
        )}
      </div>
      <div className="flex gap-4 text-[11px] text-dim">
        <span>{stateKeyCount} state keys</span>
        <span>{actionCount} actions</span>
      </div>
    </Link>
  );
}
