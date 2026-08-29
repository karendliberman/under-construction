import type { Metadata } from "next";
import "./globals.css";
import { Geist, Source_Serif_4 } from "next/font/google";
import { cn } from "@/lib/utils";

// Sans for interface, serif for anything that reads as a document. next/font
// self-hosts both, so there is no third-party request at runtime.
const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Under Construction — drafting for litigators",
  description:
    "Pick a cause of action and a jurisdiction, enter the facts, and get a first draft of a motion to dismiss, written against a playbook for that combination.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable, sourceSerif.variable)}>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
