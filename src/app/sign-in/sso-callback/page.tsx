"use client";

import { AuthenticateWithRedirectCallback, useAuth } from "@clerk/nextjs";
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

export default function SignInSSOCallback() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace("/app");
    }
  }, [isLoaded, isSignedIn, router]);

  return (
    <>
      <Spinner />
      <AuthenticateWithRedirectCallback
        signInForceRedirectUrl="/app"
        signUpForceRedirectUrl="/app"
      />
    </>
  );
}
