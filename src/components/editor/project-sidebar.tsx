"use client";

import { useUser } from "@clerk/nextjs";
import { useCallback, useState } from "react";
import { useFormStatus } from "react-dom";

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
  onSwitchProject: (id: string) => void;
  onDeleteProject: (id: string) => Promise<void>;
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
  onSwitchProject,
  onDeleteProject,
}: ProjectSidebarProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const { user } = useUser();
  const isMac = useIsMac();

  const preloadAvatar = useCallback(() => {
    if (!user?.imageUrl) return;
    const img = new window.Image();
    img.src = user.imageUrl;
  }, [user]);

  function startCreate() {
    setCreating(true);
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
          className="flex items-center gap-2 mx-2 mt-2 mb-1.5 h-[26px] px-2 rounded-[5px] border transition-colors duration-[120ms] hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)] cursor-pointer shrink-0"
          style={{
            background: "var(--surface-2)",
            borderColor: "var(--border)",
            color: "var(--fg-muted)",
          }}
        >
          <Icons.Search size={12} aria-hidden="true" />
          <span className="flex-1 text-left text-[11px]">Find Project…</span>
          <Kbd>{isMac ? "⌘P" : "Ctrl+P"}</Kbd>
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
                    <ProjectRow
                      project={p}
                      active={active}
                      onSwitchProject={onSwitchProject}
                      onDeleteProject={onDeleteProject}
                    />
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
              className="flex items-center gap-1 flex-1 min-w-0"
            >
              <CreateFormFields onCancel={() => setCreating(false)} />
            </form>
          ) : (
            <button
              type="button"
              onClick={startCreate}
              className="flex items-center gap-1.5 flex-1 min-w-0 h-[26px] px-2 rounded-[5px] text-[11px] transition-colors duration-[120ms] hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)] cursor-pointer"
              style={{ color: "var(--fg-tertiary)" }}
            >
              <Icons.Plus size={13} aria-hidden="true" className="shrink-0" />
              <span className="truncate">New project</span>
            </button>
          )}
          <IconButton
            label="Open settings"
            onClick={() => setSettingsOpen(true)}
            onMouseEnter={preloadAvatar}
            className="shrink-0"
          >
            <Icons.Settings size={13} />
          </IconButton>
        </div>
      </aside>

      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
    </>
  );
}

function ProjectRow({
  project,
  active,
  onSwitchProject,
  onDeleteProject,
}: {
  project: ProjectListItem;
  active: boolean;
  onSwitchProject: (id: string) => void;
  onDeleteProject: (id: string) => Promise<void>;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await onDeleteProject(project.id);
    } catch {
      setDeleteError("Delete failed.");
    } finally {
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  return (
    <div>
      <div
        className="group flex items-center gap-1 pr-2 transition-colors duration-[120ms] hover:bg-[var(--surface-2)]"
        style={{
          background: active ? "var(--surface-2)" : "transparent",
          borderLeft: "2px solid",
          borderLeftColor: active ? "var(--accent)" : "transparent",
        }}
      >
        <button
          type="button"
          onClick={() => onSwitchProject(project.id)}
          className="flex flex-col gap-0.5 flex-1 min-w-0 text-left px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[var(--accent-ring)] cursor-pointer"
          aria-current={active ? "page" : undefined}
        >
          <span
            className="text-[12px] truncate"
            style={{
              color: active ? "var(--fg-primary)" : "var(--fg-secondary)",
              fontWeight: active ? 500 : 400,
            }}
            title={project.name}
          >
            {project.name}
          </span>
          <span
            className="text-[10px] truncate tabular-nums"
            style={{
              color: "var(--fg-disabled)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {relativeTime(project.updatedAt)}
          </span>
        </button>

        <div className="flex shrink-0 items-center justify-end w-[44px] h-6">
          {confirmingDelete ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Cancel delete"
                onClick={() => setConfirmingDelete(false)}
                className="inline-flex items-center justify-center size-[20px] rounded-[4px] transition-colors duration-[120ms] hover:bg-[var(--surface-3)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)] cursor-pointer"
                style={{ color: "var(--fg-muted)" }}
                disabled={deleting}
              >
                <Icons.X size={10} />
              </button>
              <button
                type="button"
                aria-label={`Delete ${project.name}`}
                onClick={() => void handleDelete()}
                className="inline-flex items-center justify-center size-[20px] rounded-[4px] transition-colors duration-[120ms] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)] cursor-pointer disabled:cursor-not-allowed"
                style={{
                  background:
                    "color-mix(in srgb, var(--danger) 15%, transparent)",
                  color: "var(--danger)",
                }}
                disabled={deleting}
              >
                {deleting ? (
                  <Icons.Refresh size={10} className="animate-spin" />
                ) : (
                  <Icons.Check size={10} />
                )}
              </button>
            </div>
          ) : (
            <button
              type="button"
              aria-label={`Delete ${project.name}`}
              onClick={() => setConfirmingDelete(true)}
              className="inline-flex items-center justify-center size-6 rounded-[4px] opacity-0 group-hover:opacity-100 transition-[opacity,transform,background-color,color] duration-[120ms] active:scale-[0.96] hover:bg-[var(--surface-3)] focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)] cursor-pointer"
              style={{ color: "var(--fg-muted)" }}
            >
              <Icons.Trash size={11} />
            </button>
          )}
        </div>
      </div>
      {deleteError && (
        <div
          className="px-3 pb-1 text-[10px]"
          style={{ color: "var(--danger)" }}
          role="alert"
        >
          {deleteError}
        </div>
      )}
    </div>
  );
}

/* ── CreateFormFields ── rendered inside <form> so useFormStatus works ── */
function CreateFormFields({ onCancel }: { onCancel: () => void }) {
  const { pending } = useFormStatus();

  return (
    <>
      <input
        name="name"
        placeholder="Project name…"
        required
        minLength={1}
        maxLength={120}
        disabled={pending}
        autoFocus
        className="flex-1 min-w-0 h-[24px] px-1.5 rounded-[4px] border bg-transparent text-[11px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)] disabled:opacity-50"
        style={{ color: "var(--fg-primary)", borderColor: "var(--border)" }}
        onKeyDown={(e) => {
          if (e.key === "Escape" && !pending) onCancel();
        }}
        autoComplete="off"
        spellCheck={false}
      />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center h-[24px] px-1.5 rounded-[4px] text-[10px] font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)] cursor-pointer disabled:cursor-not-allowed shrink-0"
        style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
      >
        {pending ? (
          <svg
            className="animate-spin"
            width={10}
            height={10}
            viewBox="0 0 10 10"
            fill="none"
            aria-label="Creating…"
          >
            <circle
              cx="5"
              cy="5"
              r="4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeOpacity="0.3"
            />
            <path
              d="M9 5A4 4 0 0 0 5 1"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          "Add"
        )}
      </button>
    </>
  );
}

function EmptyProjects() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 px-4 text-center">
      <Icons.FileText
        size={20}
        className="text-[var(--fg-disabled)]"
        aria-hidden="true"
      />
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
