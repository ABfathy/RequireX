"use client";

import { SignUp, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function Spinner() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div
        className="size-8 rounded-full border-2 animate-spin"
        style={{
          borderColor: "var(--border-strong)",
          borderTopColor: "var(--accent)",
        }}
      />
    </main>
  );
}

export default function SignUpPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace("/app");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || isSignedIn) {
    return <Spinner />;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-10">
      <SignUp />
    </main>
  );
}
