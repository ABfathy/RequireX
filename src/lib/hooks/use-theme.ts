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
    if (stored === "light") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTheme("light");
    }
  }, []);

  /* Sync to DOM + persist on every change */
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  function toggle() {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }

  return { theme, toggle } as const;
}
