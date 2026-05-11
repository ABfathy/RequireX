"use client";

import { useEffect, useRef, useState } from "react";

import { Icons } from "@/components/icons";
import { Kbd } from "@/components/ui/kbd";
import { useIsMac } from "@/lib/hooks/use-is-mac";

const TEXT_MAX = 500_000;

interface AddTextDialogProps {
  onSubmit?: (text: string) => Promise<void>;
  onClose: () => void;
}

export function AddTextDialog({ onSubmit, onClose }: AddTextDialogProps) {
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isMac = useIsMac();

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Esc anywhere closes; (Cmd|Ctrl)+Enter submits from anywhere in the dialog.
  // The scoped onKeyDown on the textarea handles the typical case; this
  // window-level listener catches Esc when focus is on the buttons.
  useEffect(() => {
    function handle(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [onClose]);

  const over = value.length > TEXT_MAX;
  const trimmed = value.trim();
  const canSubmit = trimmed.length > 0 && !over && !submitting && !!onSubmit;

  async function handleSubmit() {
    if (!canSubmit || !onSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(trimmed);
      onClose();
    } catch {
      setError("Failed to save. Try again.");
      setSubmitting(false);
    }
  }

  function handleTextareaKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void handleSubmit();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[14vh]"
      style={{ background: "var(--overlay)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-text-title"
        className="w-[640px] max-w-[calc(100vw-32px)] rounded-[8px] overflow-hidden flex flex-col"
        style={{
          background: "var(--surface-2)",
          boxShadow: "var(--shadow-lg-val)",
          border: "1px solid var(--border-strong)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between h-11 px-3.5 border-b shrink-0"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-2">
            <Icons.FileText size={14} className="text-[var(--fg-muted)] shrink-0" />
            <h2
              id="add-text-title"
              className="text-[13px] font-medium"
              style={{ color: "var(--fg-primary)" }}
            >
              Add text source
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="h-[22px] w-[22px] inline-flex items-center justify-center rounded-[4px] transition-colors duration-[120ms] hover:bg-[var(--surface-3)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)] cursor-pointer"
            style={{ color: "var(--fg-tertiary)" }}
          >
            <Icons.X size={13} aria-hidden="true" />
          </button>
        </div>

        {/* Textarea */}
        <div className="p-3.5">
          <label htmlFor="add-text-input" className="sr-only">
            Paste text content
          </label>
          <textarea
            ref={textareaRef}
            id="add-text-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleTextareaKey}
            placeholder="Paste client context, notes, or requirements…"
            rows={14}
            className="w-full bg-transparent text-[13px] leading-[1.6] resize-none rounded-[6px] border p-3 focus-visible:outline-none focus-visible:ring-1"
            style={{
              color: "var(--fg-primary)",
              borderColor: "var(--border)",
              background: "var(--surface-1)",
            }}
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between gap-3 px-3.5 py-2.5 border-t"
          style={{ borderColor: "var(--border)" }}
        >
          <span
            className="text-[10px] shrink-0"
            style={{
              color: over ? "var(--danger)" : "var(--fg-disabled)",
              fontFamily: "var(--font-mono)",
            }}
            aria-live="polite"
          >
            {value.length.toLocaleString()} / {TEXT_MAX.toLocaleString()}
          </span>

          {error ? (
            <span
              className="text-[11px] flex-1 text-center"
              style={{ color: "var(--danger)" }}
              aria-live="polite"
            >
              {error}
            </span>
          ) : (
            <span className="flex-1" />
          )}

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="h-[26px] px-2.5 rounded-[5px] text-[11px] transition-colors duration-[120ms] hover:bg-[var(--surface-3)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)] disabled:opacity-40 cursor-pointer"
              style={{ color: "var(--fg-tertiary)" }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="inline-flex items-center gap-2 h-[26px] px-2.5 rounded-[5px] text-[11px] font-medium transition-colors duration-[120ms] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
            >
              <span>{submitting ? "Saving…" : "Add source"}</span>
              {!submitting && (
                <Kbd className="bg-[color-mix(in_srgb,var(--accent-fg)_18%,transparent)] border-[color-mix(in_srgb,var(--accent-fg)_28%,transparent)] text-[var(--accent-fg)]">
                  {isMac ? "⌘↵" : "Ctrl ↵"}
                </Kbd>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
