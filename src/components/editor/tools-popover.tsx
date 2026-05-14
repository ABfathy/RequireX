"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Icons } from "@/components/icons";
import { IconButton } from "@/components/ui/icon-button";

export type DiagramType =
  | "FLOWCHART"
  | "SEQUENCE"
  | "ARCHITECTURE"
  | "ACTIVITY"
  | "USER_JOURNEY";

const DIAGRAM_TYPES: {
  type: DiagramType;
  label: string;
  description: string;
  Icon: React.ComponentType<{ size?: number }>;
}[] = [
  {
    type: "FLOWCHART",
    label: "Flowchart",
    description: "Process flow & decisions",
    Icon: Icons.Flowchart,
  },
  {
    type: "SEQUENCE",
    label: "Sequence",
    description: "System interactions",
    Icon: Icons.Sequence,
  },
  {
    type: "ARCHITECTURE",
    label: "Architecture",
    description: "System components",
    Icon: Icons.Architecture,
  },
  {
    type: "ACTIVITY",
    label: "Activity",
    description: "States & transitions",
    Icon: Icons.Activity,
  },
  {
    type: "USER_JOURNEY",
    label: "User Journey",
    description: "Experience map",
    Icon: Icons.UserJourney,
  },
];

interface ToolsPopoverProps {
  disabled?: boolean;
  onSelectDiagramType: (type: DiagramType) => void;
}

export function ToolsPopover({
  disabled,
  onSelectDiagramType,
}: ToolsPopoverProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null,
  );
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  function openPopover() {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    // position panel above the trigger button, left-aligned
    setCoords({
      top: rect.top - 8, // 8px gap above trigger
      left: rect.left,
    });
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;

    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !panelRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const panel =
    coords && open
      ? createPortal(
          <div
            ref={panelRef}
            className="w-[300px] rounded-[8px] border p-2 shadow-lg"
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              transform: "translateY(-100%)",
              zIndex: 9999,
              background: "var(--surface-1)",
              borderColor: "var(--border)",
            }}
            role="dialog"
            aria-label="Tools"
          >
            <p
              className="text-[10px] font-medium uppercase tracking-wider px-1 pb-1.5"
              style={{ color: "var(--fg-muted)" }}
            >
              Generate diagram
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {DIAGRAM_TYPES.map(({ type, label, description, Icon }) => (
                <button
                  key={type}
                  type="button"
                  className="flex flex-col items-start gap-1 rounded-[6px] border p-2.5 text-left transition-colors duration-[120ms] cursor-pointer"
                  style={{ borderColor: "var(--border)" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "var(--surface-2)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "";
                  }}
                  onClick={() => {
                    onSelectDiagramType(type);
                    setOpen(false);
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <span style={{ color: "var(--fg-secondary)" }}>
                      <Icon size={13} />
                    </span>
                    <span
                      className="text-[12px] font-medium"
                      style={{ color: "var(--fg-primary)" }}
                    >
                      {label}
                    </span>
                  </div>
                  <span
                    className="text-[11px]"
                    style={{ color: "var(--fg-muted)" }}
                  >
                    {description}
                  </span>
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <IconButton
        ref={triggerRef}
        label="Tools"
        active={open}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openPopover())}
      >
        <Icons.Tools size={13} />
      </IconButton>
      {panel}
    </>
  );
}
