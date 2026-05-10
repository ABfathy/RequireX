"use client";

import { useState } from "react";

import { Icons } from "@/components/icons";
import { IconButton } from "@/components/ui/icon-button";
import { Pill } from "@/components/ui/pill";
import { Tag } from "@/components/ui/tag";

/* ── Types ─────────────────────────────────────────────── */
export type AppState = "no-session" | "no-sources" | "generating" | "failed" | "ready";

type Tone = "success" | "info" | "warning" | "danger" | "neutral";

type LineType =
  | "h1" | "h2" | "meta"
  | "req-header" | "req-title"
  | "body" | "blank";

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
  status?: string;
  tags?: string[];
  evidence?: EvidenceRef[];
  small?: boolean;
}

const STATUS_TONE: Record<string, Tone> = {
  approved:    "success",
  "in-review": "info",
  draft:       "neutral",
  conflict:    "danger",
  stale:       "warning",
};

const STATUS_LABEL: Record<string, string> = {
  approved:    "Approved",
  "in-review": "In review",
  draft:       "Draft",
  conflict:    "Conflict",
  stale:       "Stale",
};

/* ── EvidenceBit ────────────────────────────────────────── */
function EvidenceBit({ ev }: { ev: EvidenceRef }) {
  const [show, setShow] = useState(false);
  return (
    <span
      className="relative inline-flex items-center gap-1 ml-1.5 px-1.5 h-[18px] rounded-[3px] border cursor-default select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)]"
      tabIndex={0}
      role="button"
      aria-label={`Evidence: ${ev.sourceName} — ${ev.ref}`}
      style={{
        background: "var(--surface-3)",
        borderColor: "var(--border-strong)",
        color: "var(--fg-tertiary)",
        fontSize: 10,
        fontFamily: "var(--font-mono)",
      }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
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
            style={{ color: "var(--fg-secondary)", fontFamily: "var(--font-mono)" }}
          >
            {ev.sourceName}
          </span>
          <span
            className="block text-[11px] leading-[1.5] italic"
            style={{ color: "var(--fg-tertiary)" }}
          >
            {ev.quote}
          </span>
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
}: {
  line: DocLineData;
  selectedReq: string | null;
  onSelectReq: (id: string) => void;
}) {
  const isReq    = !!line.reqId;
  const isActive = isReq && line.reqId === selectedReq;

  const heights: Partial<Record<LineType, string>> = {
    h1:    "min-h-[32px] py-1",
    h2:    "min-h-[28px] py-0.5",
    blank: line.small ? "h-[8px]" : "h-[16px]",
  };
  const heightCls = heights[line.type] ?? "min-h-[21px]";

  function handleKeyDown(e: React.KeyboardEvent) {
    if (isReq && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onSelectReq(line.reqId!);
    }
  }

  return (
    <div
      className={`flex items-start w-full transition-colors duration-[80ms] ${isReq ? "cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[var(--accent-ring)]" : ""}`}
      style={{ background: isActive ? "var(--accent-subtle)" : undefined }}
      role={isReq ? "button" : undefined}
      tabIndex={isReq ? 0 : undefined}
      aria-pressed={isReq ? isActive : undefined}
      onClick={isReq ? () => onSelectReq(line.reqId!) : undefined}
      onKeyDown={isReq ? handleKeyDown : undefined}
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
        className={`flex items-center gap-2 flex-1 pr-6 ${heightCls}`}
        style={{ minWidth: 0 }}
      >
        {line.type === "h1" && (
          <span
            className="text-[21px] font-semibold tracking-[-0.02em] leading-tight"
            style={{ color: "var(--fg-primary)" }}
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
        {line.type === "body" && (
          <span
            className="text-[14px] leading-[1.65]"
            style={{ color: "var(--fg-secondary)" }}
          >
            {line.text}
            {line.evidence?.map((ev, i) => (
              <EvidenceBit key={i} ev={ev} />
            ))}
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Empty states ───────────────────────────────────────── */
function EmptyDoc({ state, onAddSources }: { state: AppState; onAddSources?: () => void }) {
  if (state === "no-session") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 h-full py-20 text-center px-8">
        <Icons.FileText size={28} aria-hidden="true" className="text-[var(--fg-disabled)]" />
        <div>
          <p className="text-[15px] font-medium mb-1" style={{ color: "var(--fg-secondary)" }}>
            No project selected
          </p>
          <p className="text-[13px] leading-[1.65]" style={{ color: "var(--fg-muted)" }}>
            Open a project from the sidebar to get started.
          </p>
        </div>
      </div>
    );
  }

  if (state === "no-sources") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 h-full py-20 text-center px-8">
        <Icons.Upload size={28} aria-hidden="true" className="text-[var(--fg-disabled)]" />
        <div>
          <p className="text-[15px] font-medium mb-1" style={{ color: "var(--fg-secondary)" }}>
            No sources yet
          </p>
          <p className="text-[13px] leading-[1.65] mb-4" style={{ color: "var(--fg-muted)" }}>
            Add PDFs, transcripts, or paste text in the Sources panel to begin.
          </p>
          {onAddSources && (
            <button
              type="button"
              onClick={onAddSources}
              className="inline-flex items-center gap-1.5 h-[28px] px-3 rounded-[5px] text-[12px] font-medium border transition-colors duration-[120ms] hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] cursor-pointer"
              style={{ color: "var(--fg-secondary)", borderColor: "var(--border-strong)" }}
            >
              <Icons.PanelRight size={12} aria-hidden="true" />
              <span>Open Sources</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  if (state === "generating") {
    return (
      <div className="flex flex-col h-full py-6 px-[52px] pr-6" aria-live="polite" aria-busy="true">
        <div className="flex items-center gap-2 mb-6">
          <span
            className="size-[8px] rounded-full animate-pulse shrink-0"
            style={{ background: "var(--warning)" }}
            aria-hidden="true"
          />
          <span className="text-[13px]" style={{ color: "var(--fg-tertiary)" }}>
            Generating brief…
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
          style={{ background: "color-mix(in srgb, var(--danger) 12%, transparent)" }}
          aria-hidden="true"
        >
          <Icons.X size={14} style={{ color: "var(--danger)" }} />
        </div>
        <div>
          <p className="text-[15px] font-medium mb-1" style={{ color: "var(--fg-secondary)" }}>
            Generation failed
          </p>
          <p className="text-[13px] leading-[1.65]" style={{ color: "var(--fg-muted)" }}>
            The pipeline could not complete. Check sources and try again.
          </p>
        </div>
      </div>
    );
  }

  return null;
}

/* ── ChatBar ────────────────────────────────────────────── */
function ChatBar() {
  const [value, setValue] = useState("");

  function handleSend() {
    if (!value.trim()) return;
    setValue("");
  }

  return (
    <div
      className="shrink-0 border-t"
      style={{ borderColor: "var(--border)", background: "var(--background)" }}
    >
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
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ask about requirements, request changes, upload sources…"
          className="flex-1 bg-transparent text-[13px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)] rounded-[3px]"
          style={{ color: "var(--fg-primary)" }}
          autoComplete="off"
          spellCheck={false}
        />
        <IconButton label="Attach source">
          <Icons.Upload size={14} />
        </IconButton>
        <IconButton label="Send message" onClick={handleSend}>
          <Icons.Send size={14} />
        </IconButton>
      </div>
    </div>
  );
}

/* ── DocView ────────────────────────────────────────────── */
export interface DocViewProps {
  appState?: AppState;
  sessionName?: string | null;
  selectedReq: string | null;
  onSelectReq: (id: string) => void;
  onAddSources?: () => void;
  lines?: DocLineData[];
}

export function DocView({
  appState = "no-session",
  sessionName,
  selectedReq,
  onSelectReq,
  onAddSources,
  lines = [],
}: DocViewProps) {
  const canGenerate = appState === "ready" || appState === "no-sources";
  const generateDisabled = appState === "no-sources" || appState === "no-session";

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
          className="flex items-center gap-1.5 text-[12px] flex-1 min-w-0"
          style={{ color: "var(--fg-tertiary)" }}
        >
          <span className="truncate" style={{ color: "var(--fg-secondary)" }}>
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
            title={generateDisabled ? "Add sources first" : undefined}
            className="flex items-center gap-1 h-[22px] px-2 rounded-[4px] text-[11px] font-medium transition-colors duration-[120ms] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            style={
              canGenerate && !generateDisabled
                ? { background: "var(--accent)", color: "var(--accent-fg)" }
                : { background: "var(--surface-3)", color: "var(--fg-muted)" }
            }
          >
            <Icons.Download size={11} aria-hidden="true" />
            <span>Generate Brief</span>
          </button>
        </div>
      </div>

      {/* Doc scroll */}
      <div className="flex-1 overflow-y-auto py-4">
        {appState !== "ready" ? (
          <EmptyDoc state={appState} onAddSources={onAddSources} />
        ) : lines.length === 0 ? (
          <EmptyDoc state="no-sources" onAddSources={onAddSources} />
        ) : (
          lines.map((line, i) => (
            <DocLine
              key={i}
              line={line}
              selectedReq={selectedReq}
              onSelectReq={onSelectReq}
            />
          ))
        )}
      </div>

      {/* Chat bar */}
      <ChatBar />
    </div>
  );
}
