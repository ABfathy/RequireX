import { cn } from "@/lib/utils";

interface KbdProps {
  children: React.ReactNode;
  className?: string;
}

export function Kbd({ children, className }: KbdProps) {
  return (
    <kbd
      className={cn(
        "inline-flex items-center px-1.5 h-[18px] rounded-[3px] font-mono text-[10px] leading-none",
        "bg-[var(--surface-3)] border border-[var(--border-strong)] text-[var(--fg-muted)]",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
