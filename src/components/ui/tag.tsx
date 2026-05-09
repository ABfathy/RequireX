import { cn } from "@/lib/utils";

interface TagProps {
  children: React.ReactNode;
  className?: string;
}

export function Tag({ children, className }: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 h-[18px] rounded-[2px] font-mono text-[10px] leading-none",
        "bg-[var(--surface-2)] border border-[var(--border)] text-[var(--fg-tertiary)]",
        className,
      )}
    >
      {children}
    </span>
  );
}
