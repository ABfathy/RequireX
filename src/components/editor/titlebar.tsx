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
  mobileTitle?: string;
}

export function TitleBar({
  sidebarOpen,
  rightOpen,
  theme,
  onToggleSidebar,
  onToggleRight,
  onToggleTheme,
  onOpenPalette,
  mobileTitle,
}: TitleBarProps) {
  const isMac = useIsMac();
  return (
    <div
      className="relative flex items-center h-8 max-md:h-12 px-3 gap-3 border-b shrink-0 select-none"
      style={{
        background: "var(--surface-1)",
        borderColor: "var(--border)",
        paddingTop: "env(safe-area-inset-top, 0px)",
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
          className="text-[12px] font-semibold tracking-[-0.01em] max-md:hidden"
          style={{ color: "var(--fg-primary)" }}
          translate="no"
        >
          RequireX
        </span>
      </Link>

      {/* Mobile: centered project name */}
      {mobileTitle && (
        <span
          className="hidden max-md:block absolute left-1/2 -translate-x-1/2 text-[13px] font-medium truncate max-w-[50vw] pointer-events-none"
          style={{ color: "var(--fg-primary)" }}
        >
          {mobileTitle}
        </span>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Desktop: command palette search button */}
      <button
        type="button"
        onClick={onOpenPalette}
        className="max-md:hidden flex items-center gap-2.5 h-[26px] px-3 rounded-[6px] border bg-[var(--surface-2)] transition-[color,background-color,transform,scale] duration-[120ms] hover:bg-[var(--surface-3)] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)] cursor-pointer shrink-0"
        style={{
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

      {/* Mobile: compact icon-only search button */}
      <button
        type="button"
        onClick={onOpenPalette}
        aria-label="Commands and actions"
        className="md:hidden inline-flex items-center justify-center size-9 rounded-[6px] border bg-[var(--surface-2)] transition-[color,background-color,transform,scale] duration-[120ms] hover:bg-[var(--surface-3)] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)] cursor-pointer shrink-0"
        style={{ borderColor: "var(--border-strong)" }}
      >
        <Icons.Search size={16} style={{ color: "var(--fg-tertiary)" }} />
      </button>

      {/* Spacer */}
      <div className="flex-1 max-md:hidden" />

      {/* Right tools — desktop only (sidebar/panel toggles replaced by bottom nav on mobile) */}
      <div className="flex items-center gap-1 shrink-0 max-md:hidden">
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
      </div>

      {/* Theme toggle — visible on all sizes */}
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
  );
}
