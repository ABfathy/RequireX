"use client";

import { X } from "lucide-react";

import { IconBtn } from "@/components/ui/icon-btn";
import { cn } from "@/lib/utils";

export interface Revision {
  id: string;
  label: string;
  time: string;
  msg: string;
  current?: boolean;
}

interface RevisionPanelProps {
  revisions: Revision[];
  onClose: () => void;
}

function RevisionPanel({ revisions, onClose }: RevisionPanelProps) {
  return (
    <aside className="border-l border-border bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="h-10 flex items-center justify-between px-3.5 border-b border-border shrink-0">
        <span className="text-xs font-medium uppercase tracking-[0.07em] text-fg-3">
          History
        </span>
        <IconBtn title="Close" onClick={onClose}>
          <X size={14} />
        </IconBtn>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-auto p-3 px-3.5">
        <div className="flex flex-col">
          {revisions.map((rev, idx) => (
            <div key={rev.id} className="flex gap-2.5 py-1.5">
              {/* Dot column */}
              <div className="flex flex-col items-center w-3.5 shrink-0 pt-[3px]">
                <div
                  className={cn(
                    "w-2 h-2 rounded-full shrink-0",
                    rev.current
                      ? "bg-accent shadow-[0_0_0_3px_var(--accent-subtle)]"
                      : "bg-border-focus",
                  )}
                />
                {idx < revisions.length - 1 && (
                  <div className="w-px flex-1 bg-border mt-1" />
                )}
              </div>

              {/* Info column */}
              <div className="flex-1 min-w-0">
                <div
                  className={cn(
                    "font-mono text-xs font-medium",
                    rev.current ? "text-accent" : "text-fg-2",
                  )}
                >
                  {rev.label}
                </div>
                <div className="font-mono text-[10px] text-fg-4">
                  {rev.time}
                </div>
                <div className="text-[11.5px] text-fg-3 mt-0.5 leading-snug">
                  {rev.msg}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

export { RevisionPanel };
