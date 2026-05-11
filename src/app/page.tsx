import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";

import { Icons, RxLogo } from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main
      className="relative min-h-screen flex flex-col items-center justify-center px-6 py-16"
      style={{ background: "var(--background)" }}
    >
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      {/* Center card */}
      <div className="w-full max-w-[480px]">
        {/* Brand */}
        <div className="flex items-center gap-2.5 mb-8">
          <RxLogo size={22} className="text-[var(--accent)]" />
          <span
            className="text-[17px] font-semibold tracking-[-0.01em]"
            style={{ color: "var(--fg-primary)" }}
          >
            RequireX
          </span>
        </div>

        {/* Headline */}
        <h1
          className="text-[33px] font-semibold leading-[1.15] tracking-[-0.02em] mb-4 text-balance"
          style={{ color: "var(--fg-primary)" }}
        >
          Requirements engineering,{" "}
          <span style={{ color: "var(--accent)" }}>without the chaos.</span>
        </h1>

        <p
          className="text-[15px] leading-[1.65] mb-8 text-pretty"
          style={{ color: "var(--fg-tertiary)" }}
        >
          Ingest PDFs, transcripts, tickets, and code. RequireX extracts,
          structures, and traces every requirement, then shares a clean brief
          your clients can actually review.
        </p>

        {/* Auth CTAs */}
        <div className="flex items-center gap-2 mb-10">
          <Show when="signed-out">
            <SignUpButton mode="redirect">
              <Button
                className="inline-flex items-center justify-center h-[34px] px-4 rounded-[6px] text-[13px] font-medium transition-colors duration-[120ms] hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--background)] cursor-pointer"
                style={{
                  background: "var(--accent)",
                  color: "var(--accent-fg)",
                  touchAction: "manipulation",
                }}
              >
                Get Started
              </Button>
            </SignUpButton>
            <SignInButton mode="redirect">
              <Button
                className="inline-flex items-center justify-center h-[34px] px-4 rounded-[6px] text-[13px] font-medium transition-colors duration-[120ms] border hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--background)] cursor-pointer"
                style={{
                  background: "transparent",
                  color: "var(--fg-secondary)",
                  borderColor: "var(--border-strong)",
                  touchAction: "manipulation",
                }}
              >
                Sign In
              </Button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <Link
              href="/app"
              className="inline-flex items-center justify-center h-[34px] px-4 rounded-[6px] text-[13px] font-medium transition-colors duration-[120ms] hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--background)]"
              style={{
                background: "var(--accent)",
                color: "var(--accent-fg)",
              }}
            >
              Open Workspace
            </Link>
            <UserButton />
          </Show>
        </div>

        {/* Divider */}
        <div className="h-px mb-8" style={{ background: "var(--border)" }} />

        {/* Nav cards */}
        <div className="grid grid-cols-2 gap-3">
          <NavCard
            href="/app"
            label="Internal Workspace"
            description="Editor, chat, source ingestion, revision history."
            prefetch={false}
          />
          <NavCard
            href="/brief/demo-share-token"
            label="Client Brief View"
            description="Shareable review link — comment, answer, approve."
          />
        </div>
      </div>
    </main>
  );
}

function NavCard({
  href,
  label,
  description,
  prefetch,
}: {
  href: string;
  label: string;
  description: string;
  prefetch?: boolean;
}) {
  return (
    <Link
      href={href}
      prefetch={prefetch}
      className="block p-4 rounded-[8px] border transition-colors duration-[120ms] group hover:bg-[var(--surface-2)] hover:border-[var(--border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
      style={{
        background: "var(--surface-1)",
        borderColor: "var(--border)",
      }}
    >
      <div className="flex items-start justify-between gap-1 mb-1">
        <span
          className="text-[12px] font-medium"
          style={{ color: "var(--fg-secondary)" }}
        >
          {label}
        </span>
        <Icons.ArrowRight
          size={11}
          aria-hidden="true"
          className="shrink-0 mt-px transition-transform duration-[120ms] group-hover:translate-x-0.5"
          style={{ color: "var(--fg-muted)" }}
        />
      </div>
      <div
        className="text-[11px] leading-[1.5]"
        style={{ color: "var(--fg-muted)" }}
      >
        {description}
      </div>
    </Link>
  );
}
