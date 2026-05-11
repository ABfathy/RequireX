"use client";

import { useTheme } from "@/lib/hooks/use-theme";

/**
 * Renders nothing — just mounts useTheme() so its side-effects (setting
 * data-theme on <html> and listening for system theme changes) run on every
 * page, including the Clerk auth pages where no other component calls useTheme.
 */
export function ThemeSync() {
  useTheme();
  return null;
}
