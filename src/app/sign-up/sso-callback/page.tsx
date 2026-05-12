"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

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

export default function SignUpSSOCallback() {
  return (
    <>
      <Spinner />
      <AuthenticateWithRedirectCallback />
    </>
  );
}
