import type { Metadata } from "next";
import "./globals.css";
import { Instrument_Serif, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { cn } from "@/lib/utils";

// Per the design handoff: Instrument Serif for display, IBM Plex Sans for UI,
// IBM Plex Mono for labels, metadata and anything that reads as data.
// next/font self-hosts all three, so there is no runtime request to Google.
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});
const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Under Construction — it writes the motion",
  description:
    "Pick a cause of action and a jurisdiction, enter the facts, and get a complete motion to dismiss argued against a playbook built for that pairing.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={cn(
        "font-sans",
        plexSans.variable,
        instrumentSerif.variable,
        plexMono.variable,
      )}
    >
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
