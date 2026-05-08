import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

const links = [
  {
    href: "/app",
    label: "Open Internal Workspace",
    description: "Placeholder shell for the signed-in team workflow.",
  },
  {
    href: "/brief/demo-share-token",
    label: "Open Public Brief View",
    description: "Placeholder client-facing review surface.",
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-16 sm:px-10 lg:px-12">
      <div className="max-w-3xl rounded-[2rem] border border-border/80 bg-surface/90 p-8 shadow-[var(--shadow-panel)] backdrop-blur sm:p-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center rounded-full border border-border bg-surface-2 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            RequireX scaffold
          </div>
          <div className="flex items-center gap-2">
            <Show when="signed-out">
              <SignInButton mode="redirect">
                <button className={buttonVariants({ variant: "outline" })}>
                  Sign in
                </button>
              </SignInButton>
              <SignUpButton mode="redirect">
                <button className={buttonVariants()}>
                  Sign up
                </button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <UserButton />
            </Show>
          </div>
        </div>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Desktop-first AI intake and brief generation for messy client inputs.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
          This root route is intentionally minimal. The landing page is optional
          polish later. For now, it points the team toward the two primary
          surfaces that matter in the scaffold: the internal workspace and the
          public brief review page.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {links.map((link) => (
            <div
              key={link.href}
              className="group rounded-[1.5rem] border border-border bg-background/85 p-5 shadow-[var(--shadow-soft)] transition-colors hover:border-accent/40 hover:bg-white"
            >
              <div className="text-sm font-medium text-muted-foreground">
                Placeholder route
              </div>
              <div className="mt-2 text-xl font-semibold text-foreground">
                {link.label}
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {link.description}
              </p>
              <Link
                href={link.href}
                prefetch={link.href.startsWith("/app") ? false : undefined}
                className={`${buttonVariants()} mt-5`}
              >
                Open route
              </Link>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
