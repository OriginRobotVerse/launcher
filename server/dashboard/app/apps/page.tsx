"use client";

import { useCallback } from "react";
import Link from "next/link";
import { usePoll } from "@/lib/use-poll";
import { getApps } from "@/lib/origin-api";
import { AppCard } from "@/components/app-card";

export default function AppsPage() {
  const fetcher = useCallback(() => getApps(), []);
  const { data, loading } = usePoll(fetcher, 5000);

  if (loading) {
    return <div className="text-dim text-xs mt-12">Loading apps...</div>;
  }

  const apps = data?.apps ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xs text-dim uppercase tracking-wider">Installed Apps</h1>
        <Link
          href="/apps/install"
          className="border border-wire px-3 py-1 text-[11px] text-phosphor hover:bg-phosphor-glow transition-colors"
        >
          INSTALL APP
        </Link>
      </div>

      <div className="border border-wire bg-panel p-3 mb-4">
        <p className="text-[11px] text-dim">
          Install apps or request new ones from the{" "}
          <a
            href="https://store.origin-industries.systems/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-phosphor hover:underline"
          >
            Origin Marketplace
          </a>
        </p>
      </div>

      {apps.length === 0 ? (
        <div className="border border-wire bg-panel p-8 text-center">
          <p className="text-dim text-xs">No apps installed</p>
          <p className="text-dim-dark text-[10px] mt-1">Install one from GitHub or a local path</p>
          <Link
            href="/apps/install"
            className="inline-block mt-4 border border-wire px-4 py-2 text-[11px] text-phosphor hover:bg-phosphor-glow transition-colors"
          >
            INSTALL APP
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {apps.map((app) => (
            <AppCard key={app.id} app={app} />
          ))}
        </div>
      )}
    </div>
  );
}
