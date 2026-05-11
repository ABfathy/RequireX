"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { Icons } from "@/components/icons";

const subscribe = () => () => {};

function useMounted() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();

  const isDark = resolvedTheme !== "light";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={
        mounted
          ? isDark
            ? "Switch to light mode"
            : "Switch to dark mode"
          : "Toggle theme"
      }
      suppressHydrationWarning
      className="inline-grid place-items-center w-8 h-8 rounded-[6px] transition-colors duration-[120ms] hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] cursor-pointer"
      style={{ color: "var(--fg-muted)" }}
    >
      {mounted ? (
        isDark ? (
          <Icons.Sun size={15} />
        ) : (
          <Icons.Moon size={15} />
        )
      ) : (
        <span aria-hidden="true" style={{ width: 15, height: 15 }} />
      )}
    </button>
  );
}
