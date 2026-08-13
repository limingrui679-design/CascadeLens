import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://cascadelens.limingrui2.chatgpt.site"),
  title: {
    default: "CascadeLens",
    template: "%s · CascadeLens",
  },
  description: "Evidence-graded world graphs and auditable cascade analysis.",
  applicationName: "CascadeLens",
  authors: [{ name: "Mingrui Li" }],
  creator: "Mingrui Li",
  keywords: [
    "systemic risk",
    "supply chain resilience",
    "bitemporal graph",
    "scenario analysis",
    "evidence provenance",
  ],
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    type: "website",
    siteName: "CascadeLens",
    title: "CascadeLens · Evidence-graded systemic-risk analysis",
    description:
      "Compile world graphs, shocks, uncertainty bounds, interventions, and provenance into recomputation-verifiable RiskPacks.",
    images: [
      {
        url: "/social-card.jpg",
        width: 1200,
        height: 630,
        alt: "An evidence-graded dependency network with uncertainty envelopes and a disrupted link",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CascadeLens · Evidence-graded systemic-risk analysis",
    description:
      "WorldGraph, ShockScript, bounded cascades, InterventionLab, and recomputation-verifiable RiskPacks.",
    images: ["/social-card.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
