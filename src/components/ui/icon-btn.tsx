import * as React from "react";

import { cn } from "@/lib/utils";

interface IconBtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  size?: number;
}

const IconBtn = React.forwardRef<HTMLButtonElement, IconBtnProps>(
  ({ className, active, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-grid place-items-center w-6 h-6 rounded-sm border-none cursor-default shrink-0",
          "transition-colors duration-fast ease-out-app",
          active
            ? "bg-surface-3 text-accent"
            : "bg-transparent text-fg-3 hover:bg-surface-2 hover:text-fg-1",
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);
IconBtn.displayName = "IconBtn";

export { IconBtn };
