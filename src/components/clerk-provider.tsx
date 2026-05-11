"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { useEffect, useState } from "react";

const SHARED = {
  borderRadius: "8px",
  fontFamily: "Geist, system-ui, sans-serif",
  fontSize: "14px",
} as const;

const DARK_APPEARANCE = {
  variables: {
    ...SHARED,
    colorBackground: "#1c1e21",
    colorText: "#efeee9",
    colorTextSecondary: "#9a9a9e",
    colorPrimary: "#7a9bb8",
    colorNeutral: "#efeee9",
    colorInputBackground: "#141517",
    colorInputText: "#efeee9",
    colorTextOnPrimaryBackground: "#06121e",
    colorAlphaShade: "#efeee9",
  },
  elements: { modalBackdrop: "!bg-black/60 !backdrop-blur-md" },
} as const;

const LIGHT_APPEARANCE = {
  variables: {
    ...SHARED,
    colorBackground: "#fbfaf6",
    colorText: "#1a1a1c",
    colorTextSecondary: "#76767e",
    colorPrimary: "#3d6b87",
    colorNeutral: "#1a1a1c",
    colorInputBackground: "#ffffff",
    colorInputText: "#1a1a1c",
    colorTextOnPrimaryBackground: "#ffffff",
    colorAlphaShade: "#1a1a1c",
  },
  elements: { modalBackdrop: "!bg-black/40 !backdrop-blur-md" },
} as const;

function getInitialIsDark(): boolean {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem("rx-theme");
  if (stored) return stored !== "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ThemedClerkProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(true); // SSR default = dark

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsDark(getInitialIsDark());

    function onThemeChange(e: Event) {
      setIsDark((e as CustomEvent<string>).detail !== "light");
    }
    window.addEventListener("rx-theme-change", onThemeChange);
    return () => window.removeEventListener("rx-theme-change", onThemeChange);
  }, []);

  return (
    <ClerkProvider appearance={isDark ? DARK_APPEARANCE : LIGHT_APPEARANCE}>
      {children}
    </ClerkProvider>
  );
}
