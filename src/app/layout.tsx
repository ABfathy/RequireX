import "./globals.css";

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { ClerkModalGuard } from "@/components/clerk-modal-guard";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  weight: ["300", "400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "RequireX",
  description: "AI intake and brief generation for messy client requirements.",
  icons: {
    icon: "/rx-logo.png",
    shortcut: "/rx-logo.png",
    apple: "/rx-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <meta name="theme-color" content="#141517" />
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
