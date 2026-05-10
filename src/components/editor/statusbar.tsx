"use client";

export type ExtractStatus = "idle" | "queued" | "running" | "failed";

interface StatusBarProps {
  selectedReq?: string | null;
  extractStatus?: ExtractStatus;
  sessionName?: string | null;
}

export function StatusBar({
  selectedReq,
  extractStatus = "idle",
  sessionName,
}: StatusBarProps) {
  const dotColor =
    extractStatus === "running"  ? "var(--warning)"
    : extractStatus === "queued" ? "var(--info)"
    : extractStatus === "failed" ? "var(--danger)"
    : "var(--success)";

  const statusLabel =
    extractStatus === "running"  ? "generating"
    : extractStatus === "queued" ? "queued"
    : extractStatus === "failed" ? "failed"
    : "idle";

  return (
    <div
      className="flex items-center h-[22px] px-3 gap-2 border-t shrink-0"
      style={{
        background: "var(--surface-1)",
        borderColor: "var(--border)",
        fontFamily: "var(--font-mono)",
        fontSize: 10.5,
        color: "var(--fg-tertiary)",
      }}
      aria-label="Status bar"
    >
      {/* Extract status */}
      <span
        className="size-[6px] rounded-full shrink-0"
        style={{ background: dotColor }}
        aria-hidden="true"
      />
      <span>brief: {statusLabel}</span>

      <Sep />

      {/* Session name */}
      <span style={{ color: sessionName ? "var(--fg-secondary)" : "var(--fg-disabled)" }}>
        {sessionName ?? "—"}
      </span>

      {/* Spacer */}
      <span className="flex-1" />

      {/* Selected req */}
      {selectedReq && (
        <>
          <span className="font-mono" style={{ color: "var(--accent)" }}>
            {selectedReq}
          </span>
          <Sep />
        </>
      )}

      <span>RequireX</span>
    </div>
  );
}

function Sep() {
  return (
    <span style={{ color: "var(--border-focus)", userSelect: "none" }} aria-hidden="true">·</span>
  );
}
