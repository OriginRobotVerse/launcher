"use client";

import { useCallback, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePoll } from "@/lib/use-poll";
import { getApp, getDevices, launchApp, uninstallApp } from "@/lib/origin-api";
import { SecretForm } from "@/components/secret-form";
import { CompatibilityBadge } from "@/components/compatibility-badge";

export default function AppDetailPage() {
  const params = useParams();
  const router = useRouter();
  const appId = params.id as string;

  const appFetcher = useCallback(() => getApp(appId), [appId]);
  const devicesFetcher = useCallback(() => getDevices(), []);

  const { data: app, loading: appLoading, refresh } = usePoll(appFetcher, 5000);
  const { data: devices } = usePoll(devicesFetcher, 10000);

  const [selectedDevice, setSelectedDevice] = useState("");
  const [mode, setMode] = useState<"dev" | "prod">("dev");
  const [launching, setLaunching] = useState(false);
  const [showConfirmUninstall, setShowConfirmUninstall] = useState(false);

  if (appLoading || !app) {
    return <div className="text-dim text-xs mt-12">Loading app...</div>;
  }

  // If running, redirect to running page
  if (app.running) {
    router.push(`/apps/${encodeURIComponent(appId)}/running`);
    return null;
  }

  const compatibleDevices = devices
    ? devices.filter((d) => app.compatibility[d.id]?.compatible)
    : [];
  const allSecretsConfigured = app.secrets.every((s) => !s.required || s.configured);
  const canLaunch = allSecretsConfigured && selectedDevice;

  const handleLaunch = async () => {
    if (!selectedDevice) return;
    setLaunching(true);
    try {
      await launchApp(appId, { deviceId: selectedDevice, mode });
      router.push(`/apps/${encodeURIComponent(appId)}/running`);
    } catch (err) {
      console.error("Failed to launch:", err);
      setLaunching(false);
    }
  };

  const handleUninstall = async () => {
    try {
      await uninstallApp(appId);
      router.push("/apps");
    } catch (err) {
      console.error("Failed to uninstall:", err);
    }
  };

  return (
    <div className="space-y-8">
      {/* App Info */}
      <section>
        <h1 className="text-sm font-medium text-signal mb-1">{app.manifest.name}</h1>
        {app.manifest.description && (
          <p className="text-[11px] text-dim mb-4">{app.manifest.description}</p>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border border-wire bg-panel p-4">
          <div>
            <span className="text-[10px] text-dim uppercase tracking-wider block mb-1">Version</span>
            <span className="text-[11px] text-signal">{app.manifest.version}</span>
          </div>
          <div>
            <span className="text-[10px] text-dim uppercase tracking-wider block mb-1">Author</span>
            <span className="text-[11px] text-signal">{app.manifest.author ?? "—"}</span>
          </div>
          <div>
            <span className="text-[10px] text-dim uppercase tracking-wider block mb-1">Device Type</span>
            <span className="text-[11px] text-signal">{app.manifest.device.type}</span>
          </div>
          <div>
            <span className="text-[10px] text-dim uppercase tracking-wider block mb-1">Runtime</span>
            <span className="text-[11px] text-signal">{app.manifest.runtime.type} (:{app.manifest.runtime.port})</span>
          </div>
        </div>
      </section>

      {/* Compatibility Matrix */}
      <section>
        <h2 className="text-xs text-dim uppercase tracking-wider mb-4">Device Compatibility</h2>
        {Object.keys(app.compatibility).length === 0 ? (
          <div className="border border-wire bg-panel p-4">
            <p className="text-[11px] text-dim">No devices connected. Connect a device and refresh.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(app.compatibility).map(([deviceId, compat]) => (
              <CompatibilityBadge key={deviceId} deviceId={deviceId} compat={compat} />
            ))}
          </div>
        )}
      </section>

      {/* Secrets */}
      {app.secrets.length > 0 && (
        <section>
          <h2 className="text-xs text-dim uppercase tracking-wider mb-4">Secrets</h2>
          <div className="border border-wire bg-panel p-4">
            <SecretForm appId={appId} secrets={app.secrets} onSaved={refresh} />
          </div>
        </section>
      )}

      {/* Launch */}
      <section>
        <h2 className="text-xs text-dim uppercase tracking-wider mb-4">Launch</h2>
        <div className="border border-wire bg-panel p-4 space-y-4">
          {/* Device selector */}
          <div>
            <label className="text-[10px] text-dim uppercase tracking-wider block mb-1.5">Device</label>
            <select
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              className="bg-void border border-wire px-3 py-1.5 text-[11px] text-signal focus:border-phosphor focus:outline-none"
            >
              <option value="">Select a device...</option>
              {compatibleDevices.map((d) => (
                <option key={d.id} value={d.id}>{d.id}</option>
              ))}
            </select>
            {compatibleDevices.length === 0 && devices && devices.length > 0 && (
              <p className="text-[10px] text-amber-600 mt-1">No compatible devices connected</p>
            )}
          </div>

          {/* Mode selector */}
          <div>
            <label className="text-[10px] text-dim uppercase tracking-wider block mb-1.5">Mode</label>
            <div className="flex gap-3">
              {(["dev", "prod"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`border px-3 py-1 text-[11px] transition-colors ${
                    mode === m
                      ? "border-phosphor/30 text-phosphor bg-phosphor-glow"
                      : "border-wire text-dim hover:text-signal"
                  }`}
                >
                  {m.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Launch button */}
          <button
            onClick={handleLaunch}
            disabled={!canLaunch || launching}
            className="border border-phosphor/30 px-6 py-2 text-[11px] text-phosphor hover:bg-phosphor-glow disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {launching ? "LAUNCHING..." : "LAUNCH"}
          </button>

          {!allSecretsConfigured && (
            <p className="text-[10px] text-amber-600">Configure required secrets before launching</p>
          )}
        </div>
      </section>

      {/* Danger Zone */}
      <section>
        <h2 className="text-xs text-dim uppercase tracking-wider mb-4">Danger Zone</h2>
        <div className="border border-red-500/20 bg-red-500/5 p-4">
          {showConfirmUninstall ? (
            <div className="space-y-3">
              <p className="text-[11px] text-red-400">Are you sure you want to uninstall {app.manifest.name}?</p>
              <div className="flex gap-3">
                <button
                  onClick={handleUninstall}
                  className="border border-red-500/30 px-4 py-1.5 text-[11px] text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  YES, UNINSTALL
                </button>
                <button
                  onClick={() => setShowConfirmUninstall(false)}
                  className="border border-wire px-4 py-1.5 text-[11px] text-dim hover:text-signal transition-colors"
                >
                  CANCEL
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowConfirmUninstall(true)}
              className="border border-red-500/30 px-4 py-1.5 text-[11px] text-red-400 hover:bg-red-500/10 transition-colors"
            >
              UNINSTALL APP
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
