"use client";

import { useRef, useState } from "react";

import { Icons } from "@/components/icons";
import { IconButton } from "@/components/ui/icon-button";

/* ── Types ─────────────────────────────────────────────── */
type RightTab = "sources" | "chat" | "revisions";

export type SourceType = "FILE" | "AUDIO" | "TEXT";
export type SourceStatus = "UPLOADED" | "QUEUED" | "PROCESSING" | "PROCESSED" | "FAILED";

export interface SourceItem {
  id: string;
  label: string;
  sourceType: SourceType;
  status: SourceStatus;
  createdAt: string;
}

export interface RightPaneProps {
  activeTab: RightTab;
  onTabChange: (tab: RightTab) => void;
  /* sources tab */
  sources?: SourceItem[];
  sourcesLoading?: boolean;
  sourcesError?: string;
  onDeleteSource?: (id: string) => void;
  onRenameSource?: (id: string, label: string) => void;
  onSubmitText?: (text: string) => Promise<void>;
  onRetrySourceLoad?: () => void;
}

const TABS: { id: RightTab; label: string }[] = [
  { id: "sources",   label: "Sources"   },
  { id: "chat",      label: "Chat"      },
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

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 px-4 text-center">
      <div style={{ color: "var(--fg-disabled)" }}>{icon}</div>
      <p
        className="text-[11px] leading-[1.5] whitespace-pre-line"
        style={{ color: "var(--fg-muted)" }}
      >
        {message}
      </p>
    </div>
  );
}

/* ── Source status helpers ──────────────────────────────── */
const STATUS_DOT: Record<SourceStatus, string> = {
  PROCESSED:  "var(--success)",
  PROCESSING: "var(--warning)",
  QUEUED:     "var(--info)",
  UPLOADED:   "var(--fg-tertiary)",
  FAILED:     "var(--danger)",
};

const STATUS_LABEL: Record<SourceStatus, string> = {
  PROCESSED:  "Ready",
  PROCESSING: "Processing",
  QUEUED:     "Queued",
  UPLOADED:   "Uploaded",
  FAILED:     "Failed",
};

function relativeTime(dateStr: string): string {
  try {
    const diffMinutes = Math.round((new Date(dateStr).getTime() - Date.now()) / 60_000);
    return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(diffMinutes, "minute");
  } catch {
    return "";
  }
}

function sourceIcon(type: SourceType) {
  if (type === "AUDIO") return <Icons.MessageSquare size={13} aria-hidden="true" />;
  return <Icons.FileText size={13} aria-hidden="true" />;
}

/* ── SourceRow ──────────────────────────────────────────── */
interface SourceRowProps {
  item: SourceItem;
  onDelete?: (id: string) => void;
  onRename?: (id: string, label: string) => void;
}

function SourceRow({ item, onDelete, onRename }: SourceRowProps) {
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
    if (e.key === "Enter") { e.preventDefault(); commitEdit(); }
    if (e.key === "Escape") { setEditing(false); }
  }

  const relTime = relativeTime(item.createdAt);

  return (
    <div
      className="group flex items-center gap-2 px-3 py-2 transition-colors duration-[120ms] hover:bg-[var(--surface-3)]"
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
          className="text-[10px] truncate"
          style={{ color: "var(--fg-disabled)", fontFamily: "var(--font-mono)" }}
        >
          {relTime}
        </span>
      </div>

      {/* Status dot + label */}
      <div className="flex items-center gap-1 shrink-0">
        {confirming ? (
          <div className="flex items-center gap-1">
            <span className="text-[10px]" style={{ color: "var(--danger)" }}>
              Delete?
            </span>
            <button
              type="button"
              onClick={() => { onDelete?.(item.id); setConfirming(false); }}
              className="text-[10px] font-medium focus-visible:outline-none focus-visible:underline cursor-pointer"
              style={{ color: "var(--danger)" }}
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="text-[10px] focus-visible:outline-none focus-visible:underline cursor-pointer"
              style={{ color: "var(--fg-muted)" }}
            >
              No
            </button>
          </div>
        ) : (
          <>
            <span
              className="size-[6px] rounded-full shrink-0 opacity-70"
              style={{ background: STATUS_DOT[item.status] }}
              title={STATUS_LABEL[item.status]}
              aria-label={STATUS_LABEL[item.status]}
            />
            {onDelete && (
              <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-[120ms]">
                <IconButton
                  label={`Delete ${item.label}`}
                  onClick={() => setConfirming(true)}
                >
                  <Icons.X size={11} />
                </IconButton>
              </span>
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

/* ── TextPasteArea ──────────────────────────────────────── */
const TEXT_MAX = 500_000;

interface TextPasteAreaProps {
  onSubmit?: (text: string) => Promise<void>;
  onCancel: () => void;
}

function TextPasteArea({ onSubmit, onCancel }: TextPasteAreaProps) {
  const [value, setValue]       = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleSubmit() {
    if (!value.trim() || !onSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(value.trim());
      onCancel();
    } catch {
      setError("Failed to save. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const over = value.length > TEXT_MAX;

  return (
    <div
      className="mx-3 mb-3 rounded-[6px] border overflow-hidden"
      style={{ borderColor: "var(--border-strong)", background: "var(--surface-1)" }}
    >
      <label htmlFor="text-paste-input" className="sr-only">
        Paste text content
      </label>
      <textarea
        id="text-paste-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Paste client context, notes, or requirements…"
        rows={6}
        className="w-full bg-transparent text-[12px] leading-[1.6] resize-none p-2.5 focus-visible:outline-none"
        style={{ color: "var(--fg-primary)" }}
        autoComplete="off"
        spellCheck={false}
      />

      <div
        className="flex items-center justify-between px-2.5 py-2 border-t gap-2"
        style={{ borderColor: "var(--border)" }}
      >
        <span
          className="text-[10px]"
          style={{ color: over ? "var(--danger)" : "var(--fg-disabled)", fontFamily: "var(--font-mono)" }}
          aria-live="polite"
        >
          {value.length.toLocaleString()} / {TEXT_MAX.toLocaleString()}
        </span>

        {error && (
          <span className="text-[10px] flex-1" style={{ color: "var(--danger)" }} aria-live="polite">
            {error}
          </span>
        )}

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="h-[22px] px-2 rounded-[4px] text-[11px] transition-colors duration-[120ms] hover:bg-[var(--surface-3)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)] disabled:opacity-40 cursor-pointer"
            style={{ color: "var(--fg-tertiary)" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!value.trim() || over || submitting || !onSubmit}
            className="h-[22px] px-2 rounded-[4px] text-[11px] font-medium transition-colors duration-[120ms] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            {submitting ? "Saving…" : "Add source"}
          </button>
        </div>
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
  onRetry?: () => void;
}

function SourcesTab({ sources, loading, error, onDelete, onRename, onSubmitText, onRetry }: SourcesTabProps) {
  const [pasteOpen, setPasteOpen] = useState(false);

  return (
    <>
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
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && (!sources || sources.length === 0) && (
        <EmptyState
          icon={<Icons.FileText size={20} />}
          message={"No sources added yet.\nPaste text below to get started."}
        />
      )}

      {/* Text paste area or Add button */}
      <div className="px-3 pb-3 mt-1">
        {pasteOpen ? (
          <TextPasteArea
            onSubmit={onSubmitText}
            onCancel={() => setPasteOpen(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setPasteOpen(true)}
            className="flex items-center gap-1.5 h-[26px] px-2 rounded-[5px] text-[11px] border transition-colors duration-[120ms] hover:bg-[var(--surface-3)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)] cursor-pointer w-full"
            style={{
              color: "var(--fg-tertiary)",
              borderColor: "var(--border)",
              background: "transparent",
            }}
          >
            <Icons.Plus size={12} aria-hidden="true" />
            <span>Add text source</span>
          </button>
        )}
      </div>
    </>
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

/* ── RevisionsTab ───────────────────────────────────────── */
function RevisionsTab() {
  return (
    <>
      <SectionLabel>Revision history</SectionLabel>
      <EmptyState
        icon={<Icons.History size={20} />}
        message={"No revisions yet.\nRevisions appear after the first generation."}
      />
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
  onRetrySourceLoad,
}: RightPaneProps) {
  return (
    <aside
      className="flex flex-col h-full overflow-hidden border-l"
      style={{
        width: 268,
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
              color: activeTab === tab.id ? "var(--fg-primary)" : "var(--fg-tertiary)",
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
            onRetry={onRetrySourceLoad}
          />
        )}
        {activeTab === "chat" && <ChatTab />}
        {activeTab === "revisions" && <RevisionsTab />}
      </div>
    </aside>
  );
}
