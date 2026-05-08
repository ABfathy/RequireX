type PublicBriefPageProps = {
  params: Promise<{
    shareToken: string;
  }>;
};

export default async function PublicBriefPage({
  params,
}: PublicBriefPageProps) {
  const { shareToken } = await params;

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-[1.75rem] border border-border bg-surface p-6 shadow-[var(--shadow-panel)] sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Public brief review
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
              Share token: {shareToken}
            </h1>
          </div>
          <span className="rounded-full border border-border bg-surface-2 px-3 py-1 text-xs text-muted-foreground">
            Placeholder route
          </span>
        </div>

        <div className="mt-8 space-y-5">
          {[
            "Summary",
            "Goals and success criteria",
            "Ambiguities",
            "Follow-up questions",
          ].map((section) => (
            <section
              key={section}
              className="rounded-[1.25rem] border border-border bg-background/70 p-5"
            >
              <h2 className="text-lg font-semibold text-foreground">{section}</h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                This placeholder establishes the public brief route. The real
                implementation will replace this with a structured brief,
                inline-highlight comment support, and follow-up answer controls.
              </p>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
