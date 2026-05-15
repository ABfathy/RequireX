"use client";

import { useEffect, useRef, useState } from "react";

import { Icons } from "@/components/icons";
import { Kbd } from "@/components/ui/kbd";

interface Command {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  onExecute?: () => void;
  disabled?: boolean;
  disabledLabel?: string;
}

interface CommandPaletteProps {
  onClose: () => void;
  onAddSource?: () => void;
  onRegenerate?: () => void;
  onViewRevisions?: () => void;
  onExportPdf?: () => void;
  onOpenSettings?: () => void;
  onShare?: () => void;
}

function makeCommands(
  handlers: Omit<CommandPaletteProps, "onClose">,
): Command[] {
  return [
    {
      icon: <Icons.Upload size={14} />,
      label: "Add source",
      onExecute: handlers.onAddSource,
    },
    {
      icon: <Icons.Refresh size={14} />,
      label: "Re-extract requirements",
      onExecute: handlers.onRegenerate,
    },
    {
      icon: <Icons.Download size={14} />,
      label: "Export as PDF",
      onExecute: handlers.onExportPdf,
      disabled: !handlers.onExportPdf,
      disabledLabel: "generate brief first",
    },
    {
      icon: <Icons.Share size={14} />,
      label: "Share with client",
      onExecute: handlers.onShare,
      disabled: !handlers.onShare,
      disabledLabel: "generate brief first",
    },
    {
      icon: <Icons.History size={14} />,
      label: "View revision history",
      onExecute: handlers.onViewRevisions,
    },
    {
      icon: <Icons.Settings size={14} />,
      label: "Project settings",
      onExecute: handlers.onOpenSettings,
    },
  ];
}

export function CommandPalette({
  onClose,
  onAddSource,
  onRegenerate,
  onViewRevisions,
  onExportPdf,
  onOpenSettings,
  onShare,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const COMMANDS = makeCommands({
    onAddSource,
    onRegenerate,
    onViewRevisions,
    onExportPdf,
    onOpenSettings,
    onShare,
  });

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
    if (e.key === "Escape") {
      onClose();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    }
    if (e.key === "Enter") {
      const cmd = filtered[activeIdx];
      if (cmd && !cmd.disabled) {
        cmd.onExecute?.();
        onClose();
      }
    }
  }

  return (
    /* Scrim */
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] max-md:items-end max-md:pt-0"
      style={{ background: "var(--overlay)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      {/* Palette card */}
      <div
        className="w-full max-w-[540px] mx-4 rounded-[8px] max-md:mx-0 max-md:rounded-b-none max-md:rounded-t-[16px] overflow-hidden"
        style={{
          background: "var(--surface-2)",
          boxShadow: "var(--shadow-lg-val)",
          border: "1px solid var(--border-strong)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
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
        <div className="py-1 max-h-[320px] max-md:max-h-[55vh] overflow-y-auto">
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
              {filtered.map((cmd, i) => {
                const isActive = !cmd.disabled && i === activeIdx;
                return (
                  <button
                    key={cmd.label}
                    type="button"
                    disabled={cmd.disabled}
                    onClick={() => {
                      if (cmd.disabled) return;
                      cmd.onExecute?.();
                      onClose();
                    }}
                    className={[
                      "flex items-center gap-2.5 w-full h-[34px] px-3 text-[13px] text-left",
                      "transition-[background-color,color] duration-[80ms]",
                      cmd.disabled
                        ? "opacity-50 cursor-not-allowed text-[var(--fg-disabled)]"
                        : isActive
                          ? "bg-[var(--accent-subtle)] text-[var(--fg-primary)] cursor-pointer"
                          : "text-[var(--fg-secondary)] hover:bg-[var(--surface-3)] cursor-pointer",
                    ].join(" ")}
                    onMouseEnter={() => {
                      if (!cmd.disabled) setActiveIdx(i);
                    }}
                  >
                    <span
                      style={{
                        color: cmd.disabled
                          ? "var(--fg-disabled)"
                          : isActive
                            ? "var(--accent)"
                            : "var(--fg-muted)",
                        transition: "color 80ms",
                      }}
                    >
                      {cmd.icon}
                    </span>
                    <span>{cmd.label}</span>
                    {cmd.disabled && cmd.disabledLabel && (
                      <span
                        className="ml-auto text-[10px]"
                        style={{ color: "var(--fg-disabled)" }}
                      >
                        {cmd.disabledLabel}
                      </span>
                    )}
                  </button>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
