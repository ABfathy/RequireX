import * as React from "react";

import { cn } from "@/lib/utils";

type PillTone = "success" | "info" | "warning" | "danger" | "neutral";

const toneStyles: Record<PillTone, string> = {
  success:
    "bg-success-subtle text-[#b8d6bd] [.dark_&]:text-[#b8d6bd] [[data-theme='light']_&]:text-[#2e6636]",
  info: "bg-info-subtle text-[#b4c8da] [[data-theme='light']_&]:text-[#1f4d6e]",
  warning: "bg-warning-subtle text-[#e8caa1]",
  danger:
    "bg-danger-subtle text-[#e0a9a3] [[data-theme='light']_&]:text-[#7a2e28]",
  neutral: "bg-surface-2 text-fg-3 border border-border",
};

const dotStyles: Record<PillTone, string> = {
  success: "bg-success",
  info: "bg-info",
  warning: "bg-warning",
  danger: "bg-danger",
  neutral: "bg-fg-4",
};

interface PillProps {
  tone?: PillTone;
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}

function Pill({
  tone = "neutral",
  dot = true,
  children,
  className,
}: PillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-[5px] h-[18px] px-[7px] text-[10.5px] font-medium rounded-sm whitespace-nowrap",
        toneStyles[tone],
        className,
      )}
    >
      {dot && (
        <span
          className={cn(
            "w-[5px] h-[5px] rounded-full shrink-0",
            dotStyles[tone],
          )}
        />
      )}
      {children}
    </span>
  );
}

export { Pill };
export type { PillTone };
