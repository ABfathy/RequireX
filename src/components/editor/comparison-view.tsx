"use client";

import type { CSSProperties } from "react";

import { Icons } from "@/components/icons";
import type { LineDiffRow } from "@/lib/line-diff";

interface ComparisonViewProps {
  oldVersion: number;
  newVersion: number;
  documentType?: "GENERATED_BRIEF" | "FINALIZED_DOCUMENT";
  rows: LineDiffRow[] | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onClose?: () => void;
}

function rowPrefix(kind: LineDiffRow["kind"]) {
  if (kind === "added") return "+";
  if (kind === "removed") return "-";
  return " ";
}

function rowStyle(kind: LineDiffRow["kind"]): CSSProperties {
  if (kind === "added") {
    return {
      background: "color-mix(in srgb, var(--success) 14%, transparent)",
      color: "var(--fg-secondary)",
    };
  }
  if (kind === "removed") {
    return {
      background: "color-mix(in srgb, var(--danger) 14%, transparent)",
      color: "var(--fg-secondary)",
    };
  }
  return { color: "var(--fg-secondary)" };
}

export function ComparisonView({
  oldVersion,
  newVersion,
  documentType = "GENERATED_BRIEF",
  rows,
  loading,
  error,
  onRetry,
  onClose,
}: ComparisonViewProps) {
  if (loading) {
    return (
      <div
        className="flex flex-col h-full py-6 px-[52px] pr-6"
        aria-busy="true"
      >
        <div className="flex items-center gap-2 mb-6">
          <span
            className="size-[8px] rounded-full animate-pulse shrink-0"
            style={{ background: "var(--accent)" }}
            aria-hidden="true"
          />
          <span className="text-[13px]" style={{ color: "var(--fg-tertiary)" }}>
            Loading comparison...
          </span>
        </div>
        {[82, 58, 72, 44, 68].map((width, index) => (
          <div key={index} className="flex items-center gap-3 mb-3">
            <div
              className="h-[14px] rounded-[3px] animate-pulse"
              style={{ width: `${width}%`, background: "var(--surface-3)" }}
            />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
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
            Comparison failed
          </p>
          <p
            className="text-[13px] leading-[1.65]"
            style={{ color: "var(--fg-muted)" }}
          >
            {error}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 h-[26px] px-3 rounded-[5px] text-[12px] font-medium border transition-colors duration-[120ms] hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)] cursor-pointer"
              style={{
                color: "var(--fg-secondary)",
                borderColor: "var(--border-strong)",
              }}
            >
              <Icons.Refresh size={12} aria-hidden="true" />
              <span>Retry</span>
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 h-[26px] px-3 rounded-[5px] text-[12px] font-medium border transition-colors duration-[120ms] hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)] cursor-pointer"
              style={{
                color: "var(--fg-tertiary)",
                borderColor: "var(--border)",
              }}
            >
              <Icons.X size={12} aria-hidden="true" />
              <span>Close</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    const label =
      documentType === "FINALIZED_DOCUMENT"
        ? "Finalized Version"
        : "Brief Version";
    return (
      <div className="flex flex-col items-center justify-center gap-3 h-full py-20 text-center px-8">
        <Icons.GitCompare
          size={28}
          aria-hidden="true"
          className="text-[var(--fg-disabled)]"
        />
        <div>
          <p
            className="text-[15px] font-medium mb-1"
            style={{ color: "var(--fg-secondary)" }}
          >
            No textual differences
          </p>
          <p
            className="text-[13px] leading-[1.65]"
            style={{ color: "var(--fg-muted)" }}
          >
            {label} {oldVersion} and {label} {newVersion} render the same
            comparison text.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-4">
      <div className="px-[52px] pr-6 pb-3">
        <div
          className="flex items-center gap-2 text-[12px] font-medium"
          style={{ color: "var(--fg-secondary)" }}
        >
          <Icons.GitCompare size={13} aria-hidden="true" />
          <span>
            {documentType === "FINALIZED_DOCUMENT"
              ? "Finalized Version"
              : "Brief Version"}{" "}
            {oldVersion} vs{" "}
            {documentType === "FINALIZED_DOCUMENT"
              ? "Finalized Version"
              : "Brief Version"}{" "}
            {newVersion}
          </span>
        </div>
      </div>

      <div
        className="mx-4 rounded-[6px] border overflow-hidden"
        style={{
          borderColor: "var(--border)",
          background: "var(--background)",
        }}
      >
        {rows.map((row, index) => (
          <div
            key={`${row.kind}-${index}-${row.text}`}
            className="grid items-start min-h-[22px] text-[12px] leading-[1.6]"
            style={{
              ...rowStyle(row.kind),
              gridTemplateColumns: "52px 52px 28px minmax(0, 1fr)",
              fontFamily: "var(--font-mono)",
            }}
          >
            <span
              className="px-2 pt-[1px] text-right select-none"
              style={{ color: "var(--fg-muted)" }}
            >
              {row.oldLineNumber ?? ""}
            </span>
            <span
              className="px-2 pt-[1px] text-right select-none"
              style={{ color: "var(--fg-muted)" }}
            >
              {row.newLineNumber ?? ""}
            </span>
            <span
              className="px-2 pt-[1px] select-none"
              style={{
                color:
                  row.kind === "added"
                    ? "var(--success)"
                    : row.kind === "removed"
                      ? "var(--danger)"
                      : "var(--fg-muted)",
              }}
            >
              {rowPrefix(row.kind)}
            </span>
            <span className="px-2 pt-[1px] whitespace-pre-wrap break-words">
              {row.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
