"use client";

import { Icons } from "@/components/icons";
import { IconButton } from "@/components/ui/icon-button";
import { Kbd } from "@/components/ui/kbd";

interface TitleBarProps {
  sidebarOpen: boolean;
  rightOpen: boolean;
  theme: "dark" | "light";
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
  return (
    <div
      className="flex items-center h-8 px-3 gap-3 border-b shrink-0 select-none"
      style={{
        background: "var(--surface-1)",
        borderColor: "var(--border)",
      }}
    >
      {/* Center search trigger */}
      <div className="flex-1 flex justify-center px-4">
        <button
          type="button"
          onClick={onOpenPalette}
          className="flex items-center gap-2 h-[22px] px-3 rounded-[5px] border transition-colors duration-[120ms] hover:bg-[var(--surface-3)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)] cursor-pointer"
          style={{
            background: "var(--surface-2)",
            borderColor: "var(--border-strong)",
            color: "var(--fg-muted)",
            minWidth: 200,
            maxWidth: 380,
            width: "100%",
          }}
        >
          <Icons.Search size={12} />
          <span className="flex-1 text-left text-[12px]">
            Search requirements…
          </span>
          <Kbd>⌘K</Kbd>
        </button>
      </div>

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
            theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
          }
          onClick={onToggleTheme}
        >
          {theme === "dark" ? (
            <Icons.Sun size={14} />
          ) : (
            <Icons.Moon size={14} />
          )}
        </IconButton>
      </div>
    </div>
  );
}
