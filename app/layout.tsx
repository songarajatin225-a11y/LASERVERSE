import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "katex/dist/katex.min.css";
import "./globals.css";
import { MotionProvider } from "@/components/shell/MotionProvider";
import { CommandPalette } from "@/components/shell/CommandPalette";

export const metadata: Metadata = {
  title: {
    default: "PHOTON TO PRODUCT — LASERVERSE",
    template: "%s · LASERVERSE",
  },
  description:
    "LASERVERSE — Interactive Laser Technology & Engineering. Explore laser physics, industrial laser systems and the engineering behind real-world laser applications. A laser knowledge platform by Titan Engineering & Automation Limited (TEAL).",
  applicationName: "LASERVERSE",
  authors: [{ name: "Titan Engineering & Automation Limited (TEAL)" }],
  openGraph: {
    title: "PHOTON TO PRODUCT — LASERVERSE",
    description: "Interactive laser technology & engineering platform built on The Complete Laser Handbook.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#070b11",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <a
          href="#main"
          className="sr-only z-[100] rounded bg-teal-500 px-3 py-2 text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
        >
          Skip to content
        </a>
        <MotionProvider>
          {children}
          <CommandPalette />
        </MotionProvider>
      </body>
    </html>
  );
}
