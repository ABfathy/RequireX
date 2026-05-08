"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
        <div className="max-w-xl rounded-[1.5rem] border border-danger/30 bg-surface p-6 shadow-[var(--shadow-panel)]">
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-danger">
            Fatal app error
          </p>
          <h1 className="mt-3 text-2xl font-semibold">
            RequireX could not recover from this error.
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {error.message || "Unknown error"}
          </p>
          <button
            className="mt-6 rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background"
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
