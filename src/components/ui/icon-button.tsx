import { type ButtonHTMLAttributes, forwardRef } from "react";

import { cn } from "@/lib/utils";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  label: string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton({ active, label, className, children, ...props }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        title={label}
        className={cn(
          "inline-flex items-center justify-center size-6 rounded-[4px] transition-colors duration-[120ms] cursor-pointer",
          "text-[var(--fg-tertiary)] hover:bg-[var(--surface-3)] hover:text-[var(--fg-secondary)]",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)]",
          active && "bg-[var(--surface-3)] text-[var(--accent)]",
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);
