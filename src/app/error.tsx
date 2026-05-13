"use client";

import Link from "next/link";

import { Icons, RxLogo } from "@/components/icons";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const digest = error.digest ?? "ERR_RUNTIME";

  return (
    <>
      <style>{`
        @keyframes rx-error-pulse {
          0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--danger) 20%, transparent) }
          50%       { box-shadow: 0 0 0 12px color-mix(in srgb, var(--danger) 0%, transparent) }
        }
        @keyframes rx-fade-up {
          from { opacity: 0; transform: translateY(6px) }
          to   { opacity: 1; transform: translateY(0)   }
        }
        .rx-err-1 { animation: rx-fade-up 0.35s ease-out 0.05s both }
        .rx-err-2 { animation: rx-fade-up 0.35s ease-out 0.15s both }
        .rx-err-3 { animation: rx-fade-up 0.35s ease-out 0.25s both }
        .rx-err-4 { animation: rx-fade-up 0.35s ease-out 0.35s both }
        .rx-err-5 { animation: rx-fade-up 0.35s ease-out 0.45s both }
      `}</style>

      <main
        className="flex min-h-screen flex-col items-center justify-center px-6"
        style={{ background: "var(--background)" }}
      >
        <div
          className="w-full flex flex-col items-center"
          style={{ maxWidth: 400, gap: 24 }}
        >
          {/* Logo */}
          <div className="rx-err-1">
            <RxLogo size={24} className="text-[var(--fg-disabled)]" />
          </div>

          {/* Error icon */}
          <div className="rx-err-2" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "color-mix(in srgb, var(--danger) 10%, transparent)",
                border: "1px solid color-mix(in srgb, var(--danger) 30%, transparent)",
                animation: "rx-error-pulse 3s ease-in-out infinite",
              }}
            >
              <Icons.X size={18} style={{ color: "var(--danger)" }} />
            </div>

            {/* Digest code */}
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.08em",
                color: "var(--fg-disabled)",
                padding: "2px 8px",
                border: "1px solid var(--border)",
                borderRadius: 4,
                background: "var(--surface-1)",
              }}
            >
              {digest}
            </span>
          </div>

          {/* Text */}
          <div className="rx-err-3 flex flex-col items-center" style={{ gap: 8, textAlign: "center" }}>
            <h1
              style={{
                fontSize: 17,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: "var(--fg-primary)",
              }}
            >
              Something went wrong
            </h1>
            <p
              style={{
                fontSize: 13,
                lineHeight: 1.6,
                color: "var(--fg-muted)",
                maxWidth: 320,
              }}
            >
              {error.message?.slice(0, 200) ?? "An unexpected error occurred while rendering this page."}
            </p>
          </div>

          {/* Divider */}
          <div
            className="rx-err-4 w-full"
            style={{ height: 1, background: "var(--border)" }}
          />

          {/* Actions */}
          <div className="rx-err-5 flex items-center" style={{ gap: 8 }}>
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 h-[32px] px-4 rounded-[6px] text-[12px] font-medium transition-colors duration-[120ms] hover:opacity-90 active:scale-[0.97] cursor-pointer"
              style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
            >
              <Icons.Refresh size={12} />
              Try again
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 h-[32px] px-4 rounded-[6px] text-[12px] font-medium transition-colors duration-[120ms] hover:bg-[var(--surface-2)] cursor-pointer"
              style={{
                color: "var(--fg-secondary)",
                border: "1px solid var(--border-strong)",
              }}
            >
              Go home
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
