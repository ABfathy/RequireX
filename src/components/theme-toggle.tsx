"use client";

import { Icons } from "@/components/icons";
import { useTheme } from "@/lib/hooks/use-theme";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="inline-grid place-items-center w-8 h-8 rounded-[6px] transition-colors duration-[120ms] hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] cursor-pointer"
      style={{ color: "var(--fg-muted)" }}
    >
      {theme === "dark"
        ? <Icons.Sun size={15} />
        : <Icons.Moon size={15} />
      }
    </button>
  );
}
