"use client";

import { useEffect, useRef, useState } from "react";

import { Icons } from "@/components/icons";
import { Kbd } from "@/components/ui/kbd";

interface Command {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
}

const COMMANDS: Command[] = [
  { icon: <Icons.Upload size={14} />, label: "Add source" },
  { icon: <Icons.Refresh size={14} />, label: "Re-extract requirements" },
  { icon: <Icons.Download size={14} />, label: "Export as PDF" },
  { icon: <Icons.Share size={14} />, label: "Share with client" },
  { icon: <Icons.History size={14} />, label: "View revision history" },
  { icon: <Icons.Settings size={14} />, label: "Project settings" },
];

interface CommandPaletteProps {
  onClose: () => void;
}

export function CommandPalette({ onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = COMMANDS.filter(
    (cmd) => !query || cmd.label.toLowerCase().includes(query.toLowerCase()),
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    setActiveIdx(0);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    }
    if (e.key === "Enter") { onClose(); }
  }

  return (
    /* Scrim */
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
      style={{ background: "var(--overlay)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      {/* Palette card */}
      <div
        className="w-[540px] rounded-[8px] overflow-hidden"
        style={{
          background: "var(--surface-2)",
          boxShadow: "var(--shadow-lg-val)",
          border: "1px solid var(--border-strong)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input row */}
        <div
          className="flex items-center gap-2.5 h-11 px-3.5 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <Icons.Search size={14} className="text-[var(--fg-muted)] shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={handleQueryChange}
            onKeyDown={handleKey}
            placeholder="Search commands…"
            className="flex-1 bg-transparent outline-none text-[13px]"
            style={{ color: "var(--fg-primary)" }}
          />
          <Kbd>Esc</Kbd>
        </div>

        {/* Command list */}
        <div className="py-1 max-h-[320px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div
              className="py-8 text-center text-[12px]"
              style={{ color: "var(--fg-muted)" }}
            >
              No commands found
            </div>
          ) : (
            <>
              <div
                className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em]"
                style={{ color: "var(--fg-muted)" }}
              >
                Commands
              </div>
              {filtered.map((cmd, i) => (
                <button
                  key={cmd.label}
                  type="button"
                  onClick={onClose}
                  className="flex items-center gap-2.5 w-full h-[34px] px-3 text-[13px] transition-colors duration-[80ms] cursor-pointer text-left"
                  style={{
                    color: i === activeIdx ? "var(--fg-primary)" : "var(--fg-secondary)",
                    background: i === activeIdx ? "var(--accent-subtle)" : "transparent",
                  }}
                  onMouseEnter={() => setActiveIdx(i)}
                >
                  <span style={{ color: i === activeIdx ? "var(--accent)" : "var(--fg-muted)" }}>
                    {cmd.icon}
                  </span>
                  <span>{cmd.label}</span>
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
