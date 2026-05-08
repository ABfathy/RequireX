import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-lg rounded-[1.5rem] border border-border bg-surface p-6 shadow-[var(--shadow-panel)]">
        <p className="text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground">
          404
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-foreground">
          This route does not exist.
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          The requested page is not part of the current RequireX scaffold.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background"
        >
          Back to scaffold home
        </Link>
      </div>
    </main>
  );
}
