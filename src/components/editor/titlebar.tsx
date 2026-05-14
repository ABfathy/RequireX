"use client";

import Link from "next/link";

import { Icons, RxLogo } from "@/components/icons";
import { IconButton } from "@/components/ui/icon-button";
import { Kbd } from "@/components/ui/kbd";
import { useIsMac } from "@/lib/hooks/use-is-mac";

interface TitleBarProps {
  sidebarOpen: boolean;
  rightOpen: boolean;
  theme: "dark" | "light" | null;
  onToggleSidebar: () => void;
  onToggleRight: () => void;
  onToggleTheme: () => void;
  onOpenPalette: () => void;
}

export function TitleBar({
  sidebarOpen,
  rightOpen,
  theme,
  onToggleSidebar,
  onToggleRight,
  onToggleTheme,
  onOpenPalette,
}: TitleBarProps) {
  const isMac = useIsMac();
  return (
    <div
      className="flex items-center h-8 px-3 gap-3 border-b shrink-0 select-none"
      style={{
        background: "var(--surface-1)",
        borderColor: "var(--border)",
      }}
    >
      {/* Brand */}
      <Link
        href="/"
        className="flex items-center gap-1.5 h-[22px] px-2 rounded-[4px] transition-colors duration-[120ms] hover:bg-[var(--surface-3)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)] shrink-0"
        aria-label="RequireX — go to home"
      >
        <RxLogo size={18} className="text-[var(--accent)]" />
        <span
          className="text-[12px] font-semibold tracking-[-0.01em]"
          style={{ color: "var(--fg-primary)" }}
          translate="no"
        >
          RequireX
        </span>
      </Link>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Menu trigger */}
      <button
        type="button"
        onClick={onOpenPalette}
        className="flex items-center gap-2.5 h-[26px] px-3 rounded-[6px] border transition-colors duration-[120ms] hover:bg-[var(--surface-3)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)] cursor-pointer shrink-0"
        style={{
          background: "var(--surface-2)",
          borderColor: "var(--border-strong)",
          color: "var(--fg-muted)",
          minWidth: 160,
        }}
      >
        <Icons.Search
          size={12}
          aria-hidden="true"
          style={{ color: "var(--fg-tertiary)" }}
        />
        <span
          className="flex-1 text-left text-[12px]"
          style={{ color: "var(--fg-muted)" }}
        >
          Commands &amp; actions
        </span>
        <Kbd>{isMac ? "⌘K" : "Ctrl+K"}</Kbd>
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right tools */}
      <div className="flex items-center gap-1 shrink-0">
        <IconButton
          label="Toggle sidebar"
          active={sidebarOpen}
          onClick={onToggleSidebar}
        >
          <Icons.Sidebar size={14} />
        </IconButton>
        <IconButton
          label="Toggle right panel"
          active={rightOpen}
          onClick={onToggleRight}
        >
          <Icons.PanelRight size={14} />
        </IconButton>
        <IconButton
          label={
            theme === null
              ? "Toggle theme"
              : theme === "dark"
                ? "Switch to light mode"
                : "Switch to dark mode"
          }
          onClick={onToggleTheme}
          suppressHydrationWarning
        >
          {theme === null ? (
            <span aria-hidden="true" style={{ width: 14, height: 14 }} />
          ) : theme === "dark" ? (
            <Icons.Sun size={14} />
          ) : (
            <Icons.Moon size={14} />
          )}
        </IconButton>
      </div>
    </div>
  );
}
