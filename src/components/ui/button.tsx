import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[6px] text-[13px] font-medium transition-colors duration-[120ms] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--accent)] text-[var(--accent-fg)] hover:opacity-90",
        secondary:
          "border border-[var(--border-strong)] bg-[var(--surface-2)] text-[var(--fg-secondary)] hover:bg-[var(--surface-3)]",
        ghost:
          "text-[var(--fg-secondary)] hover:bg-[var(--surface-2)]",
        outline:
          "border border-[var(--border-strong)] bg-transparent text-[var(--fg-secondary)] hover:bg-[var(--surface-2)]",
      },
      size: {
        default: "h-[34px] px-4",
        sm: "h-[26px] px-2.5 text-[12px]",
        lg: "h-10 px-5",
        icon: "h-[34px] w-[34px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants>) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
