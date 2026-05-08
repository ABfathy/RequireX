"use client";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-xl rounded-[1.5rem] border border-danger/30 bg-surface p-6 shadow-[var(--shadow-panel)]">
        <p className="text-sm font-medium uppercase tracking-[0.16em] text-danger">
          Unexpected app error
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-foreground">
          Something failed while rendering the app.
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
    </main>
  );
}
