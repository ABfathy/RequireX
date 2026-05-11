"use client";

import { useEffect, useRef, useState } from "react";

import { Icons } from "@/components/icons";

import type { SourceItem } from "./right-pane";

interface SourcePreviewModalProps {
  item: SourceItem;
  onClose: () => void;
}

/* ── Skeleton block for media loading states ────────────────────── */
function SkeletonPreview({ height = "70vh" }: { height?: string }) {
  return (
    <div
      className="w-full rounded-[6px] animate-pulse"
      style={{ height, background: "var(--surface-3)" }}
      aria-hidden="true"
    />
  );
}

/* ── Text content loader ────────────────────────────────────────── */
function TextPreview({ assetId }: { assetId: string }) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [text, setText] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/assets/${assetId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: { asset: { textContent: string | null } }) => {
        if (cancelled) return;
        setText(data.asset.textContent ?? "");
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => { cancelled = true; };
  }, [assetId]);

  if (state === "loading") {
    return (
      <div className="flex flex-col gap-2 py-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-[12px] rounded-[3px] animate-pulse"
            style={{
              width: i % 3 === 2 ? "55%" : i % 3 === 1 ? "80%" : "100%",
              background: "var(--surface-3)",
            }}
            aria-hidden="true"
          />
        ))}
      </div>
    );
  }

  if (state === "error") {
    return (
      <p className="text-[12px] py-4 text-center" style={{ color: "var(--danger)" }}>
        Failed to load text content.
      </p>
    );
  }

  return (
    <pre
      className="text-[12px] leading-[1.7] whitespace-pre-wrap break-words font-mono overflow-y-auto max-h-[65vh] rounded-[6px] p-3"
      style={{
        background: "var(--surface-2)",
        color: "var(--fg-secondary)",
        border: "1px solid var(--border)",
      }}
    >
      {text || <span style={{ color: "var(--fg-disabled)" }}>Empty</span>}
    </pre>
  );
}

/* ── Image preview ──────────────────────────────────────────────── */
function ImagePreview({ url, label }: { url: string; label: string }) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  return (
    <div className="relative flex items-center justify-center min-h-[200px]">
      {state === "loading" && (
        <div className="absolute inset-0">
          <SkeletonPreview height="100%" />
        </div>
      )}
      {state === "error" ? (
        <FallbackPreview url={url} label={label} />
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={url}
          alt={label}
          className="max-w-full max-h-[65vh] object-contain rounded-[6px]"
          style={{ display: state === "ready" ? "block" : "none" }}
          onLoad={() => setState("ready")}
          onError={() => setState("error")}
        />
      )}
    </div>
  );
}

/* ── Audio preview ──────────────────────────────────────────────── */
function AudioPreview({ url, label }: { url: string; label: string }) {
  const [ready, setReady] = useState(false);

  return (
    <div className="flex flex-col gap-4 items-center py-6">
      {!ready && <SkeletonPreview height="52px" />}
      <audio
        controls
        src={url}
        aria-label={label}
        className="w-full"
        style={{ display: ready ? "block" : "none" }}
        onCanPlay={() => setReady(true)}
      />
      {!ready && (
        <p className="text-[11px]" style={{ color: "var(--fg-muted)" }}>
          Loading audio…
        </p>
      )}
    </div>
  );
}

/* ── PDF preview ────────────────────────────────────────────────── */
function PdfPreview({ url, label }: { url: string; label: string }) {
  const [ready, setReady] = useState(false);

  return (
    <div className="relative" style={{ height: "70vh" }}>
      {!ready && (
        <div className="absolute inset-0">
          <SkeletonPreview height="100%" />
        </div>
      )}
      <iframe
        src={url}
        title={label}
        className="w-full h-full rounded-[6px] border"
        style={{
          borderColor: "var(--border)",
          display: ready ? "block" : "none",
        }}
        onLoad={() => setReady(true)}
      />
    </div>
  );
}

/* ── Fallback (no URL or unknown type) ──────────────────────────── */
function FallbackPreview({ url, label }: { url?: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12">
      <Icons.FileText size={28} aria-hidden="true" style={{ color: "var(--fg-disabled)" }} />
      <p className="text-[12px]" style={{ color: "var(--fg-muted)" }}>
        No preview available for this file type.
      </p>
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          download={label}
          className="inline-flex items-center gap-1.5 text-[12px] underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)]"
          style={{ color: "var(--accent)" }}
        >
          <Icons.Download size={12} aria-hidden="true" />
          Download file
        </a>
      )}
    </div>
  );
}

/* ── Type badge ─────────────────────────────────────────────────── */
const TYPE_LABEL: Record<string, string> = {
  TEXT: "Text",
  FILE: "File",
  AUDIO: "Audio",
};

/* ── Main modal ─────────────────────────────────────────────────── */
export function SourcePreviewModal({ item, onClose }: SourcePreviewModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  /* Focus the close button on mount and restore on unmount */
  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  /* Close on Escape */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function renderContent() {
    const { sourceType, fileUrl, mimeType } = item;

    if (sourceType === "TEXT") {
      return <TextPreview assetId={item.id} />;
    }

    if (!fileUrl) {
      return <FallbackPreview label={item.label} />;
    }

    if (mimeType?.startsWith("image/")) {
      return <ImagePreview url={fileUrl} label={item.label} />;
    }

    if (mimeType === "application/pdf") {
      return <PdfPreview url={fileUrl} label={item.label} />;
    }

    if (mimeType?.startsWith("audio/") || sourceType === "AUDIO") {
      return <AudioPreview url={fileUrl} label={item.label} />;
    }

    return <FallbackPreview url={fileUrl} label={item.label} />;
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="presentation"
    >
      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Preview: ${item.label}`}
        className="flex flex-col w-full max-w-3xl rounded-[8px] border overflow-hidden"
        style={{
          background: "var(--surface-1)",
          borderColor: "var(--border)",
          maxHeight: "90vh",
          boxShadow: "0 24px 48px rgba(0,0,0,0.3)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2 px-4 py-3 border-b shrink-0"
          style={{ borderColor: "var(--border)" }}
        >
          <span
            className="text-[10px] font-semibold uppercase tracking-[0.08em] px-1.5 py-0.5 rounded-[3px] shrink-0"
            style={{
              background: "var(--surface-3)",
              color: "var(--fg-muted)",
            }}
          >
            {TYPE_LABEL[item.sourceType] ?? item.sourceType}
          </span>
          <span
            className="flex-1 min-w-0 text-[13px] font-medium truncate"
            style={{ color: "var(--fg-primary)" }}
            title={item.label}
          >
            {item.label}
          </span>
          <button
            ref={closeRef}
            type="button"
            aria-label="Close preview"
            onClick={onClose}
            className="inline-flex items-center justify-center size-6 rounded-[4px] shrink-0 transition-colors duration-[120ms] hover:bg-[var(--surface-3)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)] cursor-pointer"
            style={{ color: "var(--fg-tertiary)" }}
          >
            <Icons.X size={13} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
