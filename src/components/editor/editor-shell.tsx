"use client";

import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useRef, useState } from "react";

import { useMounted } from "@/lib/hooks/use-mounted";
import { usePersistentState } from "@/lib/hooks/use-persistent-state";
import { useUploadThing } from "@/lib/uploadthing-client";

import { CommandPalette } from "./command-palette";
import { type AppState, type DocLineData, DocView } from "./doc-view";
import { type ProjectListItem, ProjectSidebar } from "./project-sidebar";
import { ResizeHandle } from "./resize-handle";
import { RightPane, type SourceItem, type SourceType } from "./right-pane";
import { StatusBar } from "./statusbar";
import { TitleBar } from "./titlebar";

type RightTab = "sources" | "chat" | "revisions";

export interface ChatMessage {
  id: string;
  userMessage: string;
  version: number | null;
  snapshotId: string | null;
  createdAt: string;
  trigger: string | null;
  selectionText: string | null;
}

export interface SnapshotSummary {
  id: string | null;
  version: number | null;
  snapshotStatus: string | null;
  type: string;
  summary: string;
  createdAt: string;
  trigger: string | null;
  userMessage: string | null;
}

type SessionRef = { id: string; title: string } | null;
const SIDEBAR_STORAGE_KEY = "rx-sidebar-width-v2";
const SIDEBAR_DEFAULT = 196;
const SIDEBAR_MIN = 196;
const SIDEBAR_MAX = 320;
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
  lines?: DocLineData[];
  hasSnapshot?: boolean;
  initialSnapshotId?: string | null;
}

interface CacheEntry {
  session: SessionRef;
  sources: SourceItem[];
}

type SerializableProjectCache = Record<string, CacheEntry>;

function mapSourceType(dbType: string): SourceType {
  if (dbType === "AUDIO") return "AUDIO";
  if (dbType === "TEXT") return "TEXT";
  if (dbType === "IMAGE") return "IMAGE";
  return "PDF";
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
  projects: initialProjects = [],
  activeProjectId: initialActiveProjectId = null,
  session: initialSession,
  initialSources = [],
  initialProjectCache = {},
  lines = [],
  hasSnapshot = false,
  initialSnapshotId = null,
}: EditorShellProps) {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectListItem[]>(initialProjects);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = usePersistentState(
    SIDEBAR_STORAGE_KEY,
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
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [revising, setRevising] = useState(false);
  const [currentSnapshotId, setCurrentSnapshotId] = useState<string | null>(initialSnapshotId);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [snapshots, setSnapshots] = useState<SnapshotSummary[]>([]);
  const [revisionsLoading, setRevisionsLoading] = useState(false);
  const [clientLines, setClientLines] = useState<DocLineData[] | null>(null);

  const [activeProjectId, setActiveProjectId] = useState<string | null>(
    initialActiveProjectId,
  );
  const [session, setSession] = useState<SessionRef>(initialSession ?? null);
  const [sources, setSources] = useState<SourceItem[]>(initialSources);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [sourcesError, setSourcesError] = useState<string | undefined>(
    undefined,
  );

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

  useEffect(() => {
    if (sidebarWidth < SIDEBAR_MIN || sidebarWidth > SIDEBAR_MAX) {
      setSidebarWidth(clamp(sidebarWidth, SIDEBAR_MIN, SIDEBAR_MAX));
    }
  }, [sidebarWidth, setSidebarWidth]);

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

  const handleGenerateBrief = useCallback(async () => {
    if (!sessionId || generating) return;

    setGenerating(true);
    setGenerationError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as
          | { error?: string; message?: string }
          | null;
        throw new Error(
          payload?.message ?? payload?.error ?? "Failed to generate brief.",
        );
      }

      router.refresh();
    } catch (error) {
      setGenerationError(
        error instanceof Error ? error.message : "Failed to generate brief.",
      );
    } finally {
      setGenerating(false);
    }
  }, [sessionId, generating, router]);

  const loadRevisions = useCallback(async (sid: string) => {
    setRevisionsLoading(true);
    try {
      const res = await fetch(`/api/sessions/${sid}/revisions`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json() as { revisions: Array<{
        id: string;
        type: string;
        summary: string;
        createdAt: string;
        snapshotId: string | null;
        version: number | null;
        snapshotStatus: string | null;
        trigger: string | null;
        userMessage: string | null;
        selectionText: string | null;
      }> };
      const allRevisions = data.revisions ?? [];

      // Chat messages are REGENERATED events with trigger=chat
      setChatMessages(
        allRevisions
          .filter((r) => r.trigger === "chat" && r.userMessage)
          .map((r) => ({
            id: r.id,
            userMessage: r.userMessage!,
            version: r.version,
            snapshotId: r.snapshotId,
            createdAt: r.createdAt,
            trigger: r.trigger,
            selectionText: r.selectionText,
          })),
      );

      // All revisions go to the revisions tab
      setSnapshots(
        allRevisions.map((r) => ({
          id: r.snapshotId,
          version: r.version,
          snapshotStatus: r.snapshotStatus,
          type: r.type,
          summary: r.summary,
          createdAt: r.createdAt,
          trigger: r.trigger,
          userMessage: r.userMessage,
        })),
      );
    } catch {
      // silently fail — not critical
    } finally {
      setRevisionsLoading(false);
    }
  }, []);

  const handleSendMessage = useCallback(
    async (userMessage: string, selectionText?: string) => {
      if (!sessionId || !currentSnapshotId || revising) return;

      setRevising(true);
      setGenerationError(null);
      setRightTab("chat");

      try {
        const res = await fetch("/api/revise", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            snapshotId: currentSnapshotId,
            userMessage,
            selectionText: selectionText || undefined,
            selectedItemId: selectedReq || undefined,
          }),
        });

        if (!res.ok) {
          const payload = (await res.json().catch(() => null)) as
            | { error?: string; message?: string }
            | null;
          throw new Error(payload?.message ?? payload?.error ?? "Failed to revise brief.");
        }

        const result = await res.json() as { snapshotId: string; version: number };
        setCurrentSnapshotId(result.snapshotId);
        setSelectedReq(null);
        setClientLines(null);
        await loadRevisions(sessionId);
        router.refresh();
      } catch (error) {
        setGenerationError(
          error instanceof Error ? error.message : "Failed to revise brief.",
        );
      } finally {
        setRevising(false);
      }
    },
    [sessionId, currentSnapshotId, revising, selectedReq, loadRevisions, router],
  );

  useEffect(() => {
    if (sessionId) void loadRevisions(sessionId);
  }, [sessionId, loadRevisions]);

  // Ref keeps the latest displayLines accessible inside callbacks without
  // causing the callback to re-create every time lines change.
  const displayLinesRef = useRef<DocLineData[]>([]);

  const handleUpdateLine = useCallback(
    async (reqId: string, reqType: "claim" | "question", newText: string) => {
      const endpoint = reqType === "claim"
        ? `/api/claims/${reqId}`
        : `/api/questions/${reqId}`;
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newText }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? "Failed to save edit.");
      }
      // Optimistic update: patch the text in the current display lines
      setClientLines(
        displayLinesRef.current.map((l: DocLineData) =>
          l.reqId === reqId ? { ...l, text: newText } : l,
        ),
      );
    },
    [],
  );

  const handleSelectRevision = useCallback(async (snapshotId: string) => {
    if (snapshotId === currentSnapshotId) return;
    try {
      const res = await fetch(`/api/snapshots/${snapshotId}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json() as { lines: DocLineData[] };
      setClientLines(data.lines);
      setCurrentSnapshotId(snapshotId);
    } catch {
      // silently ignore
    }
  }, [currentSnapshotId]);

  /* Soft client-side project switch. Cache hit -> swap state + replace URL
     silently (no Next.js routing -> no server roundtrip). Cached switches clear
     snapshot lines rather than showing stale lines from the previous project. */
  const handleSwitchProject = useCallback(
    (id: string) => {
      if (id === activeProjectId) return;
      const cached = projectCache.get(id);
      if (cached) {
        setActiveProjectId(id);
        setSession(cached.session);
        setSources(cached.sources);
        setGenerationError(null);
        setSourcesError(undefined);
        setCurrentSnapshotId(null);
        setChatMessages([]);
        setSnapshots([]);
        if (typeof window !== "undefined") {
          window.history.replaceState({}, "", `/app?projectId=${id}`);
        }
      } else {
        router.push(`/app?projectId=${id}`);
      }
    },
    [activeProjectId, projectCache, router],
  );

  const handleDeleteProject = useCallback(
    async (projectId: string) => {
      const previousActiveProjectId = activeProjectId;
      const previousSession = session;
      const previousSources = sources;
      const previousGenerationError = generationError;
      const previousSourcesError = sourcesError;
      const previousProjects = projects;
      const previousProjectCache = new Map(projectCache);
      const remainingProjects = previousProjects.filter((p) => p.id !== projectId);

      setProjects(remainingProjects);
      setProjectCache((prev) => {
        const next = new Map(prev);
        next.delete(projectId);
        return next;
      });

      const deletingActive = activeProjectId === projectId;
      if (deletingActive) {
        const nextProject = remainingProjects[0] ?? null;
        setActiveProjectId(nextProject?.id ?? null);
        setSession(null);
        setSources([]);
        setGenerationError(null);
        setSourcesError(undefined);
      }

      const response = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        setProjects(previousProjects);
        setProjectCache(previousProjectCache);
        setActiveProjectId(previousActiveProjectId);
        setSession(previousSession);
        setSources(previousSources);
        setGenerationError(previousGenerationError);
        setSourcesError(previousSourcesError);
        throw new Error("Failed to delete project.");
      }

      if (deletingActive) {
        const nextProject = remainingProjects[0] ?? null;
        if (nextProject) {
          router.push(`/app?projectId=${nextProject.id}`);
        } else {
          router.push("/app");
        }
      } else {
        router.refresh();
      }
    },
    [
      projects,
      projectCache,
      activeProjectId,
      session,
      sources,
      generationError,
      sourcesError,
      router,
    ],
  );

  const usesServerSnapshot = activeProjectId === initialActiveProjectId;
  const serverLines = usesServerSnapshot
    ? lines
    : session?.title
      ? [{ lineNum: 1, type: "h1" as const, text: session.title }]
      : [];
  const displayLines = clientLines ?? serverLines;
  displayLinesRef.current = displayLines;
  const displayHasSnapshot = usesServerSnapshot && hasSnapshot;

  const baseAppState: AppState = session
    ? sources.length > 0 || displayHasSnapshot
      ? "ready"
      : "no-sources"
    : "no-session";
  const appState: AppState = revising
    ? "revising"
    : generating
      ? "generating"
      : generationError
        ? "failed"
        : baseAppState;

  const activeProjectName =
    projects.find((p) => p.id === activeProjectId)?.name ?? null;

  const selectedReqText = selectedReq
    ? (displayLines.find(
        (l) => l.reqId === selectedReq && l.type === "body",
      )?.text ?? null)
    : null;

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
        <div className="relative overflow-hidden" style={{ minWidth: 0 }}>
          {sidebarOpen && (
            <ProjectSidebar
              projects={projects}
              activeProjectId={activeProjectId}
              onOpenPalette={() => setPaletteOpen(true)}
              onSwitchProject={handleSwitchProject}
              onDeleteProject={handleDeleteProject}
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
          onAttachFiles={sessionId ? handleUploadFiles : undefined}
          onGenerateBrief={sessionId ? handleGenerateBrief : undefined}
          generating={generating}
          lines={displayLines}
          selectedReqText={selectedReqText}
          onClearSelection={() => setSelectedReq(null)}
          onSendMessage={sessionId && currentSnapshotId ? handleSendMessage : undefined}
          revising={revising}
          onUpdateLine={currentSnapshotId ? handleUpdateLine : undefined}
        />

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
              chatMessages={chatMessages}
              snapshots={snapshots}
              revisionsLoading={revisionsLoading}
              activeSnapshotId={currentSnapshotId}
              onSelectRevision={handleSelectRevision}
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
