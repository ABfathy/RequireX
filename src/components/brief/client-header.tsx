"use client";

import { Check, History, Moon, Sun } from "lucide-react";
import Link from "next/link";

import { RxLogo } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { IconBtn } from "@/components/ui/icon-btn";

interface ClientHeaderProps {
  docName: string;
  specVersion: string;
  reqCount: number;
  needsInputCount: number;
  revOpen: boolean;
  theme: "dark" | "light" | null;
  onToggleRev: () => void;
  onToggleTheme: () => void;
  isConfirming?: boolean;
  isConfirmed?: boolean;
  onSubmitConfirmation?: () => void;
}

function ClientHeader({
  docName,
  specVersion,
  reqCount,
  needsInputCount,
  revOpen,
  theme,
  onToggleRev,
  onToggleTheme,
  isConfirming,
  isConfirmed,
  onSubmitConfirmation,
}: ClientHeaderProps) {
  return (
    <header className="flex items-center gap-2 sm:gap-3 px-3 sm:px-6 border-b border-border bg-background shrink-0 h-12 min-w-0">
      {/* Brand — links back to landing page */}
      <Link
        href="/"
        className="flex items-center gap-[7px] text-[13px] font-semibold tracking-[-0.015em] text-fg-1 shrink-0 rounded-[4px] transition-colors duration-[120ms] hover:opacity-80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
        aria-label="RequireX — go to home"
      >
        <RxLogo size={20} className="text-accent" />
        <span className="hidden sm:inline" translate="no">
          RequireX
        </span>
      </Link>

      {/* Separator — desktop only */}
      <div className="hidden sm:block w-px h-4 bg-border shrink-0" />

      {/* Doc name — truncates on small screens */}
      <div className="flex items-center gap-1.5 min-w-0 flex-1 sm:flex-none">
        <span className="text-[13px] text-fg-3 font-normal truncate min-w-0">
          {docName}
        </span>
        <span className="text-fg-4 text-[13px] shrink-0 hidden xs:inline">
          ·
        </span>
        <span className="text-[13px] text-fg-4 font-mono shrink-0 hidden xs:inline">
          {specVersion}
        </span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Req count — hidden on mobile */}
      <span className="hidden md:block font-mono text-[10.5px] text-fg-4 shrink-0">
        {needsInputCount === 0
          ? "All input collected"
          : `${reqCount} req · ${needsInputCount} need input`}
      </span>

      {/* Controls */}
      <IconBtn
        aria-label="Revision history"
        aria-pressed={revOpen}
        active={revOpen}
        onClick={onToggleRev}
      >
        <History size={14} />
      </IconBtn>

      <IconBtn
        aria-label={
          theme === null
            ? "Toggle theme"
            : theme === "dark"
              ? "Switch to light mode"
              : "Switch to dark mode"
        }
        onClick={onToggleTheme}
        suppressHydrationWarning
      >
        {theme === null ? (
          <span aria-hidden="true" style={{ width: 14, height: 14 }} />
        ) : theme === "dark" ? (
          <Sun size={14} />
        ) : (
          <Moon size={14} />
        )}
      </IconBtn>

      {/* Submit */}
      {isConfirmed ? (
        <Button variant="secondary" size="sm" className="shrink-0" disabled>
          <Check size={12} aria-hidden="true" />
          <span className="hidden sm:inline">Submitted</span>
        </Button>
      ) : (
        <Button
          variant="default"
          size="sm"
          className="shrink-0"
          disabled={isConfirming}
          onClick={onSubmitConfirmation}
        >
          {isConfirming ? (
            <>
              <span className="sm:hidden">...</span>
              <span className="hidden sm:inline">Submitting...</span>
            </>
          ) : (
            <>
              <span className="sm:hidden">Submit</span>
              <span className="hidden sm:inline">Submit feedback</span>
            </>
          )}
        </Button>
      )}
    </header>
  );
}

export { ClientHeader };
