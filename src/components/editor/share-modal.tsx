"use client";

import { useEffect, useRef, useState } from "react";

import { Icons } from "@/components/icons";

interface ShareModalProps {
  snapshotId: string;
  onClose: () => void;
}

export function ShareModal({ snapshotId, onClose }: ShareModalProps) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/snapshots/${snapshotId}/share`, { method: "POST" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: { url: string }) => {
        if (cancelled) return;
        setShareUrl(data.url);
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => { cancelled = true; };
  }, [snapshotId]);

  function handleCopy() {
    void navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Share brief"
        className="flex flex-col w-full max-w-md rounded-[8px] border overflow-hidden"
        style={{
          background: "var(--surface-1)",
          borderColor: "var(--border)",
          boxShadow: "0 24px 48px rgba(0,0,0,0.3)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2 px-4 py-3 border-b shrink-0"
          style={{ borderColor: "var(--border)" }}
        >
          <Icons.Share size={14} aria-hidden="true" style={{ color: "var(--fg-muted)" }} />
          <span
            className="flex-1 text-[13px] font-medium"
            style={{ color: "var(--fg-primary)" }}
          >
            Share with client
          </span>
          <button
            ref={closeRef}
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="inline-flex items-center justify-center size-6 rounded-[4px] shrink-0 transition-colors duration-[120ms] hover:bg-[var(--surface-3)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)] cursor-pointer"
            style={{ color: "var(--fg-tertiary)" }}
          >
            <Icons.X size={13} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-3 p-4">
          {state === "loading" && (
            <div className="flex items-center gap-2 py-2" style={{ color: "var(--fg-muted)" }}>
              <Icons.Refresh size={13} className="animate-spin" aria-hidden="true" />
              <span className="text-[12px]">Generating share link…</span>
            </div>
          )}

          {state === "error" && (
            <p className="text-[12px] py-2" style={{ color: "var(--danger)" }}>
              Failed to create share link. Please try again.
            </p>
          )}

          {state === "ready" && (
            <>
              <p className="text-[12px]" style={{ color: "var(--fg-muted)" }}>
                Anyone with this link can view and comment on the brief.
              </p>
              <div
                className="flex items-center gap-2 rounded-[6px] border px-3 py-2"
                style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
              >
                <span
                  className="flex-1 min-w-0 text-[12px] truncate font-mono"
                  style={{ color: "var(--fg-secondary)" }}
                  title={shareUrl}
                >
                  {shareUrl}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="shrink-0 flex items-center gap-1 h-[24px] px-2 rounded-[4px] text-[11px] font-medium transition-colors duration-[120ms] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)] cursor-pointer"
                  style={
                    copied
                      ? { background: "var(--success-subtle)", color: "var(--success)" }
                      : { background: "var(--accent)", color: "var(--accent-fg)" }
                  }
                >
                  {copied ? (
                    <>
                      <Icons.Check size={11} aria-hidden="true" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Icons.Copy size={11} aria-hidden="true" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
