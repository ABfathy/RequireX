"use client";

import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useRef, useState } from "react";

import { useMounted } from "@/lib/hooks/use-mounted";
import { usePersistentState } from "@/lib/hooks/use-persistent-state";
import { diffLines, type LineDiffRow } from "@/lib/line-diff";
import { StreamingBriefParser } from "@/lib/streaming-brief-parser";
import { useUploadThing } from "@/lib/uploadthing-client";

import { CommandPalette } from "./command-palette";
import { ComparisonView } from "./comparison-view";
import { type AppState, type DocLineData, DocView } from "./doc-view";
import { ProjectSearchPalette } from "./project-search-palette";
import { ProjectSettingsModal } from "./project-settings-modal";
import { type ProjectListItem, ProjectSidebar } from "./project-sidebar";
import { ResizeHandle } from "./resize-handle";
import { RightPane, type SourceItem, type SourceType } from "./right-pane";
import { ShareModal } from "./share-modal";
import { SourcePreviewModal } from "./source-preview-modal";
import { StatusBar } from "./statusbar";
import { TitleBar } from "./titlebar";

type RightTab = "sources" | "chat" | "revisions";
type DocumentType = "GENERATED_BRIEF" | "FINALIZED_DOCUMENT";

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
  eventId: string;
  id: string | null;
  version: number | null;
  documentType: DocumentType | null;
  snapshotStatus: string | null;
  type: string;
  summary: string;
  createdAt: string;
  trigger: string | null;
  userMessage: string | null;
  feedbackBody?: string | null;
  feedbackAuthor?: string | null;
}

type SessionRef = { id: string; title: string } | null;
const DRAFT_TAB_ID = "draft";
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
  initialDocumentType?: DocumentType | null;
}

interface CacheEntry {
  session: SessionRef;
  sources: SourceItem[];
}

type SerializableProjectCache = Record<string, CacheEntry>;

type ComparableSnapshot = {
  id: string;
  version: number;
  documentType: DocumentType;
};

type ComparisonTab = {
  id: string;
  title: string;
  oldSnapshotId: string;
  newSnapshotId: string;
  oldVersion: number;
  newVersion: number;
  documentType: DocumentType;
  status: "loading" | "ready" | "error";
  rows: LineDiffRow[] | null;
  error: string | null;
};

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

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

type SseEvent =
  | { type: "start"; jobId?: string }
  | { type: "token"; text: string }
  | { type: "complete"; snapshotId: string; version: number }
  | { type: "error"; code: string; message: string };

const SMOOTH_CHAR_DELAY_MS = 5; // ~200 chars/sec — matches typical model generation speed
const SMOOTH_RENDER_INTERVAL_MS = 16; // cap React re-renders at ~60fps

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function readSseStream(
  body: ReadableStream<Uint8Array>,
  onLines: (lines: DocLineData[]) => void,
  onJobId?: (jobId: string) => void,
): Promise<{ snapshotId: string; version: number }> {
  const parser = new StreamingBriefParser();
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let completeResult: { snapshotId: string; version: number } | null = null;
  let lastRenderTime = 0;

  const flushIfDue = () => {
    const now = Date.now();
    if (now - lastRenderTime >= SMOOTH_RENDER_INTERVAL_MS) {
      lastRenderTime = now;
      const snapshot = parser.getSnapshot();
      if (snapshot.length > 0) onLines(snapshot);
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const parts = buf.split("\n\n");
    buf = parts.pop() ?? "";
    for (const part of parts) {
      if (!part.startsWith("data: ")) continue;
      const evt = JSON.parse(part.slice(6)) as SseEvent;
      if (evt.type === "start") {
        if (evt.jobId) onJobId?.(evt.jobId);
      } else if (evt.type === "token") {
        for (const ch of evt.text) {
          parser.feed(ch);
          flushIfDue();
          await delay(SMOOTH_CHAR_DELAY_MS);
        }
        // Ensure final state of this token is always rendered
        const snapshot = parser.getSnapshot();
        if (snapshot.length > 0) onLines(snapshot);
      } else if (evt.type === "complete") {
        completeResult = { snapshotId: evt.snapshotId, version: evt.version };
      } else if (evt.type === "error") {
        throw new Error(evt.message);
      }
    }
  }

  // Final flush for any trailing in-progress line
  const snapshot = parser.getSnapshot();
  if (snapshot.length > 0) onLines(snapshot);

  if (!completeResult)
    throw new Error("Stream ended without a complete event.");
  return completeResult;
}

function comparisonTabId(oldSnapshotId: string, newSnapshotId: string) {
  return `comparison-${oldSnapshotId}-${newSnapshotId}`;
}

function documentVersionLabel(
  documentType: DocumentType | null | undefined,
  version: number | null | undefined,
) {
  if (version == null) return null;
  return `${documentType === "FINALIZED_DOCUMENT" ? "Finalized Version" : "Brief Version"} ${version}`;
}

function linesToComparisonText(lines: DocLineData[]) {
  return lines
    .filter((line) => line.type !== "meta")
    .map((line) => (line.type === "blank" ? "" : (line.text ?? "")));
}

async function fetchSnapshotForComparison(snapshotId: string) {
  const res = await fetch(`/api/snapshots/${snapshotId}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(
      res.status === 404
        ? "One of the selected versions no longer exists."
        : "Could not load one of the selected versions.",
    );
  }
  return (await res.json()) as {
    lines: DocLineData[];
    version: number;
    documentType: DocumentType;
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
  initialDocumentType = null,
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
  const [projectSearchOpen, setProjectSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<SourceItem | null>(null);
  const [rightTab, setRightTab] = useState<RightTab>("sources");
  const [selectedReq, setSelectedReq] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [extractStatus, setExtractStatus] = useState<
    "idle" | "queued" | "running" | "failed"
  >("idle");
  const jobPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const feedbackPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastFeedbackCountRef = useRef(0);
  const [newFeedbackCount, setNewFeedbackCount] = useState(0);
  const shouldPollFeedbackRef = useRef(false);
  const latestSnapshotIdRef = useRef<string | null>(initialSnapshotId ?? null);
  const [streamingLines, setStreamingLines] = useState<DocLineData[] | null>(
    null,
  );
  const [revising, setRevising] = useState(false);
  const [currentSnapshotId, setCurrentSnapshotId] = useState<string | null>(
    initialSnapshotId,
  );
  const [currentDocumentType, setCurrentDocumentType] =
    useState<DocumentType | null>(initialDocumentType);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [snapshots, setSnapshots] = useState<SnapshotSummary[]>([]);
  const [revisionsLoading, setRevisionsLoading] = useState(false);
  const [clientLines, setClientLines] = useState<DocLineData[] | null>(null);
  const [pendingFocusClaimId, setPendingFocusClaimId] = useState<string | null>(
    null,
  );
  const [comparisonTabs, setComparisonTabs] = useState<ComparisonTab[]>([]);
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState(DRAFT_TAB_ID);

  const [activeProjectId, setActiveProjectId] = useState<string | null>(
    initialActiveProjectId,
  );
  const [session, setSession] = useState<SessionRef>(initialSession ?? null);
  const [sources, setSources] = useState<SourceItem[]>(initialSources);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [sourcesError, setSourcesError] = useState<string | undefined>(
    undefined,
  );

  const [viewingVersion, setViewingVersion] = useState<number | null>(null);

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

  const loadRevisions = useCallback(async (sid: string) => {
    setRevisionsLoading(true);
    try {
      const res = await fetch(`/api/sessions/${sid}/revisions`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        revisions: Array<{
          id: string;
          type: string;
          summary: string;
          createdAt: string;
          snapshotId: string | null;
          version: number | null;
          documentType: DocumentType | null;
          snapshotStatus: string | null;
          trigger: string | null;
          userMessage: string | null;
          selectionText: string | null;
          feedbackBody: string | null;
          feedbackAuthor: string | null;
        }>;
      };
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
          eventId: r.id,
          id: r.snapshotId,
          version: r.version,
          documentType: r.documentType,
          snapshotStatus: r.snapshotStatus,
          type: r.type,
          summary: r.summary,
          createdAt: r.createdAt,
          trigger: r.trigger,
          userMessage: r.userMessage,
          feedbackBody: r.feedbackBody,
          feedbackAuthor: r.feedbackAuthor,
        })),
      );

      // Track the latest document snapshot so Return-to-latest can reset correctly
      const latestDocument = [...allRevisions]
        .reverse()
        .find(
          (r) =>
            (r.type === "GENERATED" || r.type === "REGENERATED") &&
            r.snapshotId,
        );
      if (latestDocument?.snapshotId) {
        latestSnapshotIdRef.current = latestDocument.snapshotId;
      }

      // Detect new client activity since last load (BRIEF_CONFIRMED triggers auto-revise)
      const feedbackCount = allRevisions.filter(
        (r) =>
          r.type === "CLIENT_COMMENT_ADDED" ||
          r.type === "CLIENT_ANSWER_ADDED" ||
          r.type === "BRIEF_CONFIRMED",
      ).length;
      if (feedbackCount > lastFeedbackCountRef.current) {
        setNewFeedbackCount(
          (prev) => prev + (feedbackCount - lastFeedbackCountRef.current),
        );
      }
      lastFeedbackCountRef.current = feedbackCount;
    } catch {
      // silently fail — not critical
    } finally {
      setRevisionsLoading(false);
    }
  }, []);

  const stopJobPoll = useCallback(() => {
    if (jobPollRef.current !== null) {
      clearInterval(jobPollRef.current);
      jobPollRef.current = null;
    }
  }, []);

  const stopFeedbackPoll = useCallback(() => {
    if (feedbackPollRef.current !== null) {
      clearInterval(feedbackPollRef.current);
      feedbackPollRef.current = null;
    }
  }, []);

  const startJobPoll = useCallback(
    (jobId: string) => {
      stopJobPoll();
      setExtractStatus("queued");
      jobPollRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/jobs/${jobId}`, { cache: "no-store" });
          if (!res.ok) return;
          const job = (await res.json()) as {
            status: string;
            errorCode?: string | null;
          };
          if (job.status === "RUNNING") {
            setExtractStatus("running");
          } else if (job.status === "SUCCEEDED") {
            setExtractStatus("idle");
            stopJobPoll();
          } else if (job.status === "FAILED" || job.status === "CANCELED") {
            setExtractStatus("failed");
            stopJobPoll();
          }
        } catch {
          // silently ignore transient fetch errors
        }
      }, 2000);
    },
    [stopJobPoll],
  );

  const handleGenerateBrief = useCallback(async () => {
    if (!sessionId || generating) return;

    setGenerating(true);
    setGenerationError(null);
    setExtractStatus("idle");

    // Seed streaming view with header lines matching what the server will return,
    // preventing layout shift when router.refresh() prepends them.
    const PHASE_LABELS = [
      "Collecting sources…",
      "Processing content…",
      "Drafting brief…",
    ];
    let phaseIdx = 0;
    const makeHeaderLines = (phaseLabel: string): DocLineData[] => {
      return [
        { lineNum: 1, type: "meta", text: phaseLabel, small: true },
        { lineNum: 0, type: "blank" },
      ];
    };
    const initialHeader = makeHeaderLines(PHASE_LABELS[0]!);
    setStreamingLines(initialHeader);

    const phaseInterval = setInterval(() => {
      phaseIdx = Math.min(phaseIdx + 1, PHASE_LABELS.length - 1);
      const nextLabel = PHASE_LABELS[phaseIdx];
      setStreamingLines((prev) => {
        if (!prev || prev.length < 3) return prev;
        const updated = [...prev];
        updated[2] = { lineNum: 2, type: "meta", text: nextLabel, small: true };
        return updated;
      });
    }, 3000);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      if (!res.ok) {
        clearInterval(phaseInterval);
        const payload = (await res.json().catch(() => null)) as {
          error?: string;
          message?: string;
        } | null;
        throw new Error(
          payload?.message ?? payload?.error ?? "Failed to generate brief.",
        );
      }

      let newSnapshotId: string | null = null;
      const lineOffset = initialHeader.length;
      let firstToken = true;

      const onStreamLines = (parserLines: DocLineData[]) => {
        if (firstToken) {
          clearInterval(phaseInterval);
          firstToken = false;
        }
        const shifted = lineOffset
          ? parserLines.map((l) => ({
              ...l,
              lineNum: l.lineNum > 0 ? l.lineNum + lineOffset : 0,
            }))
          : parserLines;
        const header = makeHeaderLines("Drafting brief…");
        setStreamingLines([...header, ...shifted]);
      };

      if (
        res.headers.get("content-type")?.includes("text/event-stream") &&
        res.body
      ) {
        const result = await readSseStream(res.body, onStreamLines, (jobId) => {
          startJobPoll(jobId);
        });
        newSnapshotId = result.snapshotId;
      } else {
        clearInterval(phaseInterval);
        const result = (await res.json()) as {
          snapshotId: string;
          version: number;
        };
        newSnapshotId = result.snapshotId;
      }

      stopJobPoll();
      setExtractStatus("idle");
      if (newSnapshotId) {
        latestSnapshotIdRef.current = newSnapshotId;
        setCurrentSnapshotId(newSnapshotId);
        setCurrentDocumentType("GENERATED_BRIEF");
      }
      if (sessionId) await loadRevisions(sessionId);
      await refreshSources();

      router.refresh();
    } catch (error) {
      clearInterval(phaseInterval);
      stopJobPoll();
      setExtractStatus("failed");
      setGenerationError(
        error instanceof Error ? error.message : "Failed to generate brief.",
      );
      setStreamingLines(null);
    } finally {
      setGenerating(false);
    }
  }, [
    sessionId,
    generating,
    router,
    loadRevisions,
    refreshSources,
    startJobPoll,
    stopJobPoll,
  ]);

  const handleCreateFinalizedDocument = useCallback(async () => {
    if (!sessionId || finalizing) return;

    setFinalizing(true);
    setGenerationError(null);
    setExtractStatus("running");
    setStreamingLines([
      {
        lineNum: 1,
        type: "meta",
        text: "Creating finalized document...",
        small: true,
      },
      { lineNum: 0, type: "blank" },
    ]);

    try {
      const res = await fetch(
        `/api/sessions/${sessionId}/finalized-documents`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );

      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as {
          error?: string;
          message?: string;
        } | null;
        throw new Error(
          payload?.message ??
            payload?.error ??
            "Failed to create finalized document.",
        );
      }

      const result = (await res.json()) as {
        snapshotId: string;
        version: number;
        documentType: DocumentType;
      };
      const snapshotRes = await fetch(`/api/snapshots/${result.snapshotId}`, {
        cache: "no-store",
      });
      if (snapshotRes.ok) {
        const data = (await snapshotRes.json()) as {
          lines: DocLineData[];
          version: number;
          documentType: DocumentType;
        };
        setClientLines(data.lines);
      }

      latestSnapshotIdRef.current = result.snapshotId;
      setCurrentSnapshotId(result.snapshotId);
      setCurrentDocumentType(result.documentType);
      setSelectedReq(null);
      setViewingVersion(null);
      setStreamingLines(null);
      setExtractStatus("idle");
      await loadRevisions(sessionId);
      router.refresh();
    } catch (error) {
      setExtractStatus("failed");
      setGenerationError(
        error instanceof Error
          ? error.message
          : "Failed to create finalized document.",
      );
      setStreamingLines(null);
    } finally {
      setFinalizing(false);
    }
  }, [sessionId, finalizing, loadRevisions, router]);

  const handleSendMessage = useCallback(
    async (userMessage: string, selectionText?: string) => {
      if (
        !sessionId ||
        !currentSnapshotId ||
        currentDocumentType !== "GENERATED_BRIEF" ||
        revising
      ) {
        return;
      }

      setRevising(true);
      setGenerationError(null);
      setStreamingLines(null);
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
          const payload = (await res.json().catch(() => null)) as {
            error?: string;
            message?: string;
          } | null;
          throw new Error(
            payload?.message ?? payload?.error ?? "Failed to revise brief.",
          );
        }

        let newSnapshotId: string;
        if (
          res.headers.get("content-type")?.includes("text/event-stream") &&
          res.body
        ) {
          const result = await readSseStream(res.body, setStreamingLines);
          newSnapshotId = result.snapshotId;
        } else {
          const result = (await res.json()) as {
            snapshotId: string;
            version: number;
          };
          newSnapshotId = result.snapshotId;
        }

        latestSnapshotIdRef.current = newSnapshotId;
        setCurrentSnapshotId(newSnapshotId);
        setCurrentDocumentType("GENERATED_BRIEF");
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
    [
      sessionId,
      currentSnapshotId,
      currentDocumentType,
      revising,
      selectedReq,
      loadRevisions,
      router,
    ],
  );

  useEffect(() => {
    if (sessionId) void loadRevisions(sessionId);
  }, [sessionId, loadRevisions]);

  // Reset feedback badge and counter when session changes
  useEffect(() => {
    lastFeedbackCountRef.current = 0;
    setNewFeedbackCount(0);
    shouldPollFeedbackRef.current = false;
  }, [sessionId]);

  // Keep shouldPollFeedbackRef in sync with snapshot SHARED status (no interval restart needed)
  useEffect(() => {
    shouldPollFeedbackRef.current = snapshots.some(
      (s) => s.snapshotStatus === "SHARED",
    );
  }, [snapshots]);

  // One stable 30s interval per session — only fires loadRevisions when SHARED
  useEffect(() => {
    if (!sessionId) return;
    feedbackPollRef.current = setInterval(() => {
      if (shouldPollFeedbackRef.current) {
        void loadRevisions(sessionId);
      }
    }, 30_000);
    return () => stopFeedbackPoll();
  }, [sessionId, loadRevisions, stopFeedbackPoll]);

  // Clear streaming lines once the server-refreshed lines arrive, preventing
  // the flash from streamed content → empty state → server content.
  const streamingLinesRef = useRef(streamingLines);
  useEffect(() => {
    streamingLinesRef.current = streamingLines;
  }, [streamingLines]);
  useEffect(() => {
    if (streamingLinesRef.current && lines.length > 0) {
      setStreamingLines(null);
    }
  }, [lines]);

  const loadComparisonTab = useCallback(async (tab: ComparisonTab) => {
    setComparisonTabs((prev) =>
      prev.map((item) =>
        item.id === tab.id
          ? { ...item, status: "loading", rows: null, error: null }
          : item,
      ),
    );

    try {
      const [oldSnapshot, newSnapshot] = await Promise.all([
        fetchSnapshotForComparison(tab.oldSnapshotId),
        fetchSnapshotForComparison(tab.newSnapshotId),
      ]);
      if (
        oldSnapshot.documentType !== tab.documentType ||
        newSnapshot.documentType !== tab.documentType
      ) {
        throw new Error(
          "Generated briefs and finalized documents cannot be compared together.",
        );
      }
      const rows = diffLines(
        linesToComparisonText(oldSnapshot.lines),
        linesToComparisonText(newSnapshot.lines),
      );

      setComparisonTabs((prev) =>
        prev.map((item) =>
          item.id === tab.id
            ? { ...item, status: "ready", rows, error: null }
            : item,
        ),
      );
    } catch (error) {
      setComparisonTabs((prev) =>
        prev.map((item) =>
          item.id === tab.id
            ? {
                ...item,
                status: "error",
                rows: null,
                error:
                  error instanceof Error
                    ? error.message
                    : "Could not load comparison.",
              }
            : item,
        ),
      );
    }
  }, []);

  const handleOpenComparison = useCallback(
    (first: ComparableSnapshot, second: ComparableSnapshot) => {
      if (
        first.id === second.id ||
        first.version === second.version ||
        first.documentType !== second.documentType
      ) {
        return;
      }

      const [older, newer] =
        first.version < second.version ? [first, second] : [second, first];
      const id = comparisonTabId(older.id, newer.id);
      const existing = comparisonTabs.find((tab) => tab.id === id);

      if (existing) {
        setActiveWorkspaceTab(id);
        return;
      }

      const tab: ComparisonTab = {
        id,
        title: `Comparison: ${documentVersionLabel(older.documentType, older.version)} vs ${documentVersionLabel(newer.documentType, newer.version)}`,
        oldSnapshotId: older.id,
        newSnapshotId: newer.id,
        oldVersion: older.version,
        newVersion: newer.version,
        documentType: older.documentType,
        status: "loading",
        rows: null,
        error: null,
      };

      setComparisonTabs((prev) => [...prev, tab]);
      setActiveWorkspaceTab(id);
      void loadComparisonTab(tab);
    },
    [comparisonTabs, loadComparisonTab],
  );

  const handleCloseComparisonTab = useCallback(
    (id: string) => {
      setComparisonTabs((prev) => {
        const next = prev.filter((tab) => tab.id !== id);
        if (activeWorkspaceTab === id) {
          setActiveWorkspaceTab(next[next.length - 1]?.id ?? DRAFT_TAB_ID);
        }
        return next;
      });
    },
    [activeWorkspaceTab],
  );

  const handleRetryComparison = useCallback(
    (id: string) => {
      const tab = comparisonTabs.find((item) => item.id === id);
      if (tab) void loadComparisonTab(tab);
    },
    [comparisonTabs, loadComparisonTab],
  );

  // Ref keeps the latest displayLines accessible inside callbacks without
  // causing the callback to re-create every time lines change.
  const displayLinesRef = useRef<DocLineData[]>([]);

  const handleUpdateLine = useCallback(
    async (reqId: string, reqType: "claim" | "question", newText: string) => {
      const endpoint =
        reqType === "claim"
          ? `/api/claims/${reqId}`
          : `/api/questions/${reqId}`;
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newText }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as {
          message?: string;
        } | null;
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

  const handleInsertLineAfter = useCallback(
    async (section: string, orderIndex: number) => {
      if (!currentSnapshotId) return;
      const res = await fetch("/api/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          snapshotId: currentSnapshotId,
          section,
          orderIndex: orderIndex + 1,
          text: "…",
        }),
      });
      if (!res.ok) return;
      const newClaim = (await res.json()) as { id: string };
      // Re-fetch snapshot lines to get the renumbered state
      const data = await fetch(`/api/snapshots/${currentSnapshotId}`, {
        cache: "no-store",
      }).then((r) =>
        r.ok ? (r.json() as Promise<{ lines: DocLineData[] }>) : null,
      );
      if (data?.lines) {
        setClientLines(data.lines);
        setPendingFocusClaimId(newClaim.id);
      }
    },
    [currentSnapshotId],
  );

  const handleSelectRevision = useCallback(
    async (snapshotId: string | null) => {
      const isLatest =
        !snapshotId || snapshotId === latestSnapshotIdRef.current;
      if (isLatest) {
        setClientLines(null);
        setViewingVersion(null);
        if (latestSnapshotIdRef.current) {
          setCurrentSnapshotId(latestSnapshotIdRef.current);
          const latestSnapshot = snapshots.find(
            (snapshot) => snapshot.id === latestSnapshotIdRef.current,
          );
          if (latestSnapshot?.documentType) {
            setCurrentDocumentType(latestSnapshot.documentType);
          }
        }
        return;
      }
      if (snapshotId === currentSnapshotId) return;
      try {
        const res = await fetch(`/api/snapshots/${snapshotId}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          lines: DocLineData[];
          version: number;
          documentType: DocumentType;
        };
        setClientLines(data.lines);
        setViewingVersion(data.version ?? null);
        setCurrentSnapshotId(snapshotId);
        setCurrentDocumentType(data.documentType);
      } catch {
        // silently ignore
      }
    },
    [currentSnapshotId, snapshots],
  );

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
        setCurrentDocumentType(null);
        setChatMessages([]);
        setSnapshots([]);
        setComparisonTabs([]);
        setActiveWorkspaceTab(DRAFT_TAB_ID);
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
      const remainingProjects = previousProjects.filter(
        (p) => p.id !== projectId,
      );

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
  const baseLines = usesServerSnapshot ? lines : [];
  const displayLines = clientLines ?? baseLines;
  useEffect(() => {
    displayLinesRef.current = displayLines;
  });
  const currentSnapshotSummary = snapshots.find(
    (s) => s.id === currentSnapshotId,
  );
  const currentVersion = currentSnapshotSummary?.version ?? null;
  const effectiveDocumentType =
    currentSnapshotSummary?.documentType ?? currentDocumentType;
  const displayHasSnapshot = usesServerSnapshot
    ? hasSnapshot
    : currentSnapshotId !== null;

  // After a client-side project switch, auto-load the latest snapshot's lines so
  // the doc shows the actual brief instead of just the session title.
  useEffect(() => {
    if (usesServerSnapshot || clientLines !== null) return;
    const latestSnapshot = snapshots.find(
      (s) => s.id !== null && s.version !== null,
    );
    if (!latestSnapshot?.id) return;
    const snapshotId = latestSnapshot.id;
    fetch(`/api/snapshots/${snapshotId}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (
          data: {
            lines: DocLineData[];
            version: number;
            documentType: DocumentType;
          } | null,
        ) => {
          if (!data) return;
          setClientLines(data.lines);
          setCurrentSnapshotId(snapshotId);
          setCurrentDocumentType(data.documentType);
        },
      )
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshots, usesServerSnapshot]);

  const baseAppState: AppState = session
    ? sources.length > 0 || displayHasSnapshot
      ? "ready"
      : "no-sources"
    : "no-session";
  const appState: AppState = revising
    ? "revising"
    : generating || finalizing
      ? "generating"
      : generationError
        ? "failed"
        : baseAppState;

  const activeProjectName =
    projects.find((p) => p.id === activeProjectId)?.name ?? null;
  const hasGeneratedBrief =
    snapshots.some(
      (snapshot) =>
        snapshot.id != null && snapshot.documentType === "GENERATED_BRIEF",
    ) ||
    (displayHasSnapshot && effectiveDocumentType !== "FINALIZED_DOCUMENT");
  const canCreateFinalizedDocument =
    Boolean(sessionId) && hasGeneratedBrief && !generating && !finalizing;

  const selectedReqText = selectedReq
    ? (displayLines.find((l) => l.reqId === selectedReq && l.type === "body")
        ?.text ?? null)
    : null;
  const activeComparisonTab =
    activeWorkspaceTab === DRAFT_TAB_ID
      ? null
      : (comparisonTabs.find((tab) => tab.id === activeWorkspaceTab) ?? null);
  const activeComparisonContent = activeComparisonTab ? (
    <ComparisonView
      oldVersion={activeComparisonTab.oldVersion}
      newVersion={activeComparisonTab.newVersion}
      documentType={activeComparisonTab.documentType}
      rows={activeComparisonTab.rows}
      loading={activeComparisonTab.status === "loading"}
      error={activeComparisonTab.error}
      onRetry={() => handleRetryComparison(activeComparisonTab.id)}
      onClose={() => handleCloseComparisonTab(activeComparisonTab.id)}
    />
  ) : null;

  /* ⌘K → command palette · ⌘P → project search */
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((p) => !p);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "p") {
        e.preventDefault();
        setProjectSearchOpen((p) => !p);
      }
      if (e.key === "Escape") {
        setPaletteOpen(false);
        setProjectSearchOpen(false);
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

  const handleShareBrief = useCallback(() => setShareModalOpen(true), []);

  function handleExportPdf() {
    const lines = displayLinesRef.current;
    if (!lines.length) return;
    const projectName =
      projects.find((p) => p.id === activeProjectId)?.name ?? "Brief";

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>${projectName}</title>
<style>
  body{font-family:system-ui,sans-serif;max-width:720px;margin:40px auto;padding:0 24px;color:#111;line-height:1.6}
  h1{font-size:22px;font-weight:700;margin:0 0 4px}
  h2{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#666;margin:24px 0 8px}
  .meta{font-size:11px;color:#999;font-family:monospace;margin:0 0 16px}
  .body{font-size:14px;margin:0 0 8px}
  .body.small{font-size:12px;color:#666}
  .blank{height:8px}
  @media print{body{margin:20px}}
</style></head><body>
${lines
  .map((l) => {
    if (l.type === "h1") return `<h1>${escapeHtml(l.text ?? "")}</h1>`;
    if (l.type === "h2") return `<h2>${escapeHtml(l.text ?? "")}</h2>`;
    if (l.type === "meta")
      return `<div class="meta">${escapeHtml(l.text ?? "")}</div>`;
    if (l.type === "body")
      return `<p class="body${l.small ? " small" : ""}">${escapeHtml(l.text ?? "")}</p>`;
    if (l.type === "blank") return `<div class="blank"></div>`;
    return "";
  })
  .join("\n")}
</body></html>`;

    const iframe = document.createElement("iframe");
    iframe.style.cssText =
      "position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none";
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      return;
    }
    doc.open();
    doc.write(html);
    doc.close();
    iframe.contentWindow?.focus();
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 250);
  }

  function handleProjectSaved(name: string, clientName: string) {
    if (!activeProjectId) return;
    setProjects((prev) =>
      prev.map((p) =>
        p.id === activeProjectId ? { ...p, name, clientName } : p,
      ),
    );
  }

  /* Reset snapshot state when session changes */
  useEffect(() => {
    if (!sessionId) return;
    setSnapshots([]);
    setViewingVersion(null);
    setClientLines(null);
    setChatMessages([]);
    setComparisonTabs([]);
    setCurrentDocumentType(
      sessionId === initialSession?.id ? initialDocumentType : null,
    );
    setActiveWorkspaceTab(DRAFT_TAB_ID);
  }, [sessionId, initialSession?.id, initialDocumentType]);

  // Clean up polls when the component unmounts
  useEffect(
    () => () => {
      stopJobPoll();
      stopFeedbackPoll();
    },
    [stopJobPoll, stopFeedbackPoll],
  );

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
              onOpenPalette={() => setProjectSearchOpen(true)}
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
          currentVersion={currentVersion}
          currentDocumentType={effectiveDocumentType}
          selectedReq={selectedReq}
          onSelectReq={handleSelectReq}
          onAddSources={handleOpenSources}
          onAttachFiles={sessionId ? handleUploadFiles : undefined}
          onGenerateBrief={sessionId ? handleGenerateBrief : undefined}
          onCreateFinalizedDocument={
            canCreateFinalizedDocument
              ? handleCreateFinalizedDocument
              : undefined
          }
          finalizing={finalizing}
          generating={generating}
          hasSnapshot={displayHasSnapshot}
          generationError={generationError}
          onRetry={sessionId ? handleGenerateBrief : undefined}
          streamingLines={streamingLines}
          lines={displayLines}
          selectedReqText={selectedReqText}
          onClearSelection={() => setSelectedReq(null)}
          onSendMessage={
            sessionId &&
            currentSnapshotId &&
            effectiveDocumentType === "GENERATED_BRIEF"
              ? handleSendMessage
              : undefined
          }
          revising={revising}
          onUpdateLine={currentSnapshotId ? handleUpdateLine : undefined}
          snapshotId={currentSnapshotId}
          onShareBrief={currentSnapshotId ? handleShareBrief : undefined}
          onInsertLineAfter={
            currentSnapshotId ? handleInsertLineAfter : undefined
          }
          autoFocusReqId={pendingFocusClaimId}
          onAutoFocusConsumed={() => setPendingFocusClaimId(null)}
          viewingVersion={viewingVersion}
          onExitVersionView={() => void handleSelectRevision(null)}
          comparisonTabs={comparisonTabs.map((tab) => ({
            id: tab.id,
            title: tab.title,
          }))}
          activeWorkspaceTab={activeWorkspaceTab}
          activeComparisonContent={activeComparisonContent}
          onSelectWorkspaceTab={setActiveWorkspaceTab}
          onCloseComparisonTab={handleCloseComparisonTab}
          onOpenSource={(id) => {
            const s = sources.find((src) => src.id === id);
            if (s) setPreviewItem(s);
          }}
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
              onPreviewSource={setPreviewItem}
              chatMessages={chatMessages}
              snapshots={snapshots}
              snapshotsLoading={revisionsLoading}
              viewingSnapshotId={currentSnapshotId}
              onViewSnapshot={handleSelectRevision}
              onCompareSnapshots={handleOpenComparison}
              newFeedbackCount={newFeedbackCount}
              onClearFeedbackBadge={() => setNewFeedbackCount(0)}
            />
          )}
        </div>
      </div>

      <StatusBar
        selectedReq={selectedReq}
        currentVersion={currentVersion}
        currentDocumentType={effectiveDocumentType}
        extractStatus={extractStatus}
      />

      {previewItem && (
        <SourcePreviewModal
          item={previewItem}
          onClose={() => setPreviewItem(null)}
        />
      )}
      {paletteOpen && (
        <CommandPalette
          onClose={() => setPaletteOpen(false)}
          onAddSource={() => {
            setRightOpen(true);
            setRightTab("sources");
          }}
          onRegenerate={!generating ? handleGenerateBrief : undefined}
          onViewRevisions={() => {
            setRightOpen(true);
            setRightTab("revisions");
          }}
          onExportPdf={
            displayLinesRef.current.length > 0 ? handleExportPdf : undefined
          }
          onOpenSettings={
            activeProjectId ? () => setSettingsOpen(true) : undefined
          }
          onShare={currentSnapshotId ? handleShareBrief : undefined}
        />
      )}
      {shareModalOpen && currentSnapshotId && (
        <ShareModal
          snapshotId={currentSnapshotId}
          onClose={() => setShareModalOpen(false)}
        />
      )}
      {settingsOpen && activeProjectId && (
        <ProjectSettingsModal
          projectId={activeProjectId}
          initialName={
            projects.find((p) => p.id === activeProjectId)?.name ?? ""
          }
          initialClientName={
            projects.find((p) => p.id === activeProjectId)?.clientName ?? ""
          }
          onClose={() => setSettingsOpen(false)}
          onSaved={handleProjectSaved}
        />
      )}
      {projectSearchOpen && (
        <ProjectSearchPalette
          projects={projects}
          activeProjectId={activeProjectId}
          onSelect={handleSwitchProject}
          onClose={() => setProjectSearchOpen(false)}
        />
      )}
    </div>
  );
}
