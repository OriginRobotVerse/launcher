"use client";

import { useState } from "react";
import Link from "next/link";
import { StatusDot } from "./status-dot";
import { uninstallApp, reinstallApp } from "@/lib/origin-api";
import type { AppSummary } from "@/lib/types";

export function AppCard({ app, onChanged }: { app: AppSummary; onChanged?: () => void }) {
  const [confirm, setConfirm] = useState<"delete" | "reinstall" | null>(null);
  const [busy, setBusy] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setBusy(true);
    try {
      await uninstallApp(app.id);
      onChanged?.();
    } catch (err) {
      console.error("Failed to uninstall:", err);
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const handleReinstall = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setBusy(true);
    try {
      await reinstallApp(app.id);
      onChanged?.();
    } catch (err) {
      console.error("Failed to reinstall:", err);
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const stopProp = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <Link
      href={`/apps/detail?id=${encodeURIComponent(app.id)}`}
      className="block border border-wire bg-panel p-4 hover:border-wire-bright hover:bg-panel-raised transition-colors"
    >
      <div className="flex items-center gap-2 mb-2">
        <StatusDot status={app.running ? "running" : "offline"} />
        <span className="text-sm font-medium text-signal">{app.name}</span>
        <span className="text-[10px] text-dim">v{app.version}</span>
      </div>
      {app.description && (
        <p className="text-[11px] text-dim mb-3 line-clamp-2">{app.description}</p>
      )}
      <div className="flex items-center gap-3 text-[11px]">
        <span className="text-dim border border-wire px-1.5 py-0.5 uppercase tracking-wider">
          {app.deviceType}
        </span>
        {app.running && app.runningDeviceId && (
          <span className="text-phosphor-dim">on {app.runningDeviceId}</span>
        )}
        {!app.secretsConfigured && (
          <span className="text-amber-600 ml-auto">secrets missing</span>
        )}
        {app.secretsConfigured && !app.running && (
          <span className="text-dim ml-auto">ready</span>
        )}
      </div>

      {/* Action buttons */}
      {!app.running && (
        <div className="mt-3 pt-3 border-t border-wire" onClick={stopProp}>
          {confirm ? (
            <div className="space-y-2">
              <p className="text-[10px] text-red-400">
                {confirm === "delete"
                  ? `Delete ${app.name}?`
                  : `Reinstall ${app.name}? This will delete and re-fetch the app.`}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={confirm === "delete" ? handleDelete : handleReinstall}
                  disabled={busy}
                  className="border border-red-500/30 px-3 py-1 text-[10px] text-red-400 hover:bg-red-500/10 disabled:opacity-40 transition-colors"
                >
                  {busy ? "WORKING..." : "YES"}
                </button>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirm(null); }}
                  disabled={busy}
                  className="border border-wire px-3 py-1 text-[10px] text-dim hover:text-signal transition-colors"
                >
                  CANCEL
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              {app.source && (
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirm("reinstall"); }}
                  className="border border-wire px-3 py-1 text-[10px] text-dim hover:text-signal hover:border-wire-bright transition-colors"
                >
                  REINSTALL
                </button>
              )}
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirm("delete"); }}
                className="border border-wire px-3 py-1 text-[10px] text-dim hover:text-red-400 hover:border-red-500/30 transition-colors"
              >
                DELETE
              </button>
            </div>
          )}
        </div>
      )}
    </Link>
  );
}
