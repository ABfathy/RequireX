"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { ThemeProvider } from "next-themes";

import { clientEnv } from "@/lib/env/client";

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

function ThemedClerkProvider({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  return (
    <ClerkProvider
      appearance={isDark ? DARK_APPEARANCE : LIGHT_APPEARANCE}
      signInUrl={clientEnv.NEXT_PUBLIC_CLERK_SIGN_IN_URL}
      signUpUrl={clientEnv.NEXT_PUBLIC_CLERK_SIGN_UP_URL}
      signInForceRedirectUrl={
        clientEnv.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL
      }
      signUpForceRedirectUrl={
        clientEnv.NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL
      }
      signInFallbackRedirectUrl={
        clientEnv.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL
      }
      signUpFallbackRedirectUrl={
        clientEnv.NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL
      }
    >
      {children}
    </ClerkProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="rx-theme"
    >
      <ThemedClerkProvider>{children}</ThemedClerkProvider>
    </ThemeProvider>
  );
}
