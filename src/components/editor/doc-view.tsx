"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

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
  /** DB section key for claim lines (e.g. "SUMMARY", "GOALS") */
  section?: string;
  /** DB orderIndex for claim lines — used for inserting new claims */
  orderIndex?: number;
  status?: string;
  tags?: string[];
  evidence?: EvidenceRef[];
  small?: boolean;
  /** True while this line is actively being typed by the model. Renders a blinking cursor. */
  streaming?: boolean;
}

export interface WorkspaceComparisonTab {
  id: string;
  title: string;
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
  onInsertLineAfter,
  autoFocus,
  onAutoFocusConsumed,
  onOpenSource,
  isEditing,
  onStartEdit,
  onStopEdit,
  isFirst,
}: {
  line: DocLineData;
  selectedReq: string | null;
  onSelectReq: (id: string) => void;
  onUpdateLine?: (
    reqId: string,
    reqType: "claim" | "question",
    newText: string,
  ) => Promise<void>;
  onInsertLineAfter?: (section: string, orderIndex: number) => Promise<void>;
  autoFocus?: boolean;
  onAutoFocusConsumed?: () => void;
  onOpenSource?: (sourceId: string) => void;
  /** Controlled: true when this specific row is the active editor (singleton). */
  isEditing: boolean;
  /** Ask DocView to make this row the active editor, closing any other open editor. */
  onStartEdit: () => void;
  /** Ask DocView to close the active editor. */
  onStopEdit: () => void;
  /** True for the very first rendered row — gives version meta a header treatment. */
  isFirst?: boolean;
}) {
  const isReq = !!line.reqId && !!line.reqType;
  const isActive = isReq && line.reqId === selectedReq;
  // `isEditing` is now a controlled prop from DocView — only one row across
  // the entire document can have isEditing=true at once (singleton invariant).
  const editing = isEditing;
  const [editVal, setEditVal] = useState(line.text ?? "");
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Guard: prevents the gutter + button from firing more than once per click
  // (double-click would otherwise call onInsertLineAfter twice).
  const insertingRef = useRef(false);

  const heights: Partial<Record<LineType, string>> = {
    h1: "min-h-[32px] py-1",
    h2: "min-h-[28px] py-0.5",
    body: "min-h-[22px] py-0.5",
    blank: line.small ? "h-[8px]" : "h-[16px]",
  };
  const heightCls = heights[line.type] ?? "min-h-[21px]";

  // Auto-enter edit mode when this line is the newly inserted one.
  // Uses onStartEdit so that any already-open editor is closed first.
  useEffect(() => {
    if (autoFocus && isReq && onUpdateLine) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditVal(line.text ?? "");
      onStartEdit();
      onAutoFocusConsumed?.();
      setTimeout(() => {
        textareaRef.current?.focus();
        const len = textareaRef.current?.value.length ?? 0;
        textareaRef.current?.setSelectionRange(len, len);
      }, 0);
    }
    // Only fire when autoFocus flips to true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus]);

  function startEdit() {
    if (!isReq || !onUpdateLine || insertingRef.current) return;
    setEditVal(line.text ?? "");
    // Calling onStartEdit sets activeEditReqId in DocView, which closes any
    // currently open editor and opens this one — the singleton invariant.
    onStartEdit();
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.select();
    }, 0);
  }

  async function commitEdit() {
    const trimmed = editVal.trim();
    if (!trimmed || !line.reqId || !line.reqType || !onUpdateLine) {
      onStopEdit();
      return;
    }
    if (trimmed === line.text) {
      onStopEdit();
      return;
    }
    setSaving(true);
    try {
      await onUpdateLine(line.reqId, line.reqType, trimmed);
      onStopEdit();
    } finally {
      setSaving(false);
    }
  }

  function handleEditKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Escape") {
      onStopEdit();
      return;
    }
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && !e.altKey) {
      e.preventDefault();
      void commitEdit();
      return;
    }
    // Alt+Enter (⌥↵): save current text, then insert a blank new claim below.
    // Decoupled from commitEdit() to avoid state-change race conditions.
    if (
      e.key === "Enter" &&
      e.altKey &&
      !e.ctrlKey &&
      !e.metaKey &&
      line.reqType === "claim" &&
      line.section != null &&
      line.orderIndex != null &&
      onInsertLineAfter
    ) {
      e.preventDefault();
      const section = line.section;
      const orderIndex = line.orderIndex;
      void (async () => {
        const trimmed = editVal.trim();
        const needsSave =
          !!trimmed &&
          !!line.reqId &&
          !!line.reqType &&
          !!onUpdateLine &&
          trimmed !== line.text;
        if (needsSave) {
          setSaving(true);
          try {
            await onUpdateLine(line.reqId!, line.reqType!, trimmed);
          } finally {
            setSaving(false);
          }
        }
        onStopEdit();
        await onInsertLineAfter(section, orderIndex);
      })();
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
      className={`flex items-start w-full transition-colors duration-[80ms] group ${isReq && !editing ? "cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[var(--accent-ring)]" : ""} ${isFirst ? "pb-3 mb-1 border-b" : ""}`}
      style={{
        background: isActive && !editing ? "var(--accent-subtle)" : undefined,
        borderColor: isFirst ? "var(--border)" : undefined,
      }}
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
        {isReq && line.reqType === "claim" && !editing && onInsertLineAfter &&
          line.section != null && line.orderIndex != null ? (
          <span className="relative inline-flex items-center justify-end w-full">
            <span className="group-hover:opacity-0 transition-opacity duration-[80ms]">
              {line.lineNum > 0 ? line.lineNum : ""}
            </span>
            <button
              type="button"
              aria-label="Insert line below"
              onClick={(e) => {
                // stopPropagation: prevents the row's onClick/onDoubleClick from also firing.
                // preventDefault: suppresses the browser synthetic dblclick that would
                // trigger startEdit on this line when the user double-clicks the + button.
                e.stopPropagation();
                e.preventDefault();
                // Guard: if an insert is already in-flight (e.g. from a rapid double-click),
                // discard the second call so we never append twice.
                if (insertingRef.current) return;
                insertingRef.current = true;
                void onInsertLineAfter(line.section!, line.orderIndex!).finally(() => {
                  insertingRef.current = false;
                });
              }}
              className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-60 hover:!opacity-100 rounded-[3px] transition-opacity duration-[80ms] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)] cursor-pointer"
              style={{ color: "var(--accent)" }}
            >
              <Icons.Plus size={11} />
            </button>
          </span>
        ) : (
          line.lineNum > 0 ? line.lineNum : ""
        )}
      </div>

      {/* Content */}
      <div
        className={`flex items-center gap-2 flex-1 pr-6 ${editing ? "py-1" : heightCls}`}
        style={{ minWidth: 0 }}
      >
        {line.type === "h1" && (
          <span
            className="text-[21px] font-semibold tracking-[-0.02em] leading-tight"
            style={
              {
                color: "var(--fg-primary)",
                textWrap: "balance",
              } as React.CSSProperties
            }
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
        {line.type === "meta" && isFirst && (
          <span
            className="text-[16px] font-semibold tracking-[-0.015em]"
            style={{ color: "var(--fg-primary)" }}
          >
            {line.text}
          </span>
        )}
        {line.type === "meta" && !isFirst && (
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
            style={{
              color: line.small ? "var(--fg-muted)" : "var(--fg-secondary)",
              fontSize: line.small ? 12 : undefined,
            }}
            title={isReq && onUpdateLine ? "Double-click to edit" : undefined}
          >
            {line.text}
            {line.streaming && (
              <span
                className="inline-block w-[1.5px] h-[13px] rounded-[1px] ml-[1px] align-middle animate-pulse"
                aria-hidden="true"
                style={{
                  background: "var(--fg-tertiary)",
                  verticalAlign: "middle",
                }}
              />
            )}
            {!line.streaming &&
              line.evidence?.map((ev, i) => (
                <EvidenceBit key={i} ev={ev} onOpenSource={onOpenSource} />
              ))}
            {isReq && !line.streaming && onUpdateLine && (
              <button
                type="button"
                aria-label="Edit"
                onClick={(e) => {
                  e.stopPropagation();
                  startEdit();
                }}
                className="ml-2 opacity-0 group-hover:opacity-60 hover:!opacity-100 inline-flex items-center justify-center size-[16px] rounded-[3px] transition-opacity duration-[100ms] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)] cursor-pointer"
                style={{ color: "var(--fg-muted)", verticalAlign: "middle" }}
              >
                <Icons.Pencil size={10} />
              </button>
            )}
          </span>
        )}
        {line.type === "body" && editing && (
          <div
            className="flex flex-col gap-1.5 w-full py-1"
            onClick={(e) => e.stopPropagation()}
          >
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
                style={{
                  background: "var(--accent)",
                  color: "var(--accent-fg)",
                }}
              >
                {saving ? (
                  <Icons.Download size={10} className="animate-spin" />
                ) : (
                  <Icons.Check size={10} />
                )}
                Save
              </button>
              <button
                type="button"
                onClick={() => onStopEdit()}
                disabled={saving}
                className="inline-flex items-center gap-1 h-[22px] px-2 rounded-[4px] text-[11px] transition-colors duration-[100ms] hover:bg-[var(--surface-3)] disabled:opacity-40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)] cursor-pointer"
                style={{ color: "var(--fg-muted)" }}
              >
                Cancel
              </button>
              <span
                className="text-[10px] ml-auto"
                style={{
                  color: "var(--fg-disabled)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                ⌘↵ save · ⌥↵ add below · Esc cancel
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
    // Skeleton rows: [type, width%] — mirror realistic doc structure
    const skeletonRows: Array<{ kind: "h1" | "h2" | "meta" | "body" | "blank"; w?: number }> = [
      { kind: "h1", w: 55 },
      { kind: "blank" },
      { kind: "meta", w: 28 },
      { kind: "blank" },
      { kind: "h2", w: 22 },
      { kind: "body", w: 92 },
      { kind: "body", w: 78 },
      { kind: "body", w: 85 },
      { kind: "blank" },
      { kind: "h2", w: 18 },
      { kind: "body", w: 88 },
      { kind: "body", w: 64 },
    ];
    const heights: Record<string, string> = {
      h1: "h-[22px]",
      h2: "h-[11px]",
      meta: "h-[10px]",
      body: "h-[13px]",
      blank: "h-[16px]",
    };
    const gutterH: Record<string, string> = {
      h1: "min-h-[32px] py-1",
      h2: "min-h-[28px] py-0.5",
      meta: "min-h-[21px]",
      body: "min-h-[22px] py-0.5",
      blank: "h-[16px]",
    };
    return (
      <div aria-live="polite" aria-busy="true">
        {/* Status line — same gutter layout as DocLine */}
        <div className="flex items-start w-full mb-1">
          <div className="shrink-0 w-[52px]" />
          <div className="flex items-center gap-2 py-2">
            <span
              className="size-[7px] rounded-full animate-pulse shrink-0"
              style={{ background: isRevising ? "var(--accent)" : "var(--warning)" }}
              aria-hidden="true"
            />
            <span className="text-[12px]" style={{ color: "var(--fg-muted)" }}>
              {isRevising ? "Revising brief…" : "Generating brief…"}
            </span>
          </div>
        </div>
        {skeletonRows.map((row, i) => (
          <div key={i} className={`flex items-start w-full ${gutterH[row.kind]}`}>
            {/* Gutter — matches DocLine exactly */}
            <div className={`shrink-0 flex items-start justify-end pr-3 pt-[3px] w-[52px] ${gutterH[row.kind]}`}>
              {row.kind !== "blank" && row.kind !== "meta" && (
                <div
                  className="h-[9px] w-[18px] rounded-[2px] animate-pulse"
                  style={{ background: "var(--surface-3)", opacity: 0.5 }}
                />
              )}
            </div>
            {/* Content */}
            <div className={`flex items-center flex-1 pr-6 ${gutterH[row.kind]}`}>
              {row.kind !== "blank" && (
                <div
                  className={`${heights[row.kind]} rounded-[3px] animate-pulse`}
                  style={{
                    width: `${row.w ?? 60}%`,
                    background: "var(--surface-3)",
                    animationDelay: `${i * 60}ms`,
                  }}
                />
              )}
            </div>
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
      className="shrink-0 border-t px-4 pt-3 pb-4"
      style={{ borderColor: "var(--border)", background: "var(--background)" }}
    >
      {/* Context pill */}
      {selectedReqText && (
        <div className="flex items-center gap-1.5 mb-2">
          <span
            className="flex items-center gap-1.5 h-[22px] px-2.5 rounded-[5px] border text-[11px] max-w-[calc(100%-28px)] min-w-0"
            style={{
              background: "color-mix(in srgb, var(--accent) 8%, transparent)",
              borderColor: "color-mix(in srgb, var(--accent) 30%, transparent)",
              color: "var(--accent)",
            }}
          >
            <Icons.MessageSquare size={10} aria-hidden="true" className="shrink-0" />
            <span className="truncate text-[11px]">
              Re: {selectedReqText.length > 72 ? `${selectedReqText.slice(0, 72)}…` : selectedReqText}
            </span>
          </span>
          <button
            type="button"
            aria-label="Clear selection context"
            onClick={onClearSelection}
            className="shrink-0 inline-flex items-center justify-center size-[22px] rounded-[4px] transition-colors duration-[100ms] hover:bg-[var(--surface-3)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)] cursor-pointer"
            style={{ color: "var(--fg-muted)" }}
          >
            <Icons.X size={10} />
          </button>
        </div>
      )}

      {/* Input card */}
      <div
        className="flex flex-col rounded-[8px] border overflow-hidden"
        style={{
          background: "var(--surface-1)",
          borderColor: "var(--border-strong)",
        }}
      >
        <label htmlFor="doc-chat-input" className="sr-only">Chat input</label>
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
          className="w-full bg-transparent text-[13px] px-4 pt-3 pb-2 focus-visible:outline-none disabled:opacity-50"
          style={{ color: "var(--fg-primary)" }}
          autoComplete="off"
          spellCheck={false}
        />
        {/* Action row */}
        <div className="flex items-center justify-between px-3 pb-2.5">
          <div className="flex items-center gap-1">
            <IconButton
              label="Attach source"
              onClick={() => fileInputRef.current?.click()}
              disabled={!onAttachFiles}
            >
              <Icons.Upload size={13} />
            </IconButton>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,application/pdf,audio/*"
              className="hidden"
              onChange={handleFilePick}
            />
          </div>
          <div className="flex items-center gap-2">
            {!isDisabled && (
              <span
                className="text-[10px] select-none"
                style={{ color: "var(--fg-disabled)", fontFamily: "var(--font-mono)" }}
              >
                ↵ send
              </span>
            )}
            <IconButton
              label="Send message"
              onClick={() => void handleSend()}
              disabled={isDisabled || !value.trim()}
            >
              {sending || revising ? (
                <Icons.Download size={13} className="animate-spin" />
              ) : (
                <Icons.Send size={13} />
              )}
            </IconButton>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Filter ─────────────────────────────────────────────── */
function applyFilter(lines: DocLineData[], query: string): DocLineData[] {
  if (!query.trim()) return lines;
  const q = query.toLowerCase();
  return lines.filter((l) => {
    if (l.type === "h1" || l.type === "h2" || l.type === "meta" || l.type === "req-header") return true;
    if (l.type === "blank") return false;
    return l.text?.toLowerCase().includes(q) ?? false;
  });
}

/* ── DocView ────────────────────────────────────────────── */
export interface DocViewProps {
  appState?: AppState;
  projectName?: string | null;
  currentVersion?: number | null;
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
  onUpdateLine?: (
    reqId: string,
    reqType: "claim" | "question",
    newText: string,
  ) => Promise<void>;
  onInsertLineAfter?: (section: string, orderIndex: number) => Promise<void>;
  autoFocusReqId?: string | null;
  onAutoFocusConsumed?: () => void;
  viewingVersion?: number | null;
  onExitVersionView?: () => void;
  comparisonTabs?: WorkspaceComparisonTab[];
  activeWorkspaceTab?: string;
  activeComparisonContent?: ReactNode;
  onSelectWorkspaceTab?: (id: string) => void;
  onCloseComparisonTab?: (id: string) => void;
  snapshotId?: string | null;
  onShareBrief?: () => void;
}

export function DocView({
  appState = "no-session",
  projectName,
  currentVersion,
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
  onInsertLineAfter,
  autoFocusReqId,
  onAutoFocusConsumed,
  viewingVersion = null,
  onExitVersionView,
  comparisonTabs = [],
  activeWorkspaceTab = "draft",
  activeComparisonContent,
  onSelectWorkspaceTab,
  onCloseComparisonTab,
  snapshotId,
  onShareBrief,
}: DocViewProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const filterInputRef = useRef<HTMLInputElement>(null);
  // Singleton edit guard: at most one DocLine can be in edit mode at a time.
  // Storing the reqId (instead of a boolean) lets us derive isEditing per-row
  // without any per-row state mutation.
  const [activeEditReqId, setActiveEditReqId] = useState<string | null>(null);

  useEffect(() => {
    if (filterOpen) filterInputRef.current?.focus();
  }, [filterOpen]);

  function closeFilter() {
    setFilterOpen(false);
    setFilterQuery("");
  }

  const canGenerate = appState === "ready" || appState === "no-sources";
  const generateDisabled =
    appState === "no-sources" ||
    appState === "no-session" ||
    appState === "generating" ||
    appState === "revising" ||
    generating ||
    revising ||
    !onGenerateBrief;
  const showingComparison =
    activeWorkspaceTab !== "draft" && activeComparisonContent;

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
              <span
                className="truncate shrink-0 max-w-[180px] font-medium"
                style={{ color: "var(--fg-secondary)" }}
              >
                {projectName}
              </span>
              {(viewingVersion != null || currentVersion != null) && (
                <Icons.ChevronRight
                  size={11}
                  aria-hidden="true"
                  className="shrink-0 opacity-40"
                />
              )}
            </>
          )}
          {(viewingVersion != null || currentVersion != null) && (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--accent)",
                fontSize: 11,
              }}
            >
              v{viewingVersion ?? currentVersion}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {filterOpen ? (
            <div
              className="flex items-center gap-1 h-[22px] px-1.5 rounded-[4px] border"
              style={{ background: "var(--surface-2)", borderColor: "var(--border-strong)" }}
            >
              <Icons.Filter size={10} aria-hidden="true" style={{ color: "var(--fg-muted)" }} />
              <input
                ref={filterInputRef}
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Escape") closeFilter(); }}
                placeholder="Filter requirements…"
                className="w-[160px] bg-transparent text-[11px] focus-visible:outline-none"
                style={{ color: "var(--fg-primary)" }}
                aria-label="Filter requirements"
              />
              <button
                type="button"
                onClick={closeFilter}
                aria-label="Clear filter"
                className="inline-flex items-center justify-center size-[14px] rounded-[2px] hover:bg-[var(--surface-3)] focus-visible:outline-none cursor-pointer"
                style={{ color: "var(--fg-muted)" }}
              >
                <Icons.X size={9} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setFilterOpen(true)}
              className="flex items-center gap-1 h-[22px] px-2 rounded-[4px] text-[11px] transition-colors duration-[120ms] hover:bg-[var(--surface-3)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)] cursor-pointer"
              style={{ color: filterQuery ? "var(--accent)" : "var(--fg-tertiary)" }}
            >
              <Icons.Filter size={11} aria-hidden="true" />
              <span>Filter</span>
            </button>
          )}
          {hasSnapshot && !!snapshotId && !!onShareBrief && (
            <button
              type="button"
              onClick={onShareBrief}
              className="flex items-center gap-1 h-[22px] px-2 rounded-[4px] text-[11px] transition-colors duration-[120ms] hover:bg-[var(--surface-3)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)] cursor-pointer"
              style={{ background: "var(--surface-3)", color: "var(--fg-muted)" }}
            >
              <Icons.Share size={11} aria-hidden="true" />
              <span>Share</span>
            </button>
          )}
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

      {comparisonTabs.length > 0 && (
        <div
          className="flex items-center h-8 px-2 shrink-0 border-b gap-1 overflow-x-auto"
          style={{
            background: "var(--surface-1)",
            borderColor: "var(--border)",
          }}
          role="tablist"
          aria-label="Workspace tabs"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeWorkspaceTab === "draft"}
            onClick={() => onSelectWorkspaceTab?.("draft")}
            className="inline-flex items-center h-[24px] px-2 rounded-[4px] text-[11px] font-medium border transition-colors duration-[120ms] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)] cursor-pointer"
            style={
              activeWorkspaceTab === "draft"
                ? {
                  background: "var(--surface-3)",
                  borderColor: "var(--border-strong)",
                  color: "var(--fg-primary)",
                }
                : {
                  background: "transparent",
                  borderColor: "transparent",
                  color: "var(--fg-tertiary)",
                }
            }
          >
            Draft
          </button>
          {comparisonTabs.map((tab) => {
            const active = activeWorkspaceTab === tab.id;
            return (
              <div
                key={tab.id}
                className="group inline-flex items-center h-[24px] max-w-[260px] rounded-[4px] text-[11px] font-medium border transition-colors duration-[120ms]"
                style={
                  active
                    ? {
                      background: "var(--surface-3)",
                      borderColor: "var(--border-strong)",
                      color: "var(--fg-primary)",
                    }
                    : {
                      background: "transparent",
                      borderColor: "transparent",
                      color: "var(--fg-tertiary)",
                    }
                }
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => onSelectWorkspaceTab?.(tab.id)}
                  className="inline-flex items-center gap-1 h-full min-w-0 px-2 rounded-l-[4px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)] cursor-pointer"
                  style={{ color: "inherit" }}
                >
                  <Icons.GitCompare
                    size={11}
                    aria-hidden="true"
                    className="shrink-0"
                  />
                  <span className="truncate">{tab.title}</span>
                </button>
                <button
                  type="button"
                  aria-label={`Close ${tab.title}`}
                  onClick={() => onCloseComparisonTab?.(tab.id)}
                  className="inline-flex items-center justify-center size-[20px] mr-0.5 rounded-[3px] opacity-70 transition-opacity duration-[120ms] hover:opacity-100 hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)] cursor-pointer"
                  style={{ color: "var(--fg-muted)" }}
                >
                  <Icons.X size={9} aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Past-version banner */}
      {viewingVersion !== null && !showingComparison && (
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
            Viewing{" "}
            <span className="font-mono font-medium">v{viewingVersion}</span> —
            this is a past version
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
        {showingComparison ? (
          activeComparisonContent
        ) : streamingLines && streamingLines.length > 0 ? (
          streamingLines.map((line, i) => (
            <DocLine
              key={i}
              line={line}
              selectedReq={null}
              onSelectReq={() => undefined}
              // Streaming lines are read-only — editing is never active here.
              isEditing={false}
              onStartEdit={() => undefined}
              onStopEdit={() => undefined}
              isFirst={i === 0}
            />
          ))
        ) : (appState === "generating" || appState === "revising") ? (
          <EmptyDoc state={appState} onAddSources={onAddSources} generationError={generationError} onRetry={onRetry} />
        ) : appState !== "ready" ? (
          <EmptyDoc state={appState} onAddSources={onAddSources} generationError={generationError} onRetry={onRetry} />
        ) : lines.length === 0 ? (
          <EmptyDoc state="no-sources" onAddSources={onAddSources} />
        ) : (
          applyFilter(lines, filterQuery).map((line, i) => (
            <DocLine
              key={line.reqId ?? i}
              line={line}
              selectedReq={selectedReq}
              onSelectReq={onSelectReq}
              onUpdateLine={onUpdateLine}
              onInsertLineAfter={onInsertLineAfter}
              autoFocus={!!autoFocusReqId && line.reqId === autoFocusReqId}
              onAutoFocusConsumed={onAutoFocusConsumed}
              onOpenSource={onOpenSource}
              isEditing={!!line.reqId && line.reqId === activeEditReqId}
              onStartEdit={() => line.reqId && setActiveEditReqId(line.reqId)}
              onStopEdit={() => setActiveEditReqId(null)}
              isFirst={i === 0}
            />
          ))
        )}
      </div>

      {/* Chat bar */}
      {!showingComparison && (
        <ChatBar
          onAttachFiles={onAttachFiles}
          selectedReqText={selectedReqText}
          onClearSelection={onClearSelection}
          onSendMessage={onSendMessage}
          revising={revising}
        />
      )}
    </div>
  );
}
