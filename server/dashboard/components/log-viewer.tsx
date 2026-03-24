"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getAppLogs } from "@/lib/origin-api";

export function LogViewer({ appId }: { appId: string }) {
  const [lines, setLines] = useState<string[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchLogs = useCallback(async () => {
    try {
      const result = await getAppLogs(appId);
      setLines(result.lines);
    } catch {}
  }, [appId]);

  useEffect(() => {
    fetchLogs();
    const id = setInterval(fetchLogs, 2000);
    return () => clearInterval(id);
  }, [fetchLogs]);

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [lines, autoScroll]);

  return (
    <div className="border border-wire bg-void">
      <div className="flex items-center justify-between border-b border-wire px-3 py-1.5">
        <span className="text-[10px] text-dim uppercase tracking-wider">Logs</span>
        <button
          onClick={() => setAutoScroll(!autoScroll)}
          className={`text-[10px] px-2 py-0.5 border border-wire transition-colors ${
            autoScroll ? "text-phosphor" : "text-dim"
          }`}
        >
          {autoScroll ? "AUTO-SCROLL ON" : "AUTO-SCROLL OFF"}
        </button>
      </div>
      <div
        ref={containerRef}
        className="h-80 overflow-y-auto p-3 font-mono text-[11px] leading-5"
        onScroll={(e) => {
          const el = e.currentTarget;
          const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 20;
          if (!atBottom && autoScroll) setAutoScroll(false);
          if (atBottom && !autoScroll) setAutoScroll(true);
        }}
      >
        {lines.length === 0 ? (
          <span className="text-dim">No logs yet...</span>
        ) : (
          lines.map((line, i) => {
            const isBackend = line.startsWith("[backend]");
            const isError = line.toLowerCase().includes("error");
            return (
              <div
                key={i}
                className={
                  isError
                    ? "text-red-400"
                    : isBackend
                      ? "text-phosphor-dim"
                      : "text-dim"
                }
              >
                {line}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
