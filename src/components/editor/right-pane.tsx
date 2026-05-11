"use client";

import { useRef, useState } from "react";

import { Icons } from "@/components/icons";
import { IconButton } from "@/components/ui/icon-button";

import { AddTextDialog } from "./add-text-dialog";
import { SourcePreviewModal } from "./source-preview-modal";

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
  /* revisions tab */
  snapshots?: SnapshotListItem[];
  snapshotsLoading?: boolean;
  viewingSnapshotId?: string | null;
  onViewSnapshot?: (id: string | null) => void;
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
        style={{ color: "var(--fg-muted)", textWrap: "pretty" } as React.CSSProperties}
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

function relativeTime(dateStr: string): string {
  try {
    const diffMinutes = Math.round(
      (new Date(dateStr).getTime() - Date.now()) / 60_000,
    );
    return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
      diffMinutes,
      "minute",
    );
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
  const [editing, setEditing]     = useState(false);
  const [editVal, setEditVal]     = useState(item.label);
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
              onClick={() => { onDelete?.(item.id); setConfirming(false); }}
              className="inline-flex items-center justify-center size-[22px] rounded-[4px] transition-[transform,background-color] duration-[120ms] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)] cursor-pointer"
              style={{
                background: "color-mix(in srgb, var(--danger) 15%, transparent)",
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
                onPreview ?? onDelete
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
}: SourcesTabProps) {
  const [pasteOpen, setPasteOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<SourceItem | null>(null);
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
              onPreview={setPreviewItem}
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
      <div className="px-3 pb-3 pt-2 mt-auto border-t" style={{ borderColor: "var(--border)" }}>
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

      {previewItem && (
        <SourcePreviewModal
          item={previewItem}
          onClose={() => setPreviewItem(null)}
        />
      )}
    </div>
  );
}

/* ── ChatTab ────────────────────────────────────────────── */
function ChatTab() {
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

/* ── Status chip for snapshot ───────────────────────────── */
const SNAPSHOT_STATUS_COLOR: Record<string, string> = {
  DRAFT: "var(--fg-disabled)",
  SHARED: "var(--info)",
  CONFIRMED: "var(--success)",
  SUPERSEDED: "var(--fg-disabled)",
};

function relativeTimeSnapshot(date: Date | string): string {
  try {
    const diffMinutes = Math.round(
      (new Date(date).getTime() - Date.now()) / 60_000,
    );
    if (Math.abs(diffMinutes) >= 60 * 24) {
      const days = Math.round(diffMinutes / (60 * 24));
      return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(days, "day");
    }
    if (Math.abs(diffMinutes) >= 60) {
      const hours = Math.round(diffMinutes / 60);
      return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(hours, "hour");
    }
    return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(diffMinutes, "minute");
  } catch {
    return "";
  }
}

/* ── RevisionsTab ───────────────────────────────────────── */
interface RevisionsTabProps {
  snapshots?: SnapshotListItem[];
  loading?: boolean;
  viewingSnapshotId?: string | null;
  onViewSnapshot?: (id: string | null) => void;
}

function RevisionsTab({ snapshots, loading, viewingSnapshotId, onViewSnapshot }: RevisionsTabProps) {
  const isViewingPast = Boolean(viewingSnapshotId);

  return (
    <>
      <SectionLabel>Revision history</SectionLabel>

      {isViewingPast && (
        <div className="mx-3 mb-2">
          <button
            type="button"
            onClick={() => onViewSnapshot?.(null)}
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

      {loading && (
        <div aria-label="Loading revisions…">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-2.5 px-3 py-2" aria-hidden="true">
              <div className="flex flex-col items-center w-3.5 shrink-0 pt-[5px]">
                <div className="size-[7px] rounded-full animate-pulse" style={{ background: "var(--surface-3)" }} />
              </div>
              <div className="flex flex-col flex-1 gap-1.5">
                <div className="h-[10px] w-1/2 rounded-[3px] animate-pulse" style={{ background: "var(--surface-3)" }} />
                <div className="h-[8px] w-3/4 rounded-[3px] animate-pulse" style={{ background: "var(--surface-3)" }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && (!snapshots || snapshots.length === 0) && (
        <EmptyState
          icon={<Icons.History size={20} />}
          message="No revisions yet.\nRevisions appear after the first generation."
        />
      )}

      {!loading && snapshots && snapshots.length > 0 && (
        <div className="px-3 py-1" role="list" aria-label="Revision history">
          {snapshots.map((snap, idx) => {
            const isCurrent = snap.id === viewingSnapshotId;
            const isLatest = idx === 0;
            const dotColor = isCurrent
              ? "var(--accent)"
              : SNAPSHOT_STATUS_COLOR[snap.status] ?? "var(--fg-disabled)";

            return (
              <div key={snap.id} className="flex gap-2.5 py-1.5" role="listitem">
                {/* Timeline column */}
                <div className="flex flex-col items-center w-3.5 shrink-0 pt-[5px]">
                  <div
                    className="shrink-0 rounded-full transition-[width,height,box-shadow] duration-[150ms]"
                    style={{
                      width: isCurrent ? 8 : 7,
                      height: isCurrent ? 8 : 7,
                      background: dotColor,
                      boxShadow: isCurrent
                        ? `0 0 0 3px color-mix(in srgb, var(--accent) 20%, transparent)`
                        : "none",
                    }}
                  />
                  {idx < snapshots.length - 1 && (
                    <div
                      className="w-px flex-1 mt-1"
                      style={{ background: "var(--border)" }}
                    />
                  )}
                </div>

                {/* Info column */}
                <button
                  type="button"
                  onClick={() => onViewSnapshot?.(isCurrent ? null : snap.id)}
                  className="flex-1 min-w-0 text-left pb-1.5 rounded-[4px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)] cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span
                      className="text-[11px] font-medium font-mono tabular-nums"
                      style={{ color: isCurrent ? "var(--accent)" : "var(--fg-secondary)" }}
                    >
                      v{snap.version}
                    </span>
                    {isLatest && (
                      <span
                        className="text-[9px] font-semibold uppercase tracking-[0.06em] px-1 py-px rounded-[3px]"
                        style={{
                          background: "color-mix(in srgb, var(--accent) 15%, transparent)",
                          color: "var(--accent)",
                        }}
                      >
                        latest
                      </span>
                    )}
                  </div>
                  <div
                    className="text-[10px] font-mono tabular-nums"
                    style={{ color: "var(--fg-disabled)" }}
                  >
                    {relativeTimeSnapshot(snap.createdAt)}
                  </div>
                  <div
                    className="text-[10px] capitalize mt-0.5"
                    style={{ color: dotColor }}
                  >
                    {snap.status.toLowerCase()}
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      )}
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
  snapshots,
  snapshotsLoading,
  viewingSnapshotId,
  onViewSnapshot,
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
          />
        )}
        {activeTab === "chat" && <ChatTab />}
        {activeTab === "revisions" && (
          <RevisionsTab
            snapshots={snapshots}
            loading={snapshotsLoading}
            viewingSnapshotId={viewingSnapshotId}
            onViewSnapshot={onViewSnapshot}
          />
        )}
      </div>
    </aside>
  );
}
