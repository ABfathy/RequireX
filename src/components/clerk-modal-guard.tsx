"use client";

import { useClerk } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function ClerkModalGuard() {
  const { closeUserProfile, closeSignIn, closeSignUp } = useClerk();
  const pathname = usePathname();

  useEffect(() => {
    closeUserProfile();
    closeSignIn();
    closeSignUp();
  }, [pathname, closeUserProfile, closeSignIn, closeSignUp]);

  return null;
}
