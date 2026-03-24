"use client";

import { Suspense, useCallback, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { usePoll } from "@/lib/use-poll";
import { useDeviceSSE } from "@/lib/use-sse";
import { getDevice, getProfile, saveProfile, deleteProfile } from "@/lib/origin-api";
import { StateViewer } from "@/components/state-viewer";
import { StatusDot } from "@/components/status-dot";
import type { DeviceProfile, DeviceType } from "@/lib/types";

export default function DeviceDetailPage() {
  return (
    <Suspense fallback={<div className="text-dim text-xs mt-12">Loading device...</div>}>
      <DeviceDetailInner />
    </Suspense>
  );
}

function DeviceDetailInner() {
  const searchParams = useSearchParams();
  const deviceId = searchParams.get("id") ?? "";

  const deviceFetcher = useCallback(() => getDevice(deviceId), [deviceId]);
  const profileFetcher = useCallback(() => getProfile(deviceId), [deviceId]);

  const { data: device, loading: deviceLoading } = usePoll(deviceFetcher, 10000);
  const { data: profile, loading: profileLoading, refresh: refreshProfile } = usePoll(profileFetcher, 30000);
  const { state: liveState, connected } = useDeviceSSE(deviceId);

  // Profile editing state
  const [editing, setEditing] = useState(false);
  const [editProfile, setEditProfile] = useState<DeviceProfile | null>(null);

  useEffect(() => {
    if (profile && !editing) {
      setEditProfile(profile);
    }
  }, [profile, editing]);

  if (!deviceId) {
    return <div className="text-dim text-xs mt-12">No device ID specified</div>;
  }

  if (deviceLoading || !device) {
    return <div className="text-dim text-xs mt-12">Loading device...</div>;
  }

  const mergedState = { ...device.state, ...liveState };

  const handleSaveProfile = async () => {
    if (!editProfile) return;
    try {
      await saveProfile(deviceId, editProfile);
      setEditing(false);
      refreshProfile();
    } catch (err) {
      console.error("Failed to save profile:", err);
    }
  };

  const handleResetProfile = async () => {
    try {
      await deleteProfile(deviceId);
      setEditing(false);
      refreshProfile();
    } catch (err) {
      console.error("Failed to reset profile:", err);
    }
  };

  return (
    <div className="space-y-8">
      {/* Device Info */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <StatusDot status={connected ? "connected" : "offline"} />
          <h1 className="text-sm font-medium text-signal">{profile?.displayName ?? deviceId}</h1>
          {profile?.type && (
            <span className="text-[10px] text-dim border border-wire px-1.5 py-0.5 uppercase tracking-wider">
              {profile.type}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border border-wire bg-panel p-4">
          <div>
            <span className="text-[10px] text-dim uppercase tracking-wider block mb-1">Version</span>
            <span className="text-[11px] text-signal">{device.version}</span>
          </div>
          <div>
            <span className="text-[10px] text-dim uppercase tracking-wider block mb-1">Connected</span>
            <span className="text-[11px] text-signal">{new Date(device.connectedAt).toLocaleTimeString()}</span>
          </div>
          <div>
            <span className="text-[10px] text-dim uppercase tracking-wider block mb-1">Actions</span>
            <span className="text-[11px] text-signal">{device.manifest.actions.length}</span>
          </div>
          <div>
            <span className="text-[10px] text-dim uppercase tracking-wider block mb-1">State Keys</span>
            <span className="text-[11px] text-signal">{device.manifest.state.length}</span>
          </div>
        </div>

        {/* Actions list */}
        <div className="border border-wire bg-panel p-4 mt-3">
          <span className="text-[10px] text-dim uppercase tracking-wider block mb-2">Actions</span>
          <div className="flex flex-wrap gap-2">
            {device.manifest.actions.map((action) => (
              <span key={action} className="text-[11px] text-phosphor border border-phosphor/20 bg-phosphor-glow px-2 py-0.5">
                {action}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Live State */}
      <section>
        <h2 className="text-xs text-dim uppercase tracking-wider mb-4">Live State</h2>
        <div className="border border-wire bg-panel p-4">
          <StateViewer state={mergedState} groups={profile?.stateGroups} />
        </div>
      </section>

      {/* Profile Configuration */}
      {profile && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs text-dim uppercase tracking-wider">Profile Configuration</h2>
            <div className="flex gap-2">
              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="border border-wire px-3 py-1 text-[11px] text-dim hover:text-signal transition-colors"
                >
                  EDIT
                </button>
              )}
              {editing && (
                <>
                  <button
                    onClick={handleSaveProfile}
                    className="border border-phosphor/30 px-3 py-1 text-[11px] text-phosphor hover:bg-phosphor-glow transition-colors"
                  >
                    SAVE
                  </button>
                  <button
                    onClick={() => { setEditing(false); setEditProfile(profile); }}
                    className="border border-wire px-3 py-1 text-[11px] text-dim hover:text-signal transition-colors"
                  >
                    CANCEL
                  </button>
                </>
              )}
            </div>
          </div>

          {profile.needsConfiguration && (
            <div className="border border-amber-600/30 bg-amber-600/5 p-3 mb-4">
              <p className="text-[11px] text-amber-600">
                This device hasn&apos;t been configured. Set up its profile to enable app compatibility checking.
              </p>
            </div>
          )}

          <div className="border border-wire bg-panel p-4 space-y-4">
            {/* Type */}
            <div>
              <label className="text-[10px] text-dim uppercase tracking-wider block mb-1">Device Type</label>
              {editing ? (
                <select
                  value={editProfile?.type ?? "generic"}
                  onChange={(e) => setEditProfile((p) => p ? { ...p, type: e.target.value as DeviceType } : p)}
                  className="bg-void border border-wire px-3 py-1.5 text-[11px] text-signal focus:border-phosphor focus:outline-none"
                >
                  <option value="wheeled">wheeled</option>
                  <option value="quadruped">quadruped</option>
                  <option value="humanoid">humanoid</option>
                  <option value="arm">arm</option>
                  <option value="generic">generic</option>
                </select>
              ) : (
                <span className="text-[11px] text-signal">{profile.type}</span>
              )}
            </div>

            {/* Display Name */}
            <div>
              <label className="text-[10px] text-dim uppercase tracking-wider block mb-1">Display Name</label>
              {editing ? (
                <input
                  value={editProfile?.displayName ?? ""}
                  onChange={(e) => setEditProfile((p) => p ? { ...p, displayName: e.target.value } : p)}
                  className="w-full bg-void border border-wire px-3 py-1.5 text-[11px] text-signal focus:border-phosphor focus:outline-none"
                />
              ) : (
                <span className="text-[11px] text-signal">{profile.displayName}</span>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="text-[10px] text-dim uppercase tracking-wider block mb-1">Description</label>
              {editing ? (
                <input
                  value={editProfile?.description ?? ""}
                  onChange={(e) => setEditProfile((p) => p ? { ...p, description: e.target.value } : p)}
                  className="w-full bg-void border border-wire px-3 py-1.5 text-[11px] text-signal focus:border-phosphor focus:outline-none"
                />
              ) : (
                <span className="text-[11px] text-signal">{profile.description}</span>
              )}
            </div>

            {/* Capabilities */}
            <div>
              <label className="text-[10px] text-dim uppercase tracking-wider block mb-2">Capabilities</label>
              <div className="grid grid-cols-2 gap-2">
                {(["positionControl", "torqueControl", "locomotion", "manipulation"] as const).map((cap) => (
                  <label key={cap} className="flex items-center gap-2 text-[11px] text-dim">
                    {editing ? (
                      <input
                        type="checkbox"
                        checked={editProfile?.capabilities[cap] ?? false}
                        onChange={(e) =>
                          setEditProfile((p) =>
                            p ? { ...p, capabilities: { ...p.capabilities, [cap]: e.target.checked } } : p
                          )
                        }
                        className="accent-amber-500"
                      />
                    ) : (
                      <span className={profile.capabilities[cap] ? "text-phosphor" : "text-dim-dark"}>
                        {profile.capabilities[cap] ? "✓" : "✗"}
                      </span>
                    )}
                    {cap}
                  </label>
                ))}
              </div>
            </div>

            {/* Reset to default */}
            {editing && (
              <button
                onClick={handleResetProfile}
                className="border border-red-500/30 px-3 py-1 text-[11px] text-red-400 hover:bg-red-500/5 transition-colors"
              >
                RESET TO DEFAULT
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
