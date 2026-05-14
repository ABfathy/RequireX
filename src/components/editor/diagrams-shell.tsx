"use client";

import { MermaidDiagram } from "@/components/diagram/mermaid-diagram";
import { Icons } from "@/components/icons";

export interface DiagramItem {
  id: string;
  snapshotId: string;
  diagramType:
    | "FLOWCHART"
    | "SEQUENCE"
    | "ARCHITECTURE"
    | "ACTIVITY"
    | "USER_JOURNEY";
  title: string;
  mermaidCode: string;
  description?: string | null;
  createdAt: string;
}

const DIAGRAM_TYPE_LABELS: Record<DiagramItem["diagramType"], string> = {
  FLOWCHART: "Flowchart",
  SEQUENCE: "Sequence",
  ARCHITECTURE: "Architecture",
  ACTIVITY: "Activity",
  USER_JOURNEY: "User Journey",
};

const DIAGRAM_TYPE_ICONS: Record<
  DiagramItem["diagramType"],
  React.ComponentType<{ size?: number }>
> = {
  FLOWCHART: Icons.Flowchart,
  SEQUENCE: Icons.Sequence,
  ARCHITECTURE: Icons.Architecture,
  ACTIVITY: Icons.Activity,
  USER_JOURNEY: Icons.UserJourney,
};

function relativeTime(dateStr: string): string {
  try {
    const diffMs = new Date(dateStr).getTime() - Date.now();
    const diffMin = Math.round(diffMs / 60_000);
    const fmt = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
    const absMin = Math.abs(diffMin);
    if (absMin < 60) return fmt.format(diffMin, "minute");
    const diffHr = Math.round(diffMin / 60);
    if (Math.abs(diffHr) < 24) return fmt.format(diffHr, "hour");
    return fmt.format(Math.round(diffHr / 24), "day");
  } catch {
    return "";
  }
}

interface DiagramsShellProps {
  diagrams: DiagramItem[];
  loading?: boolean;
}

export function DiagramsShell({ diagrams, loading }: DiagramsShellProps) {
  if (loading) {
    return (
      <div className="flex flex-col gap-4 px-4 py-3">
        {[0, 1].map((i) => (
          <div key={i} className="flex flex-col gap-2">
            <div
              className="h-4 w-2/3 rounded-[4px] animate-pulse"
              style={{ background: "var(--surface-2)" }}
            />
            <div
              className="h-32 rounded-[6px] animate-pulse"
              style={{ background: "var(--surface-2)" }}
            />
          </div>
        ))}
      </div>
    );
  }

  if (diagrams.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center"
        style={{ color: "var(--fg-muted)" }}
      >
        <Icons.Tools size={20} aria-hidden="true" />
        <p className="text-[12px] leading-relaxed">
          No diagrams yet. Select a diagram type from the Tools menu in the chat
          input to generate one.
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col divide-y"
      style={{ borderColor: "var(--border)" }}
    >
      {diagrams.map((diagram) => {
        const Icon = DIAGRAM_TYPE_ICONS[diagram.diagramType];
        return (
          <div key={diagram.id} className="flex flex-col gap-2 px-4 py-3">
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center gap-1 h-[18px] px-[7px] text-[10.5px] font-medium rounded-sm whitespace-nowrap border"
                style={{
                  background: "var(--surface-2)",
                  color: "var(--fg-tertiary)",
                  borderColor: "var(--border)",
                }}
              >
                <Icon size={10} aria-hidden="true" />
                {DIAGRAM_TYPE_LABELS[diagram.diagramType]}
              </span>
              <span
                className="text-[13px] font-medium min-w-0 truncate"
                style={{ color: "var(--fg-primary)" }}
              >
                {diagram.title}
              </span>
              <span
                className="ml-auto shrink-0 text-[11px]"
                style={{ color: "var(--fg-muted)" }}
              >
                {relativeTime(diagram.createdAt)}
              </span>
            </div>
            {diagram.description && (
              <p className="text-[11px]" style={{ color: "var(--fg-muted)" }}>
                {diagram.description}
              </p>
            )}
            <MermaidDiagram
              id={diagram.id}
              code={diagram.mermaidCode}
              className="rounded-[6px] border overflow-auto"
              style={{ borderColor: "var(--border)" }}
            />
          </div>
        );
      })}
    </div>
  );
}
