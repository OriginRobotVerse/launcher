import Link from "next/link";
import { StatusDot } from "./status-dot";
import type { AppSummary } from "@/lib/types";

export function AppCard({ app }: { app: AppSummary }) {
  return (
    <Link
      href={`/apps/${encodeURIComponent(app.id)}`}
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
    </Link>
  );
}
