import { UserButton } from "@clerk/nextjs";

import { requireInternalAuth } from "@/server/auth";

export default async function InternalAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authContext = await requireInternalAuth();

  return (
    <div className="min-h-screen bg-transparent">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col px-4 py-4 sm:px-5 lg:px-6">
        <header className="mb-4 flex items-center justify-between rounded-[1.25rem] border border-border bg-surface px-4 py-3 shadow-[var(--shadow-soft)]">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Internal workspace
            </p>
            <p className="mt-1 text-sm text-foreground">
              Protected session {authContext.clerkUserId}
            </p>
          </div>
          <UserButton />
        </header>
        {children}
      </div>
    </div>
  );
}
