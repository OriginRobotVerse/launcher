"use client";

import { useCallback } from "react";
import Link from "next/link";
import { usePoll } from "@/lib/use-poll";
import { getDevices } from "@/lib/origin-api";
import { StatusDot } from "@/components/status-dot";

export default function DevicesPage() {
  const fetcher = useCallback(() => getDevices(), []);
  const { data: devices, loading } = usePoll(fetcher, 5000);

  if (loading) {
    return <div className="text-dim text-xs mt-12">Loading devices...</div>;
  }

  return (
    <div>
      <h1 className="text-xs text-dim uppercase tracking-wider mb-6">Devices</h1>

      {!devices || devices.length === 0 ? (
        <div className="border border-wire bg-panel p-8 text-center">
          <p className="text-dim text-xs">No devices connected</p>
          <p className="text-dim-dark text-[10px] mt-1">Connect hardware or start a simulator</p>
        </div>
      ) : (
        <div className="border border-wire">
          {/* Header */}
          <div className="grid grid-cols-5 gap-4 px-4 py-2 border-b border-wire text-[10px] text-dim uppercase tracking-wider">
            <span>ID</span>
            <span>Version</span>
            <span>Actions</span>
            <span>State Keys</span>
            <span>Status</span>
          </div>
          {/* Rows */}
          {devices.map((d) => (
            <Link
              key={d.id}
              href={`/devices/detail?id=${encodeURIComponent(d.id)}`}
              className="grid grid-cols-5 gap-4 px-4 py-3 border-b border-wire last:border-b-0 hover:bg-panel-raised transition-colors"
            >
              <span className="text-[11px] text-signal font-medium">{d.id}</span>
              <span className="text-[11px] text-dim">{d.version}</span>
              <span className="text-[11px] text-dim">{d.actions.length}</span>
              <span className="text-[11px] text-dim">{d.sensorCount}</span>
              <span className="flex items-center gap-1.5">
                <StatusDot status="connected" />
                <span className="text-[11px] text-dim">connected</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
