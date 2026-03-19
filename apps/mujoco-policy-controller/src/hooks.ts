import { useState, useEffect, useRef, useCallback } from "react";
import { api, type PolicyInfo, type Status, type DeviceInfo } from "./api.ts";

export function usePolicies() {
  const [policies, setPolicies] = useState<PolicyInfo[]>([]);

  const refresh = useCallback(async () => {
    try {
      setPolicies(await api.getPolicies());
    } catch {
      /* server not ready */
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { policies, refresh };
}

export function useStatus(intervalMs = 200) {
  const [status, setStatus] = useState<Status | null>(null);
  const ref = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    const poll = async () => {
      try {
        setStatus(await api.getStatus());
      } catch {
        /* server not ready */
      }
    };
    poll();
    ref.current = setInterval(poll, intervalMs);
    return () => clearInterval(ref.current);
  }, [intervalMs]);

  return status;
}

export function useDevice() {
  const [device, setDevice] = useState<DeviceInfo | null>(null);

  useEffect(() => {
    api.getDevice().then(setDevice).catch(() => {});
  }, []);

  return device;
}
