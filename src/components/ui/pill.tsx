import { cn } from "@/lib/utils";

type Tone = "success" | "info" | "warning" | "danger" | "neutral";

interface PillProps {
  tone?: Tone;
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}

const toneStyles: Record<Tone, { wrap: string; dot: string }> = {
  success: {
    wrap: "bg-[var(--success-subtle)] text-[var(--success)]",
    dot: "bg-[var(--success)]",
  },
  info: {
    wrap: "bg-[var(--info-subtle)] text-[var(--info)]",
    dot: "bg-[var(--info)]",
  },
  warning: {
    wrap: "bg-[var(--warning-subtle)] text-[var(--warning)]",
    dot: "bg-[var(--warning)]",
  },
  danger: {
    wrap: "bg-[var(--danger-subtle)] text-[var(--danger)]",
    dot: "bg-[var(--danger)]",
  },
  neutral: {
    wrap: "bg-[var(--surface-3)] text-[var(--fg-tertiary)]",
    dot: "bg-[var(--fg-muted)]",
  },
};

export function Pill({ tone = "neutral", dot = true, children, className }: PillProps) {
  const styles = toneStyles[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 h-[18px] rounded-full text-[11px] font-medium leading-none",
        styles.wrap,
        className,
      )}
    >
      {dot && (
        <span
          className={cn("size-[5px] rounded-full shrink-0", styles.dot)}
        />
      )}
      {children}
    </span>
  );
}
