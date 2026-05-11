"use client";

import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useState } from "react";

import { useMounted } from "@/lib/hooks/use-mounted";
import { useUploadThing } from "@/lib/uploadthing-client";

import { CommandPalette } from "./command-palette";
import { type AppState, DocView } from "./doc-view";
import { type ProjectListItem,ProjectSidebar } from "./project-sidebar";
import { RightPane, type SourceItem, type SourceType } from "./right-pane";
import { StatusBar } from "./statusbar";
import { TitleBar } from "./titlebar";

type RightTab = "sources" | "chat" | "revisions";

type SessionRef = { id: string; title: string } | null;

interface EditorShellProps {
  projects?: ProjectListItem[];
  activeProjectId?: string | null;
  session?: SessionRef;
  initialSources?: SourceItem[];
}

interface CacheEntry {
  session: SessionRef;
  sources: SourceItem[];
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
  };
}

export function EditorShell({
  projects = [],
  activeProjectId: initialActiveProjectId = null,
  session: initialSession,
  initialSources = [],
}: EditorShellProps) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rightOpen,   setRightOpen]   = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [rightTab,    setRightTab]    = useState<RightTab>("sources");
  const [selectedReq, setSelectedReq] = useState<string | null>(null);

  const [activeProjectId, setActiveProjectId] = useState<string | null>(
    initialActiveProjectId,
  );
  const [session, setSession] = useState<SessionRef>(initialSession ?? null);
  const [sources, setSources] = useState<SourceItem[]>(initialSources);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [sourcesError, setSourcesError] = useState<string | undefined>(undefined);

  const [projectCache, setProjectCache] = useState<Map<string, CacheEntry>>(
    () => {
      const m = new Map<string, CacheEntry>();
      if (initialActiveProjectId) {
        m.set(initialActiveProjectId, {
          session: initialSession ?? null,
          sources: initialSources,
        });
      }
      return m;
    },
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

  /* Warm the client cache with every project's session + sources in one shot.
     The currently-active project was seeded above and is not overwritten. */
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

  function handleSelectReq(id: string) {
    setSelectedReq((cur) => (cur === id ? null : id));
  }

  function handleOpenSources() {
    setRightOpen(true);
    setRightTab("sources");
  }

  /* Body grid columns based on panel state */
  const colTemplate = [
    sidebarOpen ? "220px" : "0px",
    "1fr",
    rightOpen ? "268px" : "0px",
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
          transition: "grid-template-columns 200ms cubic-bezier(0.2, 0, 0, 1)",
        }}
      >
        {/* Sidebar */}
        <div className="overflow-hidden" style={{ minWidth: 0 }}>
          {sidebarOpen && (
            <ProjectSidebar
              projects={projects}
              activeProjectId={activeProjectId}
              onOpenPalette={() => setPaletteOpen(true)}
              onSwitchProject={handleSwitchProject}
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
        <div className="overflow-hidden" style={{ minWidth: 0 }}>
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
