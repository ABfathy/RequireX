"use client";

import { useTheme } from "next-themes";
import React, { useEffect, useRef, useState } from "react";

interface MermaidDiagramProps {
  id: string;
  code: string;
  className?: string;
  style?: React.CSSProperties;
}

export function MermaidDiagram({
  id,
  code,
  className,
  style,
}: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      setLoading(true);
      setError(null);
      const mermaid = (await import("mermaid")).default;
      mermaid.initialize({
        startOnLoad: false,
        theme: resolvedTheme === "dark" ? "dark" : "default",
        suppressErrorRendering: true,
      });

      try {
        const { svg } = await mermaid.render(`mermaid-render-${id}`, code);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(String(err));
          setLoading(false);
        }
      }
    }

    void render();
    return () => {
      cancelled = true;
    };
  }, [id, code, resolvedTheme]);

  if (error) {
    return (
      <div className={className} style={style}>
        <pre
          className="text-[11px] rounded-[6px] p-3 overflow-auto"
          style={{
            background: "color-mix(in srgb, var(--surface-2) 80%, transparent)",
            color: "var(--fg-muted)",
            fontFamily: "var(--font-mono, monospace)",
          }}
        >
          {code}
        </pre>
      </div>
    );
  }

  return (
    <div className={className} style={style}>
      {loading && (
        <div
          className="h-40 rounded-[6px] animate-pulse"
          style={{ background: "var(--surface-2)" }}
        />
      )}
      <div
        ref={containerRef}
        className="overflow-auto"
        style={{ display: loading ? "none" : undefined }}
      />
    </div>
  );
}
