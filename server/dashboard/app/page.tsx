"use client";

import { useCallback } from "react";
import Link from "next/link";
import { usePoll } from "@/lib/use-poll";
import { getStatus, discover } from "@/lib/origin-api";
import { DeviceCard } from "@/components/device-card";
import { RunningAppCard } from "@/components/running-app-card";

export default function HomePage() {
  const fetcher = useCallback(() => getStatus(), []);
  const { data: status, loading, refresh } = usePoll(fetcher, 5000);

  if (loading || !status) {
    return <div className="text-dim text-xs mt-12">Connecting to Origin server...</div>;
  }

  const handleDiscover = async () => {
    try {
      await discover();
      refresh();
    } catch {}
  };

  return (
    <div className="space-y-8">
      {/* Devices */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs text-dim uppercase tracking-wider">Connected Devices</h2>
          <button
            onClick={handleDiscover}
            className="border border-wire px-3 py-1 text-[11px] text-dim hover:text-signal hover:border-wire-bright transition-colors"
          >
            DISCOVER
          </button>
        </div>
        {status.devices.length === 0 ? (
          <div className="border border-wire bg-panel p-6 text-center">
            <p className="text-dim text-xs">No devices connected</p>
            <p className="text-dim-dark text-[10px] mt-1">Connect hardware or start a simulator, then click Discover</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {status.devices.map((d) => (
              <DeviceCard
                key={d.id}
                id={d.id}
                type={d.type}
                displayName={d.displayName}
                connected={d.connected}
                stateKeyCount={d.stateKeyCount}
                actionCount={d.actionCount}
              />
            ))}
          </div>
        )}
      </section>

      {/* Running Apps */}
      {status.apps.running.length > 0 && (
        <section>
          <h2 className="text-xs text-dim uppercase tracking-wider mb-4">Running Apps</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {status.apps.running.map((app) => (
              <RunningAppCard
                key={app.id}
                id={app.id}
                name={app.name}
                deviceId={app.deviceId}
                frontendUrl={app.frontendUrl}
                status={app.status}
                uptime={app.uptime}
              />
            ))}
          </div>
        </section>
      )}

      {/* Running Simulators */}
      {(status.simulators?.running?.length ?? 0) > 0 && (
        <section>
          <h2 className="text-xs text-dim uppercase tracking-wider mb-4">Running Simulators</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {status.simulators!.running.map((sim) => (
              <Link
                key={sim.deviceId}
                href={`/simulators/detail?id=${encodeURIComponent(sim.deviceId)}`}
                className="border border-wire bg-panel p-4 hover:border-wire-bright transition-colors block"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-phosphor text-[10px]">&#9654;</span>
                  <span className="text-xs text-signal">{sim.model}</span>
                </div>
                <div className="text-[10px] text-dim">
                  device: {sim.deviceId} | {sim.headless ? "headless" : "viewer"} | {sim.hz} Hz
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Quick Actions */}
      <section>
        <h2 className="text-xs text-dim uppercase tracking-wider mb-4">Quick Actions</h2>
        <div className="flex gap-3">
          <Link
            href="/simulators"
            className="border border-wire bg-panel px-4 py-2 text-[11px] text-phosphor hover:bg-phosphor-glow transition-colors"
          >
            LAUNCH SIMULATOR
          </Link>
          <Link
            href="/apps/install"
            className="border border-wire bg-panel px-4 py-2 text-[11px] text-phosphor hover:bg-phosphor-glow transition-colors"
          >
            INSTALL APP
          </Link>
          <Link
            href="/apps"
            className="border border-wire bg-panel px-4 py-2 text-[11px] text-dim hover:text-signal hover:border-wire-bright transition-colors"
          >
            VIEW ALL APPS ({status.apps.installed})
          </Link>
        </div>
      </section>
    </div>
  );
}
