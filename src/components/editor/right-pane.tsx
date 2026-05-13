"use client";

import { useEffect, useRef, useState } from "react";

import { Icons } from "@/components/icons";
import { IconButton } from "@/components/ui/icon-button";

import { AddTextDialog } from "./add-text-dialog";

/* ── Types ─────────────────────────────────────────────── */
type RightTab = "sources" | "chat" | "revisions";

export interface SnapshotListItem {
  id: string;
  version: number;
  status: string;
  createdAt: Date | string;
}

export type SourceType = "TEXT" | "AUDIO" | "IMAGE" | "PDF";
export type SourceStatus =
  | "UPLOADED"
  | "QUEUED"
  | "PROCESSING"
  | "PROCESSED"
  | "FAILED";

export interface SourceItem {
  id: string;
  label: string;
  sourceType: SourceType;
  status: SourceStatus;
  createdAt: string;
  fileUrl?: string;
  mimeType?: string;
}

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
  feedbackBody?: string | null;
  feedbackAuthor?: string | null;
}

export interface RightPaneProps {
  activeTab: RightTab;
  onTabChange: (tab: RightTab) => void;
  sessionId?: string;
  /* sources tab */
  sources?: SourceItem[];
  sourcesLoading?: boolean;
  sourcesError?: string;
  onDeleteSource?: (id: string) => void;
  onRenameSource?: (id: string, label: string) => void;
  onSubmitText?: (text: string) => Promise<void>;
  onUploadFiles?: (files: File[]) => Promise<void>;
  onRetrySourceLoad?: () => void;
  onPreviewSource?: (item: SourceItem) => void;
  /* chat tab */
  chatMessages?: ChatMessage[];
  /* revisions tab */
  snapshots?: SnapshotSummary[];
  snapshotsLoading?: boolean;
  viewingSnapshotId?: string | null;
  onViewSnapshot?: (id: string | null) => Promise<void>;
  onCompareSnapshots?: (
    first: { id: string; version: number },
    second: { id: string; version: number },
  ) => void;
}

const TABS: { id: RightTab; label: string }[] = [
  { id: "sources", label: "Sources" },
  { id: "chat", label: "Chat" },
  { id: "revisions", label: "Revisions" },
];

/* ── Helpers ────────────────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.08em]"
      style={{ color: "var(--fg-muted)" }}
    >
      {children}
    </div>
  );
}

function EmptyState({
  icon,
  message,
}: {
  icon: React.ReactNode;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 px-4 text-center">
      <div style={{ color: "var(--fg-disabled)" }}>{icon}</div>
      <p
        className="text-[11px] leading-[1.5] whitespace-pre-line"
        style={
          {
            color: "var(--fg-muted)",
            textWrap: "pretty",
          } as React.CSSProperties
        }
      >
        {message}
      </p>
    </div>
  );
}

/* ── Source status helpers ──────────────────────────────── */
const STATUS_DOT: Record<SourceStatus, string> = {
  PROCESSED: "var(--success)",
  PROCESSING: "var(--warning)",
  QUEUED: "var(--info)",
  UPLOADED: "var(--fg-tertiary)",
  FAILED: "var(--danger)",
};

const STATUS_LABEL: Record<SourceStatus, string> = {
  PROCESSED: "Ready",
  PROCESSING: "Processing",
  QUEUED: "Queued",
  UPLOADED: "Uploaded",
  FAILED: "Failed",
};

function relativeTime(dateStr: string | Date): string {
  try {
    const diffMs = new Date(dateStr).getTime() - Date.now();
    const diffMin = Math.round(diffMs / 60_000);
    const fmt = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
    const absMin = Math.abs(diffMin);
    if (absMin < 60) return fmt.format(diffMin, "minute");
    const diffHr = Math.round(diffMin / 60);
    if (Math.abs(diffHr) < 24) return fmt.format(diffHr, "hour");
    return fmt.format(Math.round(diffHr / 24), "day");
  } catch {
    return "";
  }
}

function sourceIcon(type: SourceType) {
  if (type === "AUDIO") return <Icons.Mic size={13} aria-hidden="true" />;
  return <Icons.FileText size={13} aria-hidden="true" />;
}

/* ── SourceRow ──────────────────────────────────────────── */
interface SourceRowProps {
  item: SourceItem;
  onDelete?: (id: string) => void;
  onRename?: (id: string, label: string) => void;
  onPreview?: (item: SourceItem) => void;
}

function SourceRow({ item, onDelete, onRename, onPreview }: SourceRowProps) {
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(item.label);
  const [confirming, setConfirming] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setEditVal(item.label);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function commitEdit() {
    const trimmed = editVal.trim();
    if (trimmed && trimmed !== item.label && onRename) {
      onRename(item.id, trimmed);
    }
    setEditing(false);
  }

  function handleEditKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      commitEdit();
    }
    if (e.key === "Escape") {
      setEditing(false);
    }
  }

  const relTime = relativeTime(item.createdAt);

  return (
    <div
      className="group flex items-center gap-2 px-3 py-2 transition-[background-color] duration-[120ms] hover:bg-[var(--surface-3)]"
      role="listitem"
    >
      {/* Type icon */}
      <span style={{ color: "var(--fg-muted)", flexShrink: 0 }}>
        {sourceIcon(item.sourceType)}
      </span>

      {/* Label + meta */}
      <div className="flex flex-col flex-1 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            value={editVal}
            onChange={(e) => setEditVal(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleEditKeyDown}
            className="text-[12px] bg-transparent border-b focus-visible:outline-none w-full"
            style={{
              color: "var(--fg-primary)",
              borderColor: "var(--accent)",
            }}
            autoComplete="off"
            spellCheck={false}
          />
        ) : (
          <button
            type="button"
            onClick={onRename ? startEdit : undefined}
            className="text-[12px] text-left truncate focus-visible:outline-none focus-visible:underline"
            style={{
              color: "var(--fg-secondary)",
              cursor: onRename ? "text" : "default",
            }}
            title={item.label}
          >
            {item.label}
          </button>
        )}
        <span
          className="text-[10px] truncate tabular-nums"
          style={{ color: "var(--fg-disabled)", fontFamily: "var(--font-mono)" }}
          suppressHydrationWarning
        >
          {relTime}
        </span>
      </div>

      {/* Right action area — fixed width so nothing shifts on hover or confirm */}
      <div className="relative flex items-center justify-end shrink-0 w-[50px] h-6">
        {confirming ? (
          /* Delete confirmation: two icon buttons, no text, no layout jump */
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Cancel delete"
              onClick={() => setConfirming(false)}
              className="inline-flex items-center justify-center size-[22px] rounded-[4px] transition-[transform,background-color,color] duration-[120ms] hover:bg-[var(--surface-2)] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)] cursor-pointer"
              style={{ color: "var(--fg-muted)" }}
            >
              <Icons.X size={11} />
            </button>
            <button
              type="button"
              aria-label="Confirm delete"
              onClick={() => {
                onDelete?.(item.id);
                setConfirming(false);
              }}
              className="inline-flex items-center justify-center size-[22px] rounded-[4px] transition-[transform,background-color] duration-[120ms] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)] cursor-pointer"
              style={{
                background:
                  "color-mix(in srgb, var(--danger) 15%, transparent)",
                color: "var(--danger)",
              }}
            >
              <Icons.Check size={11} />
            </button>
          </div>
        ) : (
          <>
            {/* Status dot — sits in place, cross-fades with action buttons */}
            <span
              className={`absolute inset-0 m-auto size-[6px] rounded-full transition-opacity duration-[150ms] pointer-events-none ${
                (onPreview ?? onDelete)
                  ? "opacity-60 group-hover:opacity-0"
                  : "opacity-60"
              }`}
              style={{ background: STATUS_DOT[item.status] }}
              aria-label={STATUS_LABEL[item.status]}
              role="img"
            />

            {/* Action buttons — overlay the dot, fade in on hover */}
            {(onPreview ?? onDelete) && (
              <div className="absolute inset-0 flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-[150ms]">
                {onPreview && (
                  <IconButton
                    label={`Preview ${item.label}`}
                    onClick={() => onPreview(item)}
                    className="active:scale-[0.96] transition-[transform,background-color,color]"
                  >
                    <Icons.Eye size={11} />
                  </IconButton>
                )}
                {onDelete && (
                  <IconButton
                    label={`Delete ${item.label}`}
                    onClick={() => setConfirming(true)}
                    className="active:scale-[0.96] transition-[transform,background-color,color]"
                  >
                    <Icons.X size={11} />
                  </IconButton>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ── SkeletonRow ────────────────────────────────────────── */
function SkeletonRow() {
  return (
    <div className="flex items-center gap-2 px-3 py-2" aria-hidden="true">
      <div
        className="size-[13px] rounded-[3px] animate-pulse shrink-0"
        style={{ background: "var(--surface-3)" }}
      />
      <div className="flex flex-col flex-1 gap-1.5">
        <div
          className="h-[10px] w-3/4 rounded-[3px] animate-pulse"
          style={{ background: "var(--surface-3)" }}
        />
        <div
          className="h-[8px] w-1/2 rounded-[3px] animate-pulse"
          style={{ background: "var(--surface-3)" }}
        />
      </div>
    </div>
  );
}

/* ── SourcesTab ─────────────────────────────────────────── */
interface SourcesTabProps {
  sources?: SourceItem[];
  loading?: boolean;
  error?: string;
  onDelete?: (id: string) => void;
  onRename?: (id: string, label: string) => void;
  onSubmitText?: (text: string) => Promise<void>;
  onUploadFiles?: (files: File[]) => Promise<void>;
  onRetry?: () => void;
  onPreview?: (item: SourceItem) => void;
}

function SourcesTab({
  sources,
  loading,
  error,
  onDelete,
  onRename,
  onSubmitText,
  onUploadFiles,
  onRetry,
  onPreview,
}: SourcesTabProps) {
  const [pasteOpen, setPasteOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = "";
    if (picked.length > 0 && onUploadFiles) {
      void onUploadFiles(picked);
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      <SectionLabel>Ingested sources</SectionLabel>

      {/* Error state */}
      {error && (
        <div
          className="mx-3 mb-3 px-3 py-2 rounded-[5px] border text-[11px]"
          style={{
            background: "color-mix(in srgb, var(--danger) 8%, transparent)",
            borderColor: "color-mix(in srgb, var(--danger) 30%, transparent)",
            color: "var(--danger)",
          }}
          role="alert"
        >
          {error}
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="ml-2 underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)] cursor-pointer"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div aria-label="Loading sources…">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      )}

      {/* Source list */}
      {!loading && sources && sources.length > 0 && (
        <div role="list" aria-label="Sources">
          {sources.map((item) => (
            <SourceRow
              key={item.id}
              item={item}
              onDelete={onDelete}
              onRename={onRename}
              onPreview={onPreview}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && (!sources || sources.length === 0) && (
        <EmptyState
          icon={<Icons.FileText size={20} />}
          message={
            "No sources added yet.\nPaste text or drop a file to get started."
          }
        />
      )}

      {/* Add buttons */}
      <div
        className="px-3 pb-3 pt-2 mt-auto border-t"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setPasteOpen(true)}
            disabled={!onSubmitText}
            className="flex items-center gap-1.5 h-[26px] px-2 rounded-[5px] text-[11px] border transition-colors duration-[120ms] hover:bg-[var(--surface-3)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex-1"
            style={{
              color: "var(--fg-tertiary)",
              borderColor: "var(--border)",
              background: "transparent",
            }}
          >
            <Icons.Plus size={12} aria-hidden="true" />
            <span>Add text</span>
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={!onUploadFiles}
            className="flex items-center gap-1.5 h-[26px] px-2 rounded-[5px] text-[11px] border transition-colors duration-[120ms] hover:bg-[var(--surface-3)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex-1"
            style={{
              color: "var(--fg-tertiary)",
              borderColor: "var(--border)",
              background: "transparent",
            }}
          >
            <Icons.FileText size={12} aria-hidden="true" />
            <span>Upload files</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,application/pdf,audio/*"
            className="hidden"
            onChange={handleFilePick}
          />
        </div>
      </div>

      {pasteOpen && (
        <AddTextDialog
          onSubmit={onSubmitText}
          onClose={() => setPasteOpen(false)}
        />
      )}
    </div>
  );
}

/* ── ChatTab ────────────────────────────────────────────── */
function ChatTab({ messages }: { messages?: ChatMessage[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

  if (!messages || messages.length === 0) {
    return (
      <>
        <SectionLabel>Chat history</SectionLabel>
        <EmptyState
          icon={<Icons.MessageSquare size={20} />}
          message={"No messages yet.\nUse the chat bar below to get started."}
        />
      </>
    );
  }

  return (
    <>
      <SectionLabel>Chat history</SectionLabel>
      <div className="px-3 pt-1 pb-4 flex flex-col gap-4">
        {messages.map((msg) => (
          <div key={msg.id} className="flex flex-col gap-2.5">
            {/* User bubble */}
            <div className="flex justify-end">
              <div
                className="max-w-[88%] rounded-[10px] rounded-br-[3px] px-3 py-2 text-[12px] leading-[1.6]"
                style={{
                  background: "var(--accent)",
                  color: "var(--accent-fg)",
                }}
              >
                {msg.selectionText && (
                  <div
                    className="text-[10px] mb-1.5 pb-1.5 border-b opacity-75 italic truncate"
                    style={{
                      borderColor:
                        "color-mix(in srgb, var(--accent-fg) 30%, transparent)",
                    }}
                  >
                    Re: {msg.selectionText.slice(0, 70)}
                    {msg.selectionText.length > 70 ? "…" : ""}
                  </div>
                )}
                {msg.userMessage}
              </div>
            </div>
            {/* AI response */}
            <div className="flex justify-start">
              <div
                className="flex items-center gap-1.5 rounded-[10px] rounded-bl-[3px] px-3 py-1.5 text-[11px] leading-[1.55]"
                style={{
                  background: "var(--surface-3)",
                  color: "var(--fg-tertiary)",
                  border: "1px solid var(--border)",
                }}
              >
                <Icons.Check
                  size={10}
                  aria-hidden="true"
                  className="shrink-0"
                  style={{ color: "var(--success)" }}
                />
                <span>
                  Brief updated →{" "}
                  <span
                    className="font-medium"
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "var(--accent)",
                    }}
                  >
                    v{msg.version}
                  </span>
                </span>
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </>
  );
}

/* ── RevisionsTab ───────────────────────────────────────── */
const relRevTime = relativeTime;

function RevisionsTab({
  snapshots,
  loading,
  viewingSnapshotId,
  onViewSnapshot,
  onCompareSnapshots,
}: {
  snapshots?: SnapshotSummary[];
  loading?: boolean;
  viewingSnapshotId?: string | null;
  onViewSnapshot?: (id: string | null) => Promise<void>;
  onCompareSnapshots?: (
    first: { id: string; version: number },
    second: { id: string; version: number },
  ) => void;
}) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [compareBaseId, setCompareBaseId] = useState<string | null>(null);
  const [compareError, setCompareError] = useState<string | null>(null);

  async function handleRevisionClick(id: string) {
    if (!onViewSnapshot || loadingId) return;
    setLoadingId(id);
    try {
      await onViewSnapshot(id);
    } finally {
      setLoadingId(null);
    }
  }

  if (loading) {
    return (
      <>
        <SectionLabel>Revision history</SectionLabel>
        <div className="px-3" aria-label="Loading revisions…">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-3 mb-4">
              <div
                className="mt-1 size-[8px] rounded-full shrink-0 animate-pulse"
                style={{ background: "var(--surface-3)" }}
              />
              <div className="flex flex-col gap-1.5 flex-1">
                <div
                  className="h-[10px] w-2/3 rounded animate-pulse"
                  style={{ background: "var(--surface-3)" }}
                />
                <div
                  className="h-[8px] w-1/2 rounded animate-pulse"
                  style={{ background: "var(--surface-3)" }}
                />
              </div>
            </div>
          ))}
        </div>
      </>
    );
  }

  if (!snapshots || snapshots.length === 0) {
    return (
      <>
        <SectionLabel>Revision history</SectionLabel>
        <EmptyState
          icon={<Icons.History size={20} />}
          message={
            "No revisions yet.\nRevisions appear after the first generation."
          }
        />
      </>
    );
  }

  const comparableSnapshots = Array.from(
    new Map(
      snapshots
        .filter((snap) => snap.id && snap.version != null)
        .map((snap) => [
          snap.id!,
          {
            id: snap.id!,
            version: snap.version!,
            label: `Version ${snap.version}`,
          },
        ]),
    ).values(),
  );

  return (
    <>
      <SectionLabel>Revision history</SectionLabel>

      {viewingSnapshotId && (
        <div className="mx-3 mb-2">
          <button
            type="button"
            onClick={() => void onViewSnapshot?.(null)}
            className="flex items-center gap-1.5 w-full h-[26px] px-2 rounded-[5px] text-[11px] border transition-colors duration-[120ms] hover:bg-[var(--surface-3)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)] cursor-pointer"
            style={{
              color: "var(--accent)",
              borderColor: "color-mix(in srgb, var(--accent) 40%, transparent)",
              background: "color-mix(in srgb, var(--accent) 8%, transparent)",
            }}
          >
            <Icons.ArrowLeft size={11} aria-hidden="true" />
            <span>Return to latest</span>
          </button>
        </div>
      )}

      <div className="px-3 pb-3">
        {snapshots.map((snap, idx) => {
          const isActive = snap.id != null && snap.id === viewingSnapshotId;
          const isLast = idx === snapshots.length - 1;
          const isChatRevision = snap.trigger === "chat";
          const isFeedback = snap.type === "CLIENT_COMMENT_ADDED" || snap.type === "CLIENT_ANSWER_ADDED" || snap.type === "BRIEF_CONFIRMED";
          const isLoadingThis = loadingId === snap.id;
          const isClickable =
            !!snap.id && !!onViewSnapshot && !isActive && !loadingId;
          const canCompare =
            !!snap.id && snap.version != null && !!onCompareSnapshots;
          const compareOpen = canCompare && compareBaseId === snap.id;
          const compareOptions = comparableSnapshots.filter(
            (item) => item.id !== snap.id,
          );
          return (
            <div key={snap.id ?? `rev-${idx}`}>
              <div
                className={`flex items-start gap-3 mb-2 rounded-[5px] px-1 -mx-1 transition-colors duration-[100ms] ${isClickable ? "cursor-pointer hover:bg-[var(--surface-3)]" : ""} ${isLoadingThis ? "opacity-70" : ""}`}
                role={isClickable ? "button" : undefined}
                tabIndex={isClickable ? 0 : undefined}
                onClick={isClickable ? () => void handleRevisionClick(snap.id!) : undefined}
                onKeyDown={isClickable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); void handleRevisionClick(snap.id!); } } : undefined}
              >
                {/* Timeline dot + line */}
                <div className="flex flex-col items-center shrink-0 mt-[3px]">
                  <div
                    className={`size-[8px] rounded-full shrink-0 ${isLoadingThis ? "animate-pulse" : ""}`}
                    style={{
                      background: isActive
                        ? "var(--accent)"
                        : isLoadingThis
                          ? "var(--warning)"
                          : isChatRevision
                            ? "var(--info)"
                            : isFeedback
                              ? "var(--success)"
                              : "var(--fg-muted)",
                      boxShadow: isActive
                        ? "0 0 0 2px color-mix(in srgb, var(--accent) 25%, transparent)"
                        : undefined,
                    }}
                  />
                  {!isLast && (
                    <div
                      className="w-px flex-1 mt-1"
                      style={{ background: "var(--border)", minHeight: 16 }}
                    />
                  )}
                </div>

                {/* Content */}
                <div className="flex flex-col min-w-0 pb-2 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {snap.version != null && (
                      <span
                        className="text-[10px] font-medium shrink-0"
                        style={{
                          fontFamily: "var(--font-mono)",
                          color: isActive
                            ? "var(--accent)"
                            : "var(--fg-tertiary)",
                        }}
                      >
                        v{snap.version}
                      </span>
                    )}
                    <span
                      className="text-[11px] truncate"
                      style={{
                        color: isActive
                          ? "var(--fg-primary)"
                          : "var(--fg-secondary)",
                      }}
                    >
                      {isChatRevision && snap.userMessage
                        ? snap.userMessage.slice(0, 60) +
                          (snap.userMessage.length > 60 ? "…" : "")
                        : snap.summary}
                    </span>
                  </div>
                  <span
                    className="text-[10px] tabular-nums mt-0.5"
                    style={{
                      color: "var(--fg-disabled)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {relRevTime(snap.createdAt)}
                  </span>
                </div>
                {snap.feedbackBody && (
                  <div
                    className="mt-1.5 p-2 rounded-[6px] rounded-tl-[2px] text-[12px] leading-relaxed border"
                    style={{
                      background: "var(--surface-1)",
                      borderColor: "var(--border)",
                      color: "var(--fg-primary)",
                    }}
                  >
                    <div className="text-[10px] font-medium mb-1 uppercase tracking-[0.06em]" style={{ color: "var(--success)" }}>
                      {snap.feedbackAuthor || "Client"}
                    </div>
                    {snap.feedbackBody}
                  </div>
                )}
                {canCompare && (
                  <button
                    type="button"
                    aria-label={`Compare version ${snap.version}`}
                    title={`Compare version ${snap.version}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      setCompareError(null);
                      setCompareBaseId((current) =>
                        current === snap.id ? null : snap.id!,
                      );
                    }}
                    className="inline-flex items-center gap-1 h-[22px] px-1.5 rounded-[4px] text-[10px] font-medium transition-colors duration-[120ms] hover:bg-[var(--surface-3)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)] cursor-pointer shrink-0 mt-0.5"
                    style={{
                      color: compareOpen ? "var(--accent)" : "var(--fg-tertiary)",
                      background: compareOpen ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "transparent",
                    }}
                  >
                    <Icons.GitCompare size={11} aria-hidden="true" />
                    <span>Compare</span>
                  </button>
                )}
              </div>
              {compareOpen && (
                <div
                  className="ml-[22px] mr-0 mb-3 rounded-[6px] border p-2"
                  style={{
                    background: "var(--surface-1)",
                    borderColor: "var(--border)",
                  }}
                >
                  <div
                    className="text-[10px] font-medium mb-1.5"
                    style={{
                      color: "var(--fg-muted)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    Compare v{snap.version} with
                  </div>
                  {compareOptions.length === 0 ? (
                    <p
                      className="text-[11px]"
                      style={{ color: "var(--fg-muted)" }}
                    >
                      No other versions available.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {compareOptions.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => {
                            if (!snap.id || snap.version == null) return;
                            if (option.version === snap.version) {
                              setCompareError("Choose a different version.");
                              return;
                            }
                            onCompareSnapshots(
                              { id: snap.id, version: snap.version },
                              { id: option.id, version: option.version },
                            );
                            setCompareBaseId(null);
                            setCompareError(null);
                          }}
                          className="flex items-center justify-between h-[24px] px-2 rounded-[4px] text-[11px] transition-colors duration-[120ms] hover:bg-[var(--surface-3)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)] cursor-pointer"
                          style={{ color: "var(--fg-secondary)" }}
                        >
                          <span>{option.label}</span>
                          <Icons.ArrowRight size={10} aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                  )}
                  {compareError && (
                    <p
                      className="text-[10px] mt-1.5"
                      style={{ color: "var(--danger)" }}
                      role="alert"
                    >
                      {compareError}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ── RightPane ──────────────────────────────────────────── */
export function RightPane({
  activeTab,
  onTabChange,
  sources,
  sourcesLoading,
  sourcesError,
  onDeleteSource,
  onRenameSource,
  onSubmitText,
  onUploadFiles,
  onRetrySourceLoad,
  onPreviewSource,
  chatMessages,
  snapshots,
  snapshotsLoading,
  viewingSnapshotId,
  onViewSnapshot,
  onCompareSnapshots,
}: RightPaneProps) {
  return (
    <aside
      className="flex flex-col h-full w-full overflow-hidden border-l"
      style={{
        background: "var(--surface-2)",
        borderColor: "var(--border)",
      }}
    >
      {/* Tabs */}
      <div
        className="flex items-center h-8 px-1 shrink-0 border-b gap-0.5"
        style={{ borderColor: "var(--border)" }}
        role="tablist"
        aria-label="Right panel tabs"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`tab-panel-${tab.id}`}
            id={`tab-${tab.id}`}
            onClick={() => onTabChange(tab.id)}
            className="relative h-full px-3 text-[12px] font-medium transition-colors duration-[120ms] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[var(--accent-ring)] cursor-pointer"
            style={{
              color:
                activeTab === tab.id
                  ? "var(--fg-primary)"
                  : "var(--fg-tertiary)",
            }}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span
                className="absolute bottom-0 left-0 right-0 h-px"
                style={{ background: "var(--accent)" }}
                aria-hidden="true"
              />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div
        className="flex-1 overflow-y-auto"
        role="tabpanel"
        id={`tab-panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
      >
        {activeTab === "sources" && (
          <SourcesTab
            sources={sources}
            loading={sourcesLoading}
            error={sourcesError}
            onDelete={onDeleteSource}
            onRename={onRenameSource}
            onSubmitText={onSubmitText}
            onUploadFiles={onUploadFiles}
            onRetry={onRetrySourceLoad}
            onPreview={onPreviewSource}
          />
        )}
        {activeTab === "chat" && <ChatTab messages={chatMessages} />}
        {activeTab === "revisions" && (
          <RevisionsTab
            snapshots={snapshots}
            loading={snapshotsLoading}
            viewingSnapshotId={viewingSnapshotId}
            onViewSnapshot={onViewSnapshot}
            onCompareSnapshots={onCompareSnapshots}
          />
        )}
      </div>
    </aside>
  );
}
