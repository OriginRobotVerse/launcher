"use client";

import { useCallback, useState } from "react";
import { usePoll } from "@/lib/use-poll";
import { getSimulators, launchSimulator, stopSimulator } from "@/lib/origin-api";
import { SimulatorCard } from "@/components/simulator-card";

export default function SimulatorsPage() {
  const fetcher = useCallback(() => getSimulators(), []);
  const { data, loading, refresh } = usePoll(fetcher, 3000);
  const [launchingModel, setLaunchingModel] = useState<string | null>(null);

  const handleLaunch = async (modelId: string, headless: boolean) => {
    setLaunchingModel(modelId);
    try {
      await launchSimulator({ model: modelId, headless });
      // Give the simulator a moment to connect
      setTimeout(refresh, 2000);
    } catch (err) {
      console.error("Failed to launch simulator:", err);
    } finally {
      setLaunchingModel(null);
    }
  };

  const handleStop = async (deviceId: string) => {
    try {
      await stopSimulator(deviceId);
      refresh();
    } catch (err) {
      console.error("Failed to stop simulator:", err);
    }
  };

  if (loading || !data) {
    return <div className="text-dim text-xs mt-12">Loading simulators...</div>;
  }

  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs text-dim uppercase tracking-wider">MuJoCo Simulators</h2>
          {data.running.length > 0 && (
            <span className="text-[10px] text-phosphor">
              {data.running.length} running
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.models.map((model) => (
            <SimulatorCard
              key={model.id}
              modelId={model.id}
              name={model.name}
              type={model.type}
              description={model.description}
              running={model.running}
              deviceId={model.deviceId}
              status={model.status}
              uptime={model.uptime}
              onLaunch={handleLaunch}
              onStop={handleStop}
              launching={launchingModel === model.id}
            />
          ))}
        </div>
      </section>

      {data.running.length > 0 && (
        <section>
          <h2 className="text-xs text-dim uppercase tracking-wider mb-4">Running Details</h2>
          <div className="border border-wire bg-panel">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-wire text-dim text-left">
                  <th className="px-3 py-2 font-normal">MODEL</th>
                  <th className="px-3 py-2 font-normal">DEVICE ID</th>
                  <th className="px-3 py-2 font-normal">STATUS</th>
                  <th className="px-3 py-2 font-normal">MODE</th>
                  <th className="px-3 py-2 font-normal">HZ</th>
                  <th className="px-3 py-2 font-normal">UPTIME</th>
                </tr>
              </thead>
              <tbody>
                {data.running.map((sim) => (
                  <tr key={sim.deviceId} className="border-b border-wire last:border-b-0">
                    <td className="px-3 py-2 text-signal">{sim.model}</td>
                    <td className="px-3 py-2 text-phosphor">{sim.deviceId}</td>
                    <td className="px-3 py-2 text-dim">{sim.status}</td>
                    <td className="px-3 py-2 text-dim">{sim.headless ? "headless" : "viewer"}</td>
                    <td className="px-3 py-2 text-dim">{sim.hz}</td>
                    <td className="px-3 py-2 text-dim">
                      {sim.uptime < 60 ? `${sim.uptime}s` : `${Math.floor(sim.uptime / 60)}m`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
