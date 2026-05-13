"use client";

import { useRef, useState } from "react";

import { Icons } from "@/components/icons";
import { IconButton } from "@/components/ui/icon-button";
import { Pill } from "@/components/ui/pill";
import { Tag } from "@/components/ui/tag";

/* ── Types ─────────────────────────────────────────────── */
export type AppState =
  | "no-session"
  | "no-sources"
  | "generating"
  | "revising"
  | "failed"
  | "ready";

type Tone = "success" | "info" | "warning" | "danger" | "neutral";

type LineType =
  | "h1"
  | "h2"
  | "meta"
  | "req-header"
  | "req-title"
  | "body"
  | "blank";

interface EvidenceRef {
  sourceId: string;
  ref: string;
  quote: string;
  sourceName: string;
}

export interface DocLineData {
  lineNum: number;
  type: LineType;
  text?: string;
  reqId?: string;
  reqType?: "claim" | "question";
  status?: string;
  tags?: string[];
  evidence?: EvidenceRef[];
  small?: boolean;
  /** True while this line is actively being typed by the model. Renders a blinking cursor. */
  streaming?: boolean;
}

const STATUS_TONE: Record<string, Tone> = {
  approved: "success",
  "in-review": "info",
  draft: "neutral",
  conflict: "danger",
  stale: "warning",
};

const STATUS_LABEL: Record<string, string> = {
  approved: "Approved",
  "in-review": "In review",
  draft: "Draft",
  conflict: "Conflict",
  stale: "Stale",
};

/* ── EvidenceBit ────────────────────────────────────────── */
function EvidenceBit({
  ev,
  onOpenSource,
}: {
  ev: EvidenceRef;
  onOpenSource?: (sourceId: string) => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <span
      className="relative inline-flex items-center gap-1 ml-1.5 px-1.5 h-[18px] rounded-[3px] border select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)]"
      tabIndex={0}
      role="button"
      aria-label={`Evidence from ${ev.sourceName} — click to open source`}
      style={{
        background: "var(--surface-3)",
        borderColor: "var(--border-strong)",
        color: "var(--fg-tertiary)",
        fontSize: 10,
        fontFamily: "var(--font-mono)",
        cursor: onOpenSource ? "pointer" : "default",
      }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
      onClick={() => onOpenSource?.(ev.sourceId)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenSource?.(ev.sourceId);
        }
      }}
    >
      <Icons.FileText size={9} aria-hidden="true" />
      <span>{ev.ref}</span>

      {show && (
        <span
          className="absolute bottom-full left-0 mb-1.5 z-50 rounded-[6px] border p-2.5 min-w-[200px] max-w-[300px]"
          role="tooltip"
          style={{
            background: "var(--surface-3)",
            borderColor: "var(--border-strong)",
            boxShadow: "var(--shadow-md-val)",
          }}
        >
          <span
            className="block text-[10px] font-medium mb-1"
            style={{
              color: "var(--fg-secondary)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {ev.sourceName}
          </span>
          <span
            className="block text-[11px] leading-[1.5] italic"
            style={{ color: "var(--fg-tertiary)" }}
          >
            {ev.quote}
          </span>
          {onOpenSource && (
            <span
              className="block text-[10px] mt-1.5"
              style={{ color: "var(--accent)" }}
            >
              Click to open source
            </span>
          )}
        </span>
      )}
    </span>
  );
}

/* ── DocLine ────────────────────────────────────────────── */
function DocLine({
  line,
  selectedReq,
  onSelectReq,
  onUpdateLine,
  onOpenSource,
}: {
  line: DocLineData;
  selectedReq: string | null;
  onSelectReq: (id: string) => void;
  onUpdateLine?: (reqId: string, reqType: "claim" | "question", newText: string) => Promise<void>;
  onOpenSource?: (sourceId: string) => void;
}) {
  const isReq = !!line.reqId && !!line.reqType;
  const isActive = isReq && line.reqId === selectedReq;
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(line.text ?? "");
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const heights: Partial<Record<LineType, string>> = {
    h1: "min-h-[32px] py-1",
    h2: "min-h-[28px] py-0.5",
    body: "min-h-[22px] py-0.5",
    blank: line.small ? "h-[8px]" : "h-[16px]",
  };
  const heightCls = heights[line.type] ?? "min-h-[21px]";

  function startEdit() {
    if (!isReq || !onUpdateLine) return;
    setEditVal(line.text ?? "");
    setEditing(true);
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.select();
    }, 0);
  }

  async function commitEdit() {
    const trimmed = editVal.trim();
    if (!trimmed || !line.reqId || !line.reqType || !onUpdateLine) {
      setEditing(false);
      return;
    }
    if (trimmed === line.text) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onUpdateLine(line.reqId, line.reqType, trimmed);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  function handleEditKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Escape") { setEditing(false); return; }
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      void commitEdit();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (isReq && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onSelectReq(line.reqId!);
    }
  }

  return (
    <div
      className={`flex items-start w-full transition-colors duration-[80ms] group ${isReq && !editing ? "cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[var(--accent-ring)]" : ""}`}
      style={{ background: isActive && !editing ? "var(--accent-subtle)" : undefined }}
      role={isReq && !editing ? "button" : undefined}
      tabIndex={isReq && !editing ? 0 : undefined}
      aria-pressed={isReq && !editing ? isActive : undefined}
      onClick={isReq && !editing ? () => onSelectReq(line.reqId!) : undefined}
      onDoubleClick={isReq && !editing && onUpdateLine ? startEdit : undefined}
      onKeyDown={isReq && !editing ? handleKeyDown : undefined}
    >
      {/* Gutter */}
      <div
        className={`shrink-0 flex items-start justify-end pr-3 pt-[3px] w-[52px] ${heightCls}`}
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--fg-muted)",
          userSelect: "none",
        }}
        aria-hidden="true"
      >
        {line.type !== "blank" ? line.lineNum : ""}
      </div>

      {/* Content */}
      <div
        className={`flex items-center gap-2 flex-1 pr-6 ${editing ? "py-1" : heightCls}`}
        style={{ minWidth: 0 }}
      >
        {line.type === "h1" && (
          <span
            className="text-[21px] font-semibold tracking-[-0.02em] leading-tight"
            style={{ color: "var(--fg-primary)", textWrap: "balance" } as React.CSSProperties}
          >
            {line.text}
          </span>
        )}
        {line.type === "h2" && (
          <span
            className="text-[13px] font-semibold uppercase tracking-[0.06em]"
            style={{ color: "var(--fg-tertiary)" }}
          >
            {line.text}
          </span>
        )}
        {line.type === "meta" && (
          <span
            className="text-[11px]"
            style={{ fontFamily: "var(--font-mono)", color: "var(--fg-muted)" }}
          >
            {line.text}
          </span>
        )}
        {line.type === "req-title" && (
          <span
            className="text-[14px] font-medium"
            style={{ color: "var(--fg-primary)" }}
          >
            {line.text}
          </span>
        )}
        {line.type === "req-header" && (
          <div className="flex items-center gap-2 w-full">
            <span
              className="text-[11px] font-medium"
              style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}
            >
              {line.reqId}
            </span>
            {line.status && (
              <Pill tone={STATUS_TONE[line.status] ?? "neutral"}>
                {STATUS_LABEL[line.status] ?? line.status}
              </Pill>
            )}
            <span className="flex-1" />
            {line.tags?.slice(0, 2).map((t) => (
              <Tag key={t}>{t}</Tag>
            ))}
          </div>
        )}
        {line.type === "body" && !editing && (
          <span
            className="text-[14px] leading-[1.65] w-full"
            style={{ color: line.small ? "var(--fg-muted)" : "var(--fg-secondary)", fontSize: line.small ? 12 : undefined }}
            title={isReq && onUpdateLine ? "Double-click to edit" : undefined}
          >
            {line.text}
            {line.streaming && (
              <span
                className="inline-block w-[1.5px] h-[13px] rounded-[1px] ml-[1px] align-middle animate-pulse"
                aria-hidden="true"
                style={{ background: "var(--fg-tertiary)", verticalAlign: "middle" }}
              />
            )}
            {!line.streaming && line.evidence?.map((ev, i) => (
              <EvidenceBit key={i} ev={ev} onOpenSource={onOpenSource} />
            ))}
            {isReq && !line.streaming && onUpdateLine && (
              <button
                type="button"
                aria-label="Edit"
                onClick={(e) => { e.stopPropagation(); startEdit(); }}
                className="ml-2 opacity-0 group-hover:opacity-60 hover:!opacity-100 inline-flex items-center justify-center size-[16px] rounded-[3px] transition-opacity duration-[100ms] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)] cursor-pointer"
                style={{ color: "var(--fg-muted)", verticalAlign: "middle" }}
              >
                <Icons.Pencil size={10} />
              </button>
            )}
          </span>
        )}
        {line.type === "body" && editing && (
          <div className="flex flex-col gap-1.5 w-full py-1" onClick={(e) => e.stopPropagation()}>
            <textarea
              ref={textareaRef}
              value={editVal}
              onChange={(e) => setEditVal(e.target.value)}
              onKeyDown={handleEditKeyDown}
              rows={Math.max(2, Math.ceil(editVal.length / 80))}
              className="w-full text-[13px] leading-[1.65] rounded-[5px] border px-2.5 py-1.5 resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)]"
              style={{
                color: "var(--fg-primary)",
                background: "var(--surface-2)",
                borderColor: "var(--accent)",
              }}
              disabled={saving}
              autoComplete="off"
              spellCheck
            />
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => void commitEdit()}
                disabled={saving || !editVal.trim()}
                className="inline-flex items-center gap-1 h-[22px] px-2 rounded-[4px] text-[11px] font-medium transition-colors duration-[100ms] disabled:opacity-40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)] cursor-pointer"
                style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
              >
                {saving ? <Icons.Download size={10} className="animate-spin" /> : <Icons.Check size={10} />}
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                disabled={saving}
                className="inline-flex items-center gap-1 h-[22px] px-2 rounded-[4px] text-[11px] transition-colors duration-[100ms] hover:bg-[var(--surface-3)] disabled:opacity-40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)] cursor-pointer"
                style={{ color: "var(--fg-muted)" }}
              >
                Cancel
              </button>
              <span
                className="text-[10px] ml-auto"
                style={{ color: "var(--fg-disabled)", fontFamily: "var(--font-mono)" }}
              >
                ⌘↵ save · Esc cancel
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Empty states ───────────────────────────────────────── */
function EmptyDoc({
  state,
  onAddSources,
  generationError,
  onRetry,
}: {
  state: AppState;
  onAddSources?: () => void;
  generationError?: string | null;
  onRetry?: () => void;
}) {
  if (state === "no-session") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 h-full py-20 text-center px-8">
        <Icons.FileText
          size={28}
          aria-hidden="true"
          className="text-[var(--fg-disabled)]"
        />
        <div>
          <p
            className="text-[15px] font-medium mb-1"
            style={{ color: "var(--fg-secondary)" }}
          >
            No project selected
          </p>
          <p
            className="text-[13px] leading-[1.65]"
            style={{ color: "var(--fg-muted)" }}
          >
            Open a project from the sidebar to get started.
          </p>
        </div>
      </div>
    );
  }

  if (state === "no-sources") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 h-full py-20 text-center px-8">
        <Icons.Upload
          size={28}
          aria-hidden="true"
          className="text-[var(--fg-disabled)]"
        />
        <div>
          <p
            className="text-[15px] font-medium mb-1"
            style={{ color: "var(--fg-secondary)" }}
          >
            No sources yet
          </p>
          <p
            className="text-[13px] leading-[1.65] mb-4"
            style={{ color: "var(--fg-muted)" }}
          >
            Add PDFs, transcripts, or paste text in the Sources panel to begin.
          </p>
          {onAddSources && (
            <button
              type="button"
              onClick={onAddSources}
              className="inline-flex items-center gap-1.5 h-[28px] px-3 rounded-[5px] text-[12px] font-medium border transition-colors duration-[120ms] hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] cursor-pointer"
              style={{
                color: "var(--fg-secondary)",
                borderColor: "var(--border-strong)",
              }}
            >
              <Icons.PanelRight size={12} aria-hidden="true" />
              <span>Open Sources</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  if (state === "revising" || state === "generating") {
    const isRevising = state === "revising";
    return (
      <div
        className="flex flex-col h-full py-6 px-[52px] pr-6"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="flex items-center gap-2 mb-6">
          <span
            className="size-[8px] rounded-full animate-pulse shrink-0"
            style={{ background: isRevising ? "var(--accent)" : "var(--warning)" }}
            aria-hidden="true"
          />
          <span className="text-[13px]" style={{ color: "var(--fg-tertiary)" }}>
            {isRevising ? "Revising brief…" : "Generating brief…"}
          </span>
        </div>
        {[80, 60, 90, 50, 70].map((w, i) => (
          <div key={i} className="flex items-center gap-3 mb-3">
            <div
              className="h-[14px] rounded-[3px] animate-pulse"
              style={{ width: `${w}%`, background: "var(--surface-3)" }}
            />
          </div>
        ))}
      </div>
    );
  }

  if (state === "failed") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 h-full py-20 text-center px-8">
        <div
          className="size-7 rounded-full flex items-center justify-center"
          style={{
            background: "color-mix(in srgb, var(--danger) 12%, transparent)",
          }}
          aria-hidden="true"
        >
          <Icons.X size={14} style={{ color: "var(--danger)" }} />
        </div>
        <div>
          <p
            className="text-[15px] font-medium mb-1"
            style={{ color: "var(--fg-secondary)" }}
          >
            Generation failed
          </p>
          <p
            className="text-[13px] leading-[1.65] mb-3"
            style={{ color: "var(--fg-muted)" }}
          >
            {generationError ?? "The pipeline could not complete. Check sources and try again."}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-[12px] font-medium transition-opacity hover:opacity-80"
              style={{ background: "var(--surface-2)", color: "var(--fg-secondary)", border: "1px solid var(--border)" }}
            >
              <Icons.Refresh size={11} aria-hidden="true" />
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
}

/* ── ChatBar ────────────────────────────────────────────── */
interface ChatBarProps {
  onAttachFiles?: (files: File[]) => Promise<void>;
  selectedReqText?: string | null;
  onClearSelection?: () => void;
  onSendMessage?: (msg: string, selectionText?: string) => Promise<void>;
  revising?: boolean;
}

function ChatBar({
  onAttachFiles,
  selectedReqText,
  onClearSelection,
  onSendMessage,
  revising,
}: ChatBarProps) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSend() {
    const trimmed = value.trim();
    if (!trimmed || sending || revising || !onSendMessage) return;
    setSending(true);
    try {
      await onSendMessage(trimmed, selectedReqText ?? undefined);
      setValue("");
    } finally {
      setSending(false);
    }
  }

  function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = "";
    if (picked.length > 0 && onAttachFiles) {
      void onAttachFiles(picked);
    }
  }

  const isDisabled = sending || revising || !onSendMessage;

  return (
    <div
      className="shrink-0 border-t px-3 py-2.5"
      style={{ borderColor: "var(--border)", background: "var(--background)" }}
    >
      {/* Context pill */}
      {selectedReqText && (
        <div
          className="flex items-center gap-1.5 px-4 pt-2 pb-0"
        >
          <span
            className="flex items-center gap-1 h-[20px] px-2 rounded-[4px] border text-[11px] max-w-[calc(100%-28px)] min-w-0"
            style={{
              background: "color-mix(in srgb, var(--accent) 10%, transparent)",
              borderColor: "color-mix(in srgb, var(--accent) 35%, transparent)",
              color: "var(--accent)",
            }}
          >
            <Icons.MessageSquare size={9} aria-hidden="true" className="shrink-0" />
            <span className="truncate">
              Re: {selectedReqText.length > 60 ? `${selectedReqText.slice(0, 60)}…` : selectedReqText}
            </span>
          </span>
          <button
            type="button"
            aria-label="Clear selection context"
            onClick={onClearSelection}
            className="shrink-0 inline-flex items-center justify-center size-[20px] rounded-[3px] transition-colors duration-[100ms] hover:bg-[var(--surface-3)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)] cursor-pointer"
            style={{ color: "var(--fg-muted)" }}
          >
            <Icons.X size={10} />
          </button>
        </div>
      )}

      <div className="flex items-center gap-2.5 h-[52px] px-4">
        <Icons.MessageSquare
          size={14}
          aria-hidden="true"
          className="shrink-0 text-[var(--fg-muted)]"
        />
        <label htmlFor="doc-chat-input" className="sr-only">
          Chat input
        </label>
        <input
          id="doc-chat-input"
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void handleSend();
            }
          }}
          placeholder={
            revising
              ? "Revising brief…"
              : onSendMessage
                ? "Ask about requirements, request changes…"
                : "Generate a brief first to start chatting"
          }
          disabled={isDisabled}
          className="flex-1 bg-transparent text-[13px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)] rounded-[3px] disabled:opacity-50"
          style={{ color: "var(--fg-primary)" }}
          autoComplete="off"
          spellCheck={false}
        />
        <IconButton
          label="Attach source"
          onClick={() => fileInputRef.current?.click()}
          disabled={!onAttachFiles}
        >
          <Icons.Upload size={14} />
        </IconButton>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,application/pdf,audio/*"
          className="hidden"
          onChange={handleFilePick}
        />
        <IconButton
          label="Send message"
          onClick={() => void handleSend()}
          disabled={isDisabled || !value.trim()}
        >
          {sending || revising ? (
            <Icons.Download size={14} className="animate-spin" />
          ) : (
            <Icons.Send size={14} />
          )}
        </IconButton>
      </div>
    </div>
  );
}

/* ── DocView ────────────────────────────────────────────── */
export interface DocViewProps {
  appState?: AppState;
  projectName?: string | null;
  sessionName?: string | null;
  selectedReq: string | null;
  onSelectReq: (id: string) => void;
  onAddSources?: () => void;
  onGenerateBrief?: () => void;
  generating?: boolean;
  hasSnapshot?: boolean;
  generationError?: string | null;
  onRetry?: () => void;
  streamingLines?: DocLineData[] | null;
  onAttachFiles?: (files: File[]) => Promise<void>;
  onOpenSource?: (sourceId: string) => void;
  lines?: DocLineData[];
  selectedReqText?: string | null;
  onClearSelection?: () => void;
  onSendMessage?: (msg: string, selectionText?: string) => Promise<void>;
  revising?: boolean;
  onUpdateLine?: (reqId: string, reqType: "claim" | "question", newText: string) => Promise<void>;
  viewingVersion?: number | null;
  onExitVersionView?: () => void;
}

export function DocView({
  appState = "no-session",
  projectName,
  sessionName,
  selectedReq,
  onSelectReq,
  onAddSources,
  onGenerateBrief,
  generating = false,
  hasSnapshot = false,
  generationError = null,
  onRetry,
  streamingLines = null,
  onAttachFiles,
  onOpenSource,
  lines = [],
  selectedReqText,
  onClearSelection,
  onSendMessage,
  revising = false,
  onUpdateLine,
  viewingVersion = null,
  onExitVersionView,
}: DocViewProps) {
  const canGenerate = appState === "ready" || appState === "no-sources";
  const generateDisabled =
    appState === "no-sources" ||
    appState === "no-session" ||
    appState === "generating" ||
    appState === "revising" ||
    generating ||
    revising ||
    !onGenerateBrief;

  return (
    <div
      className="flex flex-col flex-1 overflow-hidden h-full"
      style={{ background: "var(--background)" }}
    >
      {/* Topbar */}
      <div
        className="flex items-center h-8 px-4 gap-3 shrink-0 border-b"
        style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
      >
        {/* Breadcrumbs */}
        <div
          className="flex items-center gap-1 text-[12px] flex-1 min-w-0"
          style={{ color: "var(--fg-tertiary)" }}
        >
          {projectName && (
            <>
              <span className="truncate shrink-0 max-w-[180px] font-medium" style={{ color: "var(--fg-secondary)" }}>
                {projectName}
              </span>
              <Icons.ChevronRight size={11} aria-hidden="true" className="shrink-0 opacity-40" />
            </>
          )}
          <span className="truncate" style={{ color: projectName ? "var(--fg-tertiary)" : "var(--fg-secondary)" }}>
            {sessionName ?? "—"}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            className="flex items-center gap-1 h-[22px] px-2 rounded-[4px] text-[11px] transition-colors duration-[120ms] hover:bg-[var(--surface-3)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)] cursor-pointer"
            style={{ color: "var(--fg-tertiary)" }}
          >
            <Icons.Filter size={11} aria-hidden="true" />
            <span>Filter</span>
          </button>
          <button
            type="button"
            disabled={generateDisabled}
            title={
              generating
                ? "Generation in progress"
                : generateDisabled
                  ? "Add sources first"
                  : undefined
            }
            onClick={onGenerateBrief}
            className="flex items-center gap-1 h-[22px] px-2 rounded-[4px] text-[11px] font-medium transition-colors duration-[120ms] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            style={
              canGenerate && !generateDisabled
                ? { background: "var(--accent)", color: "var(--accent-fg)" }
                : { background: "var(--surface-3)", color: "var(--fg-muted)" }
            }
          >
            {hasSnapshot && !generating ? (
              <Icons.Refresh size={11} aria-hidden="true" />
            ) : (
              <Icons.Download size={11} aria-hidden="true" className={generating ? "animate-spin" : undefined} />
            )}
            <span>{generating ? "Generating..." : hasSnapshot ? "Regenerate" : "Generate Brief"}</span>
          </button>
        </div>
      </div>

      {/* Past-version banner */}
      {viewingVersion !== null && (
        <div
          className="flex items-center justify-between px-4 h-8 shrink-0 border-b text-[11px]"
          style={{
            background: "color-mix(in srgb, var(--warning) 10%, transparent)",
            borderColor: "color-mix(in srgb, var(--warning) 30%, transparent)",
            color: "var(--fg-secondary)",
          }}
          role="status"
          aria-live="polite"
        >
          <span>
            Viewing <span className="font-mono font-medium">v{viewingVersion}</span> — this is a past version
          </span>
          <button
            type="button"
            onClick={onExitVersionView}
            className="text-[11px] underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)] cursor-pointer"
            style={{ color: "var(--accent)" }}
          >
            Return to latest
          </button>
        </div>
      )}

      {/* Doc scroll */}
      <div className="flex-1 overflow-y-auto py-4">
        {streamingLines && streamingLines.length > 0 ? (
          streamingLines.map((line, i) => (
            <DocLine
              key={i}
              line={line}
              selectedReq={null}
              onSelectReq={() => undefined}
            />
          ))
        ) : (appState === "generating" || appState === "revising") ? (
          <EmptyDoc state={appState} onAddSources={onAddSources} generationError={generationError} onRetry={onRetry} />
        ) : appState !== "ready" ? (
          <EmptyDoc state={appState} onAddSources={onAddSources} generationError={generationError} onRetry={onRetry} />
        ) : lines.length === 0 ? (
          <EmptyDoc state="no-sources" onAddSources={onAddSources} />
        ) : (
          lines.map((line, i) => (
            <DocLine
              key={i}
              line={line}
              selectedReq={selectedReq}
              onSelectReq={onSelectReq}
              onUpdateLine={onUpdateLine}
              onOpenSource={onOpenSource}
            />
          ))
        )}
      </div>

      {/* Chat bar */}
      <ChatBar
        onAttachFiles={onAttachFiles}
        selectedReqText={selectedReqText}
        onClearSelection={onClearSelection}
        onSendMessage={onSendMessage}
        revising={revising}
      />
    </div>
  );
}
