"use client";

import { createContext, useContext, useState, useCallback, useRef } from "react";
import type { ReactNode } from "react";
// --- Types ---

export interface StateSnapshot {
  state: Record<string, number>;
  deviceId: string;
  timestamp: number;
}

export interface ActivityEntry {
  id: string;
  type: "action" | "policy" | "state" | "command";
  label: string;
  status: "executing" | "success" | "error";
  detail?: string;
  timestamp: number;
}

interface TelemetryState {
  /** Whether the side panel is open */
  panelOpen: boolean;
  togglePanel: () => void;
  openPanel: () => void;

  /** Most recent state snapshot from get_state */
  latestState: StateSnapshot | null;
  pushState: (state: Record<string, number>, deviceId: string) => void;

  /** Recent activity log (actions, policies, commands) */
  activity: ActivityEntry[];
  pushActivity: (entry: Omit<ActivityEntry, "id" | "timestamp">) => void;

  /** Number of state updates since panel was last viewed */
  unreadCount: number;
  clearUnread: () => void;
}

const TelemetryContext = createContext<TelemetryState | null>(null);

export function useTelemetry() {
  const ctx = useContext(TelemetryContext);
  if (!ctx) throw new Error("useTelemetry must be used within TelemetryProvider");
  return ctx;
}

// --- Provider ---

const MAX_ACTIVITY = 50;

export function TelemetryProvider({ children }: { children: ReactNode }) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [latestState, setLatestState] = useState<StateSnapshot | null>(null);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const idCounter = useRef(0);

  const togglePanel = useCallback(() => {
    setPanelOpen((prev) => {
      if (!prev) setUnreadCount(0); // opening clears unread
      return !prev;
    });
  }, []);

  const openPanel = useCallback(() => {
    setPanelOpen(true);
    setUnreadCount(0);
  }, []);

  const pushState = useCallback(
    (state: Record<string, number>, deviceId: string) => {
      setLatestState({ state, deviceId, timestamp: Date.now() });
      setPanelOpen((open) => {
        if (!open) setUnreadCount((c) => c + 1);
        return open;
      });
    },
    [],
  );

  const pushActivity = useCallback(
    (entry: Omit<ActivityEntry, "id" | "timestamp">) => {
      const id = `act-${++idCounter.current}`;
      setActivity((prev) => [{ ...entry, id, timestamp: Date.now() }, ...prev].slice(0, MAX_ACTIVITY));
    },
    [],
  );

  const clearUnread = useCallback(() => setUnreadCount(0), []);

  return (
    <TelemetryContext.Provider
      value={{
        panelOpen,
        togglePanel,
        openPanel,
        latestState,
        pushState,
        activity,
        pushActivity,
        unreadCount,
        clearUnread,
      }}
    >
      {children}
    </TelemetryContext.Provider>
  );
}
