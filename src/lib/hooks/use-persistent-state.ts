"use client";

import { useCallback, useSyncExternalStore } from "react";

const EVENT_PREFIX = "persistent-state:";

export function usePersistentState(
  key: string,
  defaultValue: number,
): [number, (next: number) => void] {
  const value = useSyncExternalStore(
    (cb) => {
      const eventName = EVENT_PREFIX + key;
      const storageHandler = (e: StorageEvent) => {
        if (e.key === key) cb();
      };
      window.addEventListener("storage", storageHandler);
      window.addEventListener(eventName, cb);
      return () => {
        window.removeEventListener("storage", storageHandler);
        window.removeEventListener(eventName, cb);
      };
    },
    () => {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return defaultValue;
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : defaultValue;
    },
    () => defaultValue,
  );

  const setValue = useCallback(
    (next: number) => {
      window.localStorage.setItem(key, String(next));
      window.dispatchEvent(new Event(EVENT_PREFIX + key));
    },
    [key],
  );

  return [value, setValue];
}
