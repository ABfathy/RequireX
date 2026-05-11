"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "rx-theme";

export function useTheme() {
  /*
   * Always start with "dark" — matches the server-rendered HTML default so
   * hydration never mismatches. After mount, a single effect reads localStorage
   * and corrects the theme if the user persisted something different.
   */
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTheme(stored === "light" ? "light" : "dark");
      return;
    }
    // No manual preference — follow the system setting and keep listening
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setTheme(mq.matches ? "dark" : "light");
    const listener = (e: MediaQueryListEvent) =>
      setTheme(e.matches ? "dark" : "light");
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, []);

  /* Sync to DOM + persist + broadcast on every change */
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem(STORAGE_KEY, theme);
    window.dispatchEvent(new CustomEvent("rx-theme-change", { detail: theme }));
  }, [theme]);

  function toggle() {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }

  return { theme, toggle } as const;
}
