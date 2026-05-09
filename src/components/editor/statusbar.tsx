"use client";

interface StatusBarProps {
  selectedReq?: string | null;
  extractStatus?: "idle" | "running" | "error";
  linkedCount?: number;
  totalCount?: number;
}

export function StatusBar({
  selectedReq,
  extractStatus = "idle",
  linkedCount = 0,
  totalCount = 0,
}: StatusBarProps) {
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
    >
      {/* Extract status */}
      <span
        className="size-[6px] rounded-full shrink-0"
        style={{
          background: extractStatus === "running"
            ? "var(--warning)"
            : extractStatus === "error"
            ? "var(--danger)"
            : "var(--success)",
        }}
      />
      <span>extract: {extractStatus}</span>

      <Sep />

      {/* Linked count */}
      <span style={{ color: totalCount > 0 ? "var(--success)" : "var(--fg-muted)" }}>
        {linkedCount} / {totalCount} linked
      </span>

      {/* Spacer */}
      <span className="flex-1" />

      {/* Selected req */}
      {selectedReq && (
        <>
          <span
            className="font-mono"
            style={{ color: "var(--accent)" }}
          >
            {selectedReq}
          </span>
          <Sep />
        </>
      )}

      <span>main</span>
      <Sep />
      <span>UTF-8</span>
      <Sep />
      <span>spec/v2.1</span>
    </div>
  );
}

function Sep() {
  return (
    <span style={{ color: "var(--border-focus)", userSelect: "none" }}>·</span>
  );
}
