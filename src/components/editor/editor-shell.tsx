"use client";

import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useState } from "react";

import { useMounted } from "@/lib/hooks/use-mounted";
import { usePersistentState } from "@/lib/hooks/use-persistent-state";
import { useUploadThing } from "@/lib/uploadthing-client";

import { CommandPalette } from "./command-palette";
import { type AppState, DocView } from "./doc-view";
import { type ProjectListItem, ProjectSidebar } from "./project-sidebar";
import { ResizeHandle } from "./resize-handle";
import { RightPane, type SourceItem, type SourceType } from "./right-pane";
import { StatusBar } from "./statusbar";
import { TitleBar } from "./titlebar";

type RightTab = "sources" | "chat" | "revisions";

type SessionRef = { id: string; title: string } | null;
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
  session?: SessionRef;
  initialSources?: SourceItem[];
  initialProjectCache?: SerializableProjectCache;
}

interface CacheEntry {
  session: SessionRef;
  sources: SourceItem[];
}

type SerializableProjectCache = Record<string, CacheEntry>;

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
  mimeType: string | null;
  ufsUrl: string | null;
  createdAt: string;
};

type BundledProject = {
  id: string;
  name: string;
  clientName: string;
  updatedAt: string;
  session: SessionRef;
  assets: ApiAsset[];
};

function assetToSource(a: ApiAsset): SourceItem {
  return {
    id: a.id,
    label: a.displayLabel ?? a.originalFileName ?? "Untitled source",
    sourceType: mapSourceType(a.sourceType),
    status: a.status,
    createdAt: a.createdAt,
    fileUrl: a.ufsUrl ?? undefined,
    mimeType: a.mimeType ?? undefined,
  };
}

export function EditorShell({
  projects = [],
  activeProjectId: initialActiveProjectId = null,
  session: initialSession,
  initialSources = [],
  initialProjectCache = {},
}: EditorShellProps) {
  const router = useRouter();
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
  const [rightTab, setRightTab] = useState<RightTab>("sources");
  const [selectedReq, setSelectedReq] = useState<string | null>(null);

  const [activeProjectId, setActiveProjectId] = useState<string | null>(
    initialActiveProjectId,
  );
  const [session, setSession] = useState<SessionRef>(initialSession ?? null);
  const [sources, setSources] = useState<SourceItem[]>(initialSources);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [sourcesError, setSourcesError] = useState<string | undefined>(undefined);

  const [projectCache, setProjectCache] = useState<Map<string, CacheEntry>>(
    () => new Map(Object.entries(initialProjectCache)),
  );

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

  /* Warm the remaining client cache with every project's session + sources in
     one shot. Server-provided top projects and locally mutated active project
     state are preserved by skipping already-cached ids. */
  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/projects", { cache: "no-store", signal: ctrl.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { projects: BundledProject[] } | null) => {
        if (!data) return;
        setProjectCache((prev) => {
          const next = new Map(prev);
          for (const p of data.projects) {
            if (next.has(p.id)) continue;
            next.set(p.id, {
              session: p.session,
              sources: p.assets.map(assetToSource),
            });
          }
          return next;
        });
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, []);

  const refreshSources = useCallback(async () => {
    if (!sessionId) return;
    setSourcesError(undefined);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/assets`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const data: { assets: ApiAsset[] } = await res.json();
      const fresh = data.assets.map(assetToSource);
      setSources(fresh);
      if (activeProjectId) {
        setProjectCache((prev) => {
          const next = new Map(prev);
          next.set(activeProjectId, { session, sources: fresh });
          return next;
        });
      }
    } catch {
      setSourcesError("Could not load sources.");
    }
  }, [sessionId, activeProjectId, session]);

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
      const optimistic = prev.filter((s) => s.id !== id);
      setSources(optimistic);
      if (activeProjectId) {
        setProjectCache((cache) => {
          const next = new Map(cache);
          next.set(activeProjectId, { session, sources: optimistic });
          return next;
        });
      }
      const res = await fetch(`/api/assets/${id}`, { method: "DELETE" });
      if (!res.ok) {
        setSources(prev);
        if (activeProjectId) {
          setProjectCache((cache) => {
            const next = new Map(cache);
            next.set(activeProjectId, { session, sources: prev });
            return next;
          });
        }
        setSourcesError(
          res.status === 409
            ? "Cannot delete a processed source."
            : "Delete failed.",
        );
      }
    },
    [sources, activeProjectId, session],
  );

  const handleRenameSource = useCallback(
    async (id: string, label: string) => {
      const prev = sources;
      const optimistic = prev.map((s) => (s.id === id ? { ...s, label } : s));
      setSources(optimistic);
      if (activeProjectId) {
        setProjectCache((cache) => {
          const next = new Map(cache);
          next.set(activeProjectId, { session, sources: optimistic });
          return next;
        });
      }
      const res = await fetch(`/api/assets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayLabel: label }),
      });
      if (!res.ok) {
        setSources(prev);
        if (activeProjectId) {
          setProjectCache((cache) => {
            const next = new Map(cache);
            next.set(activeProjectId, { session, sources: prev });
            return next;
          });
        }
        setSourcesError("Rename failed.");
      }
    },
    [sources, activeProjectId, session],
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

  /* Soft client-side project switch. Cache hit → swap state + replace URL
     silently (no Next.js routing → no server roundtrip). Cache miss →
     full navigation; the page server component will re-render with fresh
     props and the parent's `key` (in app/page.tsx) remounts EditorShell
     so its local state re-seeds from the new props. */
  const handleSwitchProject = useCallback(
    (id: string) => {
      if (id === activeProjectId) return;
      const cached = projectCache.get(id);
      if (cached) {
        setActiveProjectId(id);
        setSession(cached.session);
        setSources(cached.sources);
        setSourcesError(undefined);
        if (typeof window !== "undefined") {
          window.history.replaceState({}, "", `/app?projectId=${id}`);
        }
      } else {
        router.push(`/app?projectId=${id}`);
      }
    },
    [activeProjectId, projectCache, router],
  );

  const appState: AppState = session
    ? sources.length > 0
      ? "ready"
      : "no-sources"
    : "no-session";

  const activeProjectName =
    projects.find((p) => p.id === activeProjectId)?.name ?? null;

  const appState: AppState = !session
    ? "no-session"
    : generationState === "requesting"
      ? "generating"
      : generationState === "failed"
        ? "failed"
        : sources.length > 0
          ? "ready"
          : "no-sources";

  const loadSources = useCallback(async () => {
    if (!session) {
      setSources([]);
      setSourcesError(undefined);
      return;
    }

    setSourcesLoading(true);
    setSourcesError(undefined);
    try {
      const response = await fetch(`/api/sessions/${session.id}/assets`);
      if (!response.ok) {
        throw new Error("Failed to load sources.");
      }

      const payload = (await response.json()) as { assets: ApiSourceAsset[] };
      setSources(payload.assets.map(mapAsset));
    } catch (error) {
      setSourcesError(
        error instanceof Error ? error.message : "Failed to load sources.",
      );
    } finally {
      setSourcesLoading(false);
    }
  }, [session]);

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

  async function handleSubmitText(text: string) {
    if (!session) {
      const response = await fetch("/api/preview-messy-text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ textContent: text }),
      });

      if (!response.ok) {
        throw new Error(
          await readApiError(response, "Failed to send prompt preview event."),
        );
      }

      return;
    }

    const response = await fetch(`/api/sessions/${session.id}/assets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ textContent: text }),
    });

    if (!response.ok) {
      throw new Error(await readApiError(response, "Failed to save source."));
    }

    await loadSources();
  }

  async function handleDeleteSource(id: string) {
    const response = await fetch(`/api/assets/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error(await readApiError(response, "Failed to delete source."));
    }

    await loadSources();
  }

  async function handleRenameSource(id: string, label: string) {
    const response = await fetch(`/api/assets/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ displayLabel: label }),
    });

    if (!response.ok) {
      throw new Error(await readApiError(response, "Failed to rename source."));
    }

    await loadSources();
  }

  async function handleUploadSources(
    files: File[],
    onProgress: (progress: number) => void,
  ) {
    if (!session) {
      throw new Error("No active session.");
    }

    await uploadFiles("mixedUploader", {
      files,
      input: {
        sessionId: session.id,
      },
      onUploadProgress: ({ totalProgress }) => {
        onProgress(
          Math.round(totalProgress <= 1 ? totalProgress * 100 : totalProgress),
        );
      },
    });

    onProgress(100);
    await loadSources();
  }

  async function handleGenerateBrief() {
    if (!session) {
      return;
    }

    setGenerationState("requesting");
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId: session.id }),
      });

      if (!response.ok) {
        throw new Error("Failed to request brief generation.");
      }

      setGenerationState("idle");
    } catch {
      setGenerationState("failed");
    }
  }

  const colTemplate = [
    sidebarOpen ? `${sidebarWidth}px` : "0px",
    "1fr",
    rightOpen ? `${rightWidth}px` : "0px",
  ].join(" ");

  return (
    <div
      className="flex h-screen flex-col overflow-hidden"
      style={{ background: "var(--background)" }}
    >
      <TitleBar
        sidebarOpen={sidebarOpen}
        rightOpen={rightOpen}
        theme={theme}
        onToggleSidebar={() => setSidebarOpen((p) => !p)}
        onToggleRight={() => setRightOpen((p) => !p)}
        onToggleTheme={toggleTheme}
        onOpenPalette={() => setPaletteOpen(true)}
      />

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
              onSwitchProject={handleSwitchProject}
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
          projectName={activeProjectName}
          sessionName={session?.title ?? null}
          selectedReq={selectedReq}
          onSelectReq={handleSelectReq}
          onAddSources={handleOpenSources}
          onGenerateBrief={handleGenerateBrief}
        />

        <div className="overflow-hidden" style={{ minWidth: 0 }}>
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

      <StatusBar
        selectedReq={selectedReq}
        sessionName={session?.title ?? null}
      />

      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
    </div>
  );
}
