"use client";

import { useTheme } from "next-themes";
import { useCallback, useEffect, useState } from "react";

import { useMounted } from "@/lib/hooks/use-mounted";
import { usePersistentState } from "@/lib/hooks/use-persistent-state";
import { useUploadThing } from "@/lib/uploadthing-client";

import { CommandPalette } from "./command-palette";
import { type AppState, DocView } from "./doc-view";
import { type ProjectListItem,ProjectSidebar } from "./project-sidebar";
import { ResizeHandle } from "./resize-handle";
import { RightPane, type SourceItem, type SourceType } from "./right-pane";
import { StatusBar } from "./statusbar";
import { TitleBar } from "./titlebar";

type RightTab = "sources" | "chat" | "revisions";

const SIDEBAR_DEFAULT = 220;
const SIDEBAR_MIN = SIDEBAR_DEFAULT;
const SIDEBAR_MAX = 480;
const RIGHT_DEFAULT = 268;
const RIGHT_MIN = RIGHT_DEFAULT;
const RIGHT_MAX = 560;

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));

interface EditorShellProps {
  projects?: ProjectListItem[];
  activeProjectId?: string | null;
  session?: { id: string; title: string } | null;
  initialSources?: SourceItem[];
}

function mapSourceType(dbType: string): SourceType {
  if (dbType === "AUDIO") return "AUDIO";
  if (dbType === "TEXT") return "TEXT";
  return "FILE";
}

type ApiAsset = {
  id: string;
  sourceType: string;
  status: SourceItem["status"];
  displayLabel: string | null;
  originalFileName: string | null;
  createdAt: string;
};

function assetToSource(a: ApiAsset): SourceItem {
  return {
    id: a.id,
    label: a.displayLabel ?? a.originalFileName ?? "Untitled source",
    sourceType: mapSourceType(a.sourceType),
    status: a.status,
    createdAt: a.createdAt,
  };
}

export function EditorShell({
  projects = [],
  activeProjectId = null,
  session,
  initialSources = [],
}: EditorShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rightOpen,   setRightOpen]   = useState(true);
  const [sidebarWidth, setSidebarWidth] = usePersistentState(
    "rx-sidebar-width",
    SIDEBAR_DEFAULT,
  );
  const [rightWidth, setRightWidth] = usePersistentState(
    "rx-right-width",
    RIGHT_DEFAULT,
  );
  const [resizing, setResizing] = useState<null | "left" | "right">(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [rightTab,    setRightTab]    = useState<RightTab>("sources");
  const [selectedReq, setSelectedReq] = useState<string | null>(null);
  const [sources, setSources] = useState<SourceItem[]>(initialSources);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [sourcesError, setSourcesError] = useState<string | undefined>(undefined);
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const theme: "dark" | "light" | null = mounted
    ? resolvedTheme === "light"
      ? "light"
      : "dark"
    : null;
  const toggleTheme = () =>
    setTheme((theme ?? "dark") === "dark" ? "light" : "dark");

  const sessionId = session?.id;

  const refreshSources = useCallback(async () => {
    if (!sessionId) return;
    setSourcesError(undefined);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/assets`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const data: { assets: ApiAsset[] } = await res.json();
      setSources(data.assets.map(assetToSource));
    } catch {
      setSourcesError("Could not load sources.");
    }
  }, [sessionId]);

  const { startUpload, isUploading } = useUploadThing("mixedUploader", {
    onClientUploadComplete: () => {
      void refreshSources();
    },
    onUploadError: (err: { message?: string }) => {
      setSourcesError(err?.message ?? "Upload failed.");
    },
  });

  const handleSubmitText = useCallback(
    async (text: string) => {
      if (!sessionId) return;
      const res = await fetch(`/api/sessions/${sessionId}/assets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ textContent: text }),
      });
      if (!res.ok) throw new Error("Failed to save text source");
      await refreshSources();
    },
    [sessionId, refreshSources],
  );

  const handleDeleteSource = useCallback(
    async (id: string) => {
      const prev = sources;
      setSources((cur) => cur.filter((s) => s.id !== id));
      const res = await fetch(`/api/assets/${id}`, { method: "DELETE" });
      if (!res.ok) {
        setSources(prev);
        setSourcesError(
          res.status === 409
            ? "Cannot delete a processed source."
            : "Delete failed.",
        );
      }
    },
    [sources],
  );

  const handleRenameSource = useCallback(
    async (id: string, label: string) => {
      const prev = sources;
      setSources((cur) =>
        cur.map((s) => (s.id === id ? { ...s, label } : s)),
      );
      const res = await fetch(`/api/assets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayLabel: label }),
      });
      if (!res.ok) {
        setSources(prev);
        setSourcesError("Rename failed.");
      }
    },
    [sources],
  );

  const handleUploadFiles = useCallback(
    async (files: File[]) => {
      if (!sessionId || files.length === 0) return;
      setSourcesLoading(true);
      try {
        await startUpload(files, { sessionId });
      } catch {
        setSourcesError("Upload failed.");
      } finally {
        setSourcesLoading(false);
      }
    },
    [sessionId, startUpload],
  );

  const appState: AppState = session
    ? sources.length > 0
      ? "ready"
      : "no-sources"
    : "no-session";

  /* ⌘K shortcut */
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((p) => !p);
      }
      if (e.key === "Escape") {
        setPaletteOpen(false);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  /* Drag-to-resize: while a handle is being dragged, listen on window so the
     pointer can leave the 6px handle without dropping the drag. */
  useEffect(() => {
    if (!resizing) return;
    const prevCursor = document.body.style.cursor;
    const prevUserSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    function handleMove(e: MouseEvent) {
      if (resizing === "left") {
        setSidebarWidth(clamp(e.clientX, SIDEBAR_MIN, SIDEBAR_MAX));
      } else {
        setRightWidth(
          clamp(window.innerWidth - e.clientX, RIGHT_MIN, RIGHT_MAX),
        );
      }
    }
    function handleUp() {
      setResizing(null);
    }
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevUserSelect;
    };
  }, [resizing, setSidebarWidth, setRightWidth]);

  const adjustSidebar = useCallback(
    (delta: number) =>
      setSidebarWidth(clamp(sidebarWidth + delta, SIDEBAR_MIN, SIDEBAR_MAX)),
    [sidebarWidth, setSidebarWidth],
  );
  const adjustRight = useCallback(
    (delta: number) =>
      setRightWidth(clamp(rightWidth + delta, RIGHT_MIN, RIGHT_MAX)),
    [rightWidth, setRightWidth],
  );

  function handleSelectReq(id: string) {
    setSelectedReq((cur) => (cur === id ? null : id));
  }

  function handleOpenSources() {
    setRightOpen(true);
    setRightTab("sources");
  }

  /* Body grid columns based on panel state */
  const colTemplate = [
    sidebarOpen ? `${sidebarWidth}px` : "0px",
    "1fr",
    rightOpen ? `${rightWidth}px` : "0px",
  ].join(" ");

  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{ background: "var(--background)" }}
    >
      {/* TitleBar */}
      <TitleBar
        sidebarOpen={sidebarOpen}
        rightOpen={rightOpen}
        theme={theme}
        onToggleSidebar={() => setSidebarOpen((p) => !p)}
        onToggleRight={() => setRightOpen((p) => !p)}
        onToggleTheme={toggleTheme}
        onOpenPalette={() => setPaletteOpen(true)}
      />

      {/* Body */}
      <div
        className="flex-1 overflow-hidden"
        style={{
          display: "grid",
          gridTemplateColumns: colTemplate,
          transition: resizing
            ? "none"
            : "grid-template-columns 200ms cubic-bezier(0.2, 0, 0, 1)",
        }}
      >
        {/* Sidebar */}
        <div className="relative overflow-hidden" style={{ minWidth: 0 }}>
          {sidebarOpen && (
            <ProjectSidebar
              projects={projects}
              activeProjectId={activeProjectId}
              onOpenPalette={() => setPaletteOpen(true)}
            />
          )}
          {sidebarOpen && (
            <ResizeHandle
              side="right"
              ariaLabel="Resize sidebar"
              value={sidebarWidth}
              min={SIDEBAR_MIN}
              max={SIDEBAR_MAX}
              onResizeStart={() => setResizing("left")}
              onReset={() => setSidebarWidth(SIDEBAR_DEFAULT)}
              onKeyAdjust={adjustSidebar}
            />
          )}
        </div>

        <DocView
          appState={appState}
          sessionName={session?.title ?? null}
          selectedReq={selectedReq}
          onSelectReq={handleSelectReq}
          onAddSources={handleOpenSources}
          onAttachFiles={sessionId ? handleUploadFiles : undefined}
        />

        {/* Right pane */}
        <div className="relative overflow-hidden" style={{ minWidth: 0 }}>
          {rightOpen && (
            <ResizeHandle
              side="left"
              ariaLabel="Resize right pane"
              value={rightWidth}
              min={RIGHT_MIN}
              max={RIGHT_MAX}
              onResizeStart={() => setResizing("right")}
              onReset={() => setRightWidth(RIGHT_DEFAULT)}
              onKeyAdjust={adjustRight}
            />
          )}
          {rightOpen && (
            <RightPane
              activeTab={rightTab}
              onTabChange={setRightTab}
              sessionId={session?.id}
              sources={sources}
              sourcesLoading={sourcesLoading || isUploading}
              sourcesError={sourcesError}
              onSubmitText={sessionId ? handleSubmitText : undefined}
              onDeleteSource={sessionId ? handleDeleteSource : undefined}
              onRenameSource={sessionId ? handleRenameSource : undefined}
              onUploadFiles={sessionId ? handleUploadFiles : undefined}
              onRetrySourceLoad={refreshSources}
            />
          )}
        </div>
      </div>

      {/* StatusBar */}
      <StatusBar selectedReq={selectedReq} sessionName={session?.title ?? null} />

      {/* Command palette (portal-like fixed overlay) */}
      {paletteOpen && (
        <CommandPalette onClose={() => setPaletteOpen(false)} />
      )}
    </div>
  );
}
