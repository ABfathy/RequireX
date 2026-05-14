import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-[5px] whitespace-nowrap font-medium cursor-default select-none transition-colors duration-fast ease-out-app disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring",
  {
    variants: {
      variant: {
        default:
          "bg-accent text-accent-fg border border-transparent hover:brightness-110",
        secondary:
          "bg-surface-2 text-fg-1 border border-border-strong hover:bg-surface-3",
        ghost:
          "bg-transparent text-fg-2 border border-transparent hover:bg-surface-2 hover:text-fg-1",
        danger:
          "bg-transparent text-danger border border-border-strong hover:bg-danger-subtle",
        outline:
          "border border-border bg-transparent text-fg-1 hover:bg-surface-2",
      },
      size: {
        default: "h-[26px] px-[11px] text-[12.5px] rounded-md",
        sm: "h-[22px] px-2 text-[11.5px] rounded-sm",
        lg: "h-[30px] px-[14px] text-[13px] rounded-md",
        icon: "h-6 w-6 rounded-sm",
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
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants>) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
