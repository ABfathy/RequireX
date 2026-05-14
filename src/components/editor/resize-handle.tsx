"use client";

import { useCallback } from "react";

interface ResizeHandleProps {
  side: "left" | "right";
  ariaLabel: string;
  value: number;
  min: number;
  max: number;
  onResizeStart: () => void;
  onReset: () => void;
  onKeyAdjust: (deltaPx: number) => void;
}

export function ResizeHandle({
  side,
  ariaLabel,
  value,
  min,
  max,
  onResizeStart,
  onReset,
  onKeyAdjust,
}: ResizeHandleProps) {
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      e.preventDefault();
      onResizeStart();
    },
    [onResizeStart],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const step = e.shiftKey ? 16 : 8;
      // For the right pane handle, ArrowLeft grows the pane, ArrowRight shrinks it.
      const grow = side === "right" ? -step : step;
      const shrink = side === "right" ? step : -step;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        onKeyAdjust(side === "left" ? shrink : grow);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        onKeyAdjust(side === "left" ? grow : shrink);
      } else if (e.key === "Home") {
        e.preventDefault();
        onKeyAdjust(min - value);
      } else if (e.key === "End") {
        e.preventDefault();
        onKeyAdjust(max - value);
      }
    },
    [side, value, min, max, onKeyAdjust],
  );

  // Position: hit area straddles the panel edge by 3px on each side.
  const edgeStyle =
    side === "right" ? { right: -3 as number } : { left: -3 as number };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={ariaLabel}
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      onMouseDown={handleMouseDown}
      onDoubleClick={onReset}
      onKeyDown={handleKeyDown}
      className="group absolute top-0 bottom-0 z-10 w-[6px] cursor-col-resize select-none focus-visible:outline-none"
      style={edgeStyle}
    >
      <div className="absolute top-0 bottom-0 left-1/2 w-px -translate-x-1/2 bg-transparent transition-colors duration-[120ms] group-hover:bg-[var(--accent)] group-focus-visible:bg-[var(--accent)] group-active:bg-[var(--accent)]" />
    </div>
  );
}
