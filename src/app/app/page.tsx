const leftRailItems = [
  "Project navigation",
  "Session history",
  "Pinned work",
];

const inspectorItems = [
  "Sources",
  "Revisions",
  "Feedback",
  "Context chat",
];

export default function InternalWorkspacePage() {
  return (
    <main className="grid min-h-[calc(100vh-2rem)] gap-4 lg:grid-cols-[280px_minmax(0,1fr)_320px]">
      <aside className="rounded-[1.5rem] border border-border bg-surface p-5 shadow-[var(--shadow-soft)]">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Left rail
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-foreground">
          RequireX workspace
        </h1>
        <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
          {leftRailItems.map((item) => (
            <li
              key={item}
              className="rounded-xl border border-border bg-surface-2 px-3 py-2"
            >
              {item}
            </li>
          ))}
        </ul>
      </aside>

      <section className="flex min-h-[70vh] flex-col rounded-[1.75rem] border border-border bg-surface p-6 shadow-[var(--shadow-panel)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Center pane
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
              Brief-first artifact surface
            </h2>
          </div>
          <span className="rounded-full border border-border bg-surface-2 px-3 py-1 text-xs text-muted-foreground">
            Placeholder
          </span>
        </div>

        <div className="mt-8 flex-1 rounded-[1.25rem] border border-dashed border-border-strong bg-background/60 p-6">
          <p className="text-sm leading-7 text-muted-foreground">
            This is the future center brief renderer. It is intentionally empty
            in Workstream 1 so later streams can mount the structured brief,
            citations, diff review, and refinement features without refactoring
            the shell.
          </p>
        </div>

        <div className="mt-4 rounded-[1.25rem] border border-border bg-surface-2 p-4">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Bottom composer
          </p>
          <div className="mt-3 rounded-xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
            AI refinement composer placeholder
          </div>
        </div>
      </section>

      <aside className="rounded-[1.5rem] border border-border bg-surface p-5 shadow-[var(--shadow-soft)]">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Right inspector
        </p>
        <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
          {inspectorItems.map((item) => (
            <li
              key={item}
              className="rounded-xl border border-border bg-surface-2 px-3 py-2"
            >
              {item}
            </li>
          ))}
        </ul>
      </aside>
    </main>
  );
}
