"use client";

import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const digest = error.digest ?? "ERR_FATAL";

  return (
    <html
      lang="en"
      data-theme="dark"
      style={{ colorScheme: "dark", background: "#141517" }}
    >
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          background: "var(--background)",
          color: "var(--fg-primary)",
          fontFamily: "Geist, system-ui, sans-serif",
        }}
      >
        <style>{`
          @keyframes rx-error-pulse {
            0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--danger) 20%, transparent) }
            50%       { box-shadow: 0 0 0 12px color-mix(in srgb, var(--danger) 0%, transparent) }
          }
        `}</style>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 20,
            maxWidth: 360,
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "color-mix(in srgb, var(--danger) 10%, transparent)",
              border:
                "1px solid color-mix(in srgb, var(--danger) 30%, transparent)",
              animation: "rx-error-pulse 3s ease-in-out infinite",
              fontSize: 20,
              color: "var(--danger)",
            }}
          >
            ✕
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span
              style={{
                fontFamily: "ui-monospace, monospace",
                fontSize: 10,
                letterSpacing: "0.08em",
                color: "var(--fg-disabled)",
                textTransform: "uppercase",
              }}
            >
              {digest}
            </span>
            <h1
              style={{
                margin: 0,
                fontSize: 17,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: "var(--fg-primary)",
              }}
            >
              RequireX encountered a fatal error
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                lineHeight: 1.65,
                color: "var(--fg-muted)",
              }}
            >
              {error.message?.slice(0, 200) ??
                "The application could not recover. Please try again."}
            </p>
          </div>

          <button
            type="button"
            onClick={reset}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              height: 32,
              padding: "0 16px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 500,
              background: "var(--accent)",
              color: "var(--accent-fg)",
              border: "none",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
