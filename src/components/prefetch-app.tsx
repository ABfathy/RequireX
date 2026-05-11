"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/* Warms the route bundle for `/app` so that subsequent navigation
   (clicking "Open Workspace", the nav card, etc.) lands without
   waiting on a cold route load. Renders nothing. */
export function PrefetchApp() {
  const router = useRouter();
  useEffect(() => {
    router.prefetch("/app");
  }, [router]);
  return null;
}
