"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";

import { SettingsPanel } from "@/components/editor/settings-panel";
import { Icons } from "@/components/icons";
import { IconButton } from "@/components/ui/icon-button";
import { Kbd } from "@/components/ui/kbd";
import { useIsMac } from "@/lib/hooks/use-is-mac";
import { createProjectAction } from "@/server/actions/projects";

export interface ProjectListItem {
  id: string;
  name: string;
  clientName: string;
  updatedAt: string;
}

interface ProjectSidebarProps {
  projects: ProjectListItem[];
  activeProjectId: string | null;
  onOpenPalette: () => void;
}

function relativeTime(dateStr: string): string {
  try {
    const diffMinutes = Math.round(
      (new Date(dateStr).getTime() - Date.now()) / 60_000,
    );
    if (Math.abs(diffMinutes) >= 60 * 24) {
      const days = Math.round(diffMinutes / (60 * 24));
      return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
        days,
        "day",
      );
    }
    if (Math.abs(diffMinutes) >= 60) {
      const hours = Math.round(diffMinutes / 60);
      return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
        hours,
        "hour",
      );
    }
    return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
      diffMinutes,
      "minute",
    );
  } catch {
    return "";
  }
}

export function ProjectSidebar({
  projects,
  activeProjectId,
  onOpenPalette,
}: ProjectSidebarProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useUser();
  const isMac = useIsMac();

  const preloadAvatar = useCallback(() => {
    if (!user?.imageUrl) return;
    const img = new window.Image();
    img.src = user.imageUrl;
  }, [user]);

  function startCreate() {
    setCreating(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  return (
    <>
      <aside
        className="flex flex-col h-full w-full overflow-hidden border-r"
        style={{
          background: "var(--surface-1)",
          borderColor: "var(--border)",
        }}
      >
        {/* Search row */}
        <button
          type="button"
          onClick={onOpenPalette}
          className="flex items-center gap-2 mx-2 mt-3 mb-1 h-[26px] px-2 rounded-[5px] border transition-colors duration-[120ms] hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)] cursor-pointer shrink-0"
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
          {projects.length === 0 ? (
            <EmptyProjects />
          ) : (
            <ul role="list" aria-label="Projects" className="flex flex-col">
              {projects.map((p) => {
                const active = p.id === activeProjectId;
                return (
                  <li key={p.id}>
                    <Link
                      href={`/app?projectId=${p.id}`}
                      className="flex flex-col gap-0.5 px-3 py-2 transition-colors duration-[120ms] hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[var(--accent-ring)]"
                      style={{
                        background: active ? "var(--surface-2)" : "transparent",
                        borderLeft: "2px solid",
                        borderLeftColor: active ? "var(--accent)" : "transparent",
                      }}
                      aria-current={active ? "page" : undefined}
                    >
                      <span
                        className="text-[12px] truncate"
                        style={{
                          color: active
                            ? "var(--fg-primary)"
                            : "var(--fg-secondary)",
                          fontWeight: active ? 500 : 400,
                        }}
                        title={p.name}
                      >
                        {p.name}
                      </span>
                      <span
                        className="text-[10px] truncate"
                        style={{
                          color: "var(--fg-disabled)",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {relativeTime(p.updatedAt)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center gap-1 h-9 px-2 border-t shrink-0"
          style={{ borderColor: "var(--border)" }}
        >
          {creating ? (
            <form
              action={createProjectAction}
              className="flex items-center gap-1 flex-1"
              onSubmit={() => setCreating(false)}
            >
              <input
                ref={inputRef}
                name="name"
                placeholder="Project name…"
                required
                minLength={1}
                maxLength={120}
                className="flex-1 h-[24px] px-1.5 rounded-[4px] border bg-transparent text-[11px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)]"
                style={{
                  color: "var(--fg-primary)",
                  borderColor: "var(--border)",
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setCreating(false);
                }}
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="submit"
                className="h-[24px] px-1.5 rounded-[4px] text-[10px] font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)] cursor-pointer"
                style={{
                  background: "var(--accent)",
                  color: "var(--accent-fg)",
                }}
              >
                Add
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={startCreate}
              className="flex items-center gap-1.5 flex-1 h-[26px] px-2 rounded-[5px] text-[11px] transition-colors duration-[120ms] hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)] cursor-pointer"
              style={{ color: "var(--fg-tertiary)" }}
            >
              <Icons.Plus size={13} aria-hidden="true" />
              <span>New project</span>
            </button>
          )}
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
