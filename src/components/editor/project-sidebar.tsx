"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useCallback, useState } from "react";

import { SettingsPanel } from "@/components/editor/settings-panel";
import { Icons, RxLogo } from "@/components/icons";
import { IconButton } from "@/components/ui/icon-button";
import { Kbd } from "@/components/ui/kbd";
import { useIsMac } from "@/lib/hooks/use-is-mac";

interface ProjectSidebarProps {
  onOpenPalette: () => void;
}

export function ProjectSidebar({ onOpenPalette }: ProjectSidebarProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { user } = useUser();
  const isMac = useIsMac();

  const preloadAvatar = useCallback(() => {
    if (!user?.imageUrl) return;
    const img = new window.Image();
    img.src = user.imageUrl;
  }, [user]);

  return (
    <>
      <aside
        className="flex flex-col h-full overflow-hidden border-r"
        style={{
          width: 220,
          background: "var(--surface-1)",
          borderColor: "var(--border)",
        }}
      >
        {/* Head — logo links to landing page */}
        <div
          className="flex items-center h-8 px-1 shrink-0 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <Link
            href="/"
            className="flex items-center gap-2 flex-1 px-2 h-full rounded-[4px] transition-colors duration-[120ms] hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[var(--accent-ring)]"
            aria-label="RequireX — go to home"
          >
            <RxLogo size={14} className="text-[var(--accent)] shrink-0" />
            <span
              className="flex-1 text-[13px] font-semibold tracking-[-0.01em] truncate"
              style={{ color: "var(--fg-primary)" }}
              translate="no"
            >
              RequireX
            </span>
          </Link>
        </div>

        {/* Search row */}
        <button
          type="button"
          onClick={onOpenPalette}
          className="flex items-center gap-2 mx-2 mt-2 mb-1 h-[26px] px-2 rounded-[5px] border transition-colors duration-[120ms] hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)] cursor-pointer shrink-0"
          style={{
            background: "var(--surface-2)",
            borderColor: "var(--border)",
            color: "var(--fg-muted)",
          }}
        >
          <Icons.Search size={12} aria-hidden="true" />
          <span className="flex-1 text-left text-[11px]">Find Project…</span>
          <Kbd>{isMac ? "⌘K" : "Ctrl+K"}</Kbd>
        </button>

        {/* Scrollable tree */}
        <div className="flex-1 overflow-y-auto py-2">
          <EmptyProjects />
        </div>

        {/* Footer */}
        <div
          className="flex items-center gap-1 h-9 px-2 border-t shrink-0"
          style={{ borderColor: "var(--border)" }}
        >
          <button
            type="button"
            className="flex items-center gap-1.5 flex-1 h-[26px] px-2 rounded-[5px] text-[11px] transition-colors duration-[120ms] hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)] cursor-pointer"
            style={{ color: "var(--fg-tertiary)" }}
          >
            <Icons.Plus size={13} aria-hidden="true" />
            <span>New project</span>
          </button>
          <IconButton
            label="Open settings"
            onClick={() => setSettingsOpen(true)}
            onMouseEnter={preloadAvatar}
          >
            <Icons.Settings size={13} />
          </IconButton>
        </div>
      </aside>

      {settingsOpen && (
        <SettingsPanel onClose={() => setSettingsOpen(false)} />
      )}
    </>
  );
}

function EmptyProjects() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 px-4 text-center">
      <Icons.FileText size={20} className="text-[var(--fg-disabled)]" aria-hidden="true" />
      <p
        className="text-[11px] leading-[1.5]"
        style={{ color: "var(--fg-muted)" }}
      >
        No projects yet.
        <br />
        Create one to get started.
      </p>
    </div>
  );
}
