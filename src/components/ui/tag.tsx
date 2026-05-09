import * as React from "react";

import { cn } from "@/lib/utils";

interface TagProps {
  children: React.ReactNode;
  className?: string;
}

function Tag({ children, className }: TagProps) {
  return (
    <span
      className={cn(
        "font-mono text-[10px] px-[5px] py-px rounded-[2px] bg-surface-2 text-fg-4 border border-border",
        className,
      )}
    >
      {children}
    </span>
  );
}

export { Tag };
