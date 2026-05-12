import "./globals.css";

import type { Metadata } from "next";

import { ClerkModalGuard } from "@/components/clerk-modal-guard";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "RequireX",
  description: "AI intake and brief generation for messy client requirements.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <head>
        <meta name="theme-color" content="#141517" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen text-foreground antialiased">
        {/* Clerk bot-protection widget mount point — required for Smart CAPTCHA */}
        <div id="clerk-captcha" style={{ display: "none" }} />
        <Providers>
          <ClerkModalGuard />
          {children}
        </Providers>
      </body>
    </html>
  );
}
