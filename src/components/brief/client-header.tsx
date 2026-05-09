"use client";

import { Check, History, Moon, Sun } from "lucide-react";
import { useState } from "react";

import { RxLogo } from "@/components/rx-logo";
import { Button } from "@/components/ui/button";
import { IconBtn } from "@/components/ui/icon-btn";

interface ClientHeaderProps {
  docName: string;
  specVersion: string;
  reqCount: number;
  needsInputCount: number;
  revOpen: boolean;
  theme: string;
  onToggleRev: () => void;
  onToggleTheme: () => void;
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
}: ClientHeaderProps) {
  const [submitted, setSubmitted] = useState(false);

  return (
    <header className="flex items-center gap-3 px-6 border-b border-border bg-background shrink-0 h-12">
      {/* Brand */}
      <div className="flex items-center gap-[7px] text-[13px] font-semibold tracking-[-0.015em] text-fg-1">
        <RxLogo size={15} className="text-accent" />
        <span>RequireX</span>
      </div>

      {/* Separator */}
      <div className="w-px h-4 bg-border" />

      {/* Doc name */}
      <span className="text-[13px] text-fg-3 font-normal">
        {docName} · {specVersion}
      </span>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Status */}
      <span className="font-mono text-[10.5px] text-fg-4">
        {reqCount} requirements · {needsInputCount} need your input
      </span>

      {/* Controls */}
      <IconBtn
        title="Revision history"
        active={revOpen}
        onClick={onToggleRev}
      >
        <History size={14} />
      </IconBtn>

      <IconBtn
        title={theme === "dark" ? "Light mode" : "Dark mode"}
        onClick={onToggleTheme}
      >
        {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
      </IconBtn>

      {/* Submit */}
      {submitted ? (
        <Button variant="secondary" size="sm">
          <Check size={12} />
          Submitted
        </Button>
      ) : (
        <Button variant="default" size="sm" onClick={() => setSubmitted(true)}>
          Submit feedback
        </Button>
      )}
    </header>
  );
}

export { ClientHeader };
