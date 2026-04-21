import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ProviderPilot — Autonomous Provider Onboarding",
  description: "40 AI agents automating childcare provider licensing across 10 US states. Built with Paperclip + OpenClaw.",
};

import { ErrorBoundary } from "@/components/error-boundary";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );
}
