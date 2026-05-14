"use client";

import { useEffect, useRef, useState } from "react";

import { Icons } from "@/components/icons";
import { Kbd } from "@/components/ui/kbd";

import type { ProjectListItem } from "./project-sidebar";

function relativeTime(dateStr: string): string {
  try {
    const diffMinutes = Math.round(
      (new Date(dateStr).getTime() - Date.now()) / 60_000,
    );
    if (Math.abs(diffMinutes) >= 60 * 24) {
      const days = Math.round(diffMinutes / (60 * 24));
      return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
        days,
        "day",
      );
    }
    if (Math.abs(diffMinutes) >= 60) {
      const hours = Math.round(diffMinutes / 60);
      return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
        hours,
        "hour",
      );
    }
    return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
      diffMinutes,
      "minute",
    );
  } catch {
    return "";
  }
}

interface ProjectSearchPaletteProps {
  projects: ProjectListItem[];
  activeProjectId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}

export function ProjectSearchPalette({
  projects,
  activeProjectId,
  onSelect,
  onClose,
}: ProjectSearchPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = projects.filter(
    (p) =>
      !query ||
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.clientName.toLowerCase().includes(query.toLowerCase()),
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
      const proj = filtered[activeIdx];
      if (proj) {
        onSelect(proj.id);
        onClose();
      }
    }
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
        className="w-[480px] rounded-[8px] overflow-hidden"
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
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Switch project…"
            className="flex-1 bg-transparent outline-none text-[13px]"
            style={{ color: "var(--fg-primary)" }}
          />
          <Kbd>Esc</Kbd>
        </div>

        {/* Project list */}
        <div className="py-1 max-h-[320px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div
              className="py-8 text-center text-[12px]"
              style={{ color: "var(--fg-muted)" }}
            >
              No projects found
            </div>
          ) : (
            <>
              <div
                className="px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em]"
                style={{ color: "var(--fg-muted)" }}
              >
                Projects
              </div>
              {filtered.map((p, i) => {
                const isActive = i === activeIdx;
                const isCurrent = p.id === activeProjectId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onSelect(p.id);
                      onClose();
                    }}
                    onMouseEnter={() => setActiveIdx(i)}
                    className="flex items-center gap-2.5 w-full h-[38px] px-3.5 text-left transition-colors duration-[80ms] cursor-pointer"
                    style={{
                      background: isActive
                        ? "var(--accent-subtle)"
                        : "transparent",
                    }}
                  >
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="text-[12px] truncate"
                          style={{
                            color: isActive
                              ? "var(--fg-primary)"
                              : "var(--fg-secondary)",
                            fontWeight: isCurrent ? 500 : 400,
                          }}
                        >
                          {p.name}
                        </span>
                        {isCurrent && (
                          <span
                            className="text-[9px] font-semibold uppercase tracking-[0.06em] px-1 py-px rounded-[3px] shrink-0"
                            style={{
                              background:
                                "color-mix(in srgb, var(--accent) 15%, transparent)",
                              color: "var(--accent)",
                            }}
                          >
                            current
                          </span>
                        )}
                      </div>
                      <span
                        className="text-[10px] truncate tabular-nums"
                        style={{
                          color: "var(--fg-disabled)",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {p.clientName}
                        {p.clientName && " · "}
                        {relativeTime(p.updatedAt)}
                      </span>
                    </div>
                    {isActive && (
                      <Icons.ArrowRight
                        size={12}
                        aria-hidden="true"
                        style={{ color: "var(--accent)", flexShrink: 0 }}
                      />
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
