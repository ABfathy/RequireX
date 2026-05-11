"use client";

import { SignUp, useAuth, useSignUp } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { RxLogo } from "@/components/icons";

export default function SignUpPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const { signUp } = useSignUp();
  const router = useRouter();
  const isCompleting = signUp?.status === "complete";

  useEffect(() => {
    if (isLoaded && isSignedIn) router.replace("/app");
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || isSignedIn) return null;

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-10"
      style={{ background: "var(--background)" }}
    >
      {isCompleting && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4"
          style={{ background: "var(--background)" }}
        >
          <div
            className="size-8 rounded-full border-2 animate-spin"
            style={{ borderColor: "var(--border-strong)", borderTopColor: "var(--accent)" }}
            aria-hidden="true"
          />
          <p className="text-[13px]" style={{ color: "var(--fg-muted)" }}>
            Setting up your account…
          </p>
        </div>
      )}
      <Link
        href="/"
        className="flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity"
      >
        <RxLogo size={18} className="text-[var(--accent)]" />
        <span
          className="text-[15px] font-semibold tracking-[-0.01em]"
          style={{ color: "var(--fg-primary)" }}
        >
          RequireX
        </span>
      </Link>
      <SignUp routing="path" path="/sign-up" afterSignUpUrl="/app" />
    </main>
  );
}
