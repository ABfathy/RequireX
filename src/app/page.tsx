import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";

import { RxLogo } from "@/components/icons";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16"
      style={{ background: "var(--background)" }}>

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
          className="text-[33px] font-semibold leading-[1.15] tracking-[-0.02em] mb-4"
          style={{ color: "var(--fg-primary)" }}
        >
          Requirements engineering,{" "}
          <span style={{ color: "var(--accent)" }}>without the chaos.</span>
        </h1>

        <p
          className="text-[15px] leading-[1.65] mb-8"
          style={{ color: "var(--fg-tertiary)" }}
        >
          Ingest PDFs, transcripts, tickets, and code. RequireX extracts,
          structures, and traces every requirement — then shares a clean brief
          your clients can actually review.
        </p>

        {/* Auth CTAs */}
        <div className="flex items-center gap-2 mb-10">
          <Show when="signed-out">
            <SignUpButton mode="redirect">
              <button
                className="inline-flex items-center justify-center h-[34px] px-4 rounded-[6px] text-[13px] font-medium transition-colors duration-[120ms] cursor-pointer"
                style={{
                  background: "var(--accent)",
                  color: "var(--accent-fg)",
                }}
              >
                Get started
              </button>
            </SignUpButton>
            <SignInButton mode="redirect">
              <button
                className="inline-flex items-center justify-center h-[34px] px-4 rounded-[6px] text-[13px] font-medium transition-colors duration-[120ms] border cursor-pointer"
                style={{
                  background: "transparent",
                  color: "var(--fg-secondary)",
                  borderColor: "var(--border-strong)",
                }}
              >
                Sign in
              </button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <Link
              href="/app"
              className="inline-flex items-center justify-center h-[34px] px-4 rounded-[6px] text-[13px] font-medium transition-colors duration-[120ms]"
              style={{
                background: "var(--accent)",
                color: "var(--accent-fg)",
              }}
            >
              Open workspace
            </Link>
            <UserButton />
          </Show>
        </div>

        {/* Divider */}
        <div
          className="h-px mb-8"
          style={{ background: "var(--border)" }}
        />

        {/* Nav cards */}
        <div className="grid grid-cols-2 gap-3">
          <NavCard
            href="/app"
            label="Internal workspace"
            description="Editor, chat, source ingestion, revision history."
            prefetch={false}
          />
          <NavCard
            href="/brief/demo-share-token"
            label="Client brief view"
            description="Shareable review link — comment, answer, approve."
          />
        </div>

        {/* Footer */}
        <p
          className="mt-8 text-[11px] text-center"
          style={{ color: "var(--fg-disabled)" }}
        >
          RequireX &mdash; AI-powered requirements engineering
        </p>
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
      className="block p-4 rounded-[8px] border transition-colors duration-[120ms] group"
      style={{
        background: "var(--surface-1)",
        borderColor: "var(--border)",
      }}
    >
      <div
        className="text-[12px] font-medium mb-1"
        style={{ color: "var(--fg-secondary)" }}
      >
        {label}
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
