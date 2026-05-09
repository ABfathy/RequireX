"use client";

import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        className="flex min-h-screen items-center justify-center px-6"
        style={{ background: "var(--background)", color: "var(--fg-primary)" }}
      >
        <div
          className="max-w-xl w-full rounded-[8px] border p-6"
          style={{
            background: "var(--surface-1)",
            borderColor: "var(--danger-subtle)",
          }}
        >
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.08em]"
            style={{ color: "var(--danger)" }}
          >
            Fatal app error
          </p>
          <h1
            className="mt-3 text-[21px] font-semibold tracking-[-0.02em]"
            style={{ color: "var(--fg-primary)" }}
          >
            RequireX could not recover from this error.
          </h1>
          <p
            className="mt-3 text-[13px] leading-[1.65]"
            style={{ color: "var(--fg-tertiary)" }}
          >
            {error.message ?? "Unknown error"}
          </p>
          <button
            className="mt-6 inline-flex items-center justify-center h-[34px] px-4 rounded-[6px] text-[13px] font-medium transition-colors duration-[120ms]"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
            onClick={reset}
            type="button"
          >
            Retry
          </button>
        </div>
      </body>
    </html>
  );
}
