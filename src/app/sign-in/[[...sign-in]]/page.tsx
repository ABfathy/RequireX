import { SignIn } from "@clerk/nextjs";
import Link from "next/link";

import { RxLogo } from "@/components/icons";

export default function SignInPage() {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-10"
      style={{ background: "var(--background)" }}
    >
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
      <SignIn routing="path" path="/sign-in" />
    </main>
  );
}
