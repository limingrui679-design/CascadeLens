import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://cascadelens.limingrui2.chatgpt.site"),
  title: {
    default: "CascadeLens",
    template: "%s · CascadeLens",
  },
  description: "Python toolkit for evidence-graded dependency graphs, bounded cascade analysis, and verifiable RiskPacks.",
  applicationName: "CascadeLens",
  authors: [{ name: "Mingrui Li" }],
  creator: "Mingrui Li",
  keywords: [
    "systemic risk",
    "Python",
    "NetworkX",
    "Jupyter",
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
    title: "CascadeLens · Auditable cascade analysis in Python",
    description:
      "Import dependency graphs, compare bounded shock propagation and interventions, and export recomputation-verifiable RiskPacks.",
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
    title: "CascadeLens · Auditable cascade analysis in Python",
    description:
      "JSON, CSV, GraphML, and NetworkX in; bounded cascades, interventions, and verifiable RiskPacks out.",
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
      <head>
        <link
          as="font"
          crossOrigin="anonymous"
          href="/fonts/geist-latin-variable.woff2"
          rel="preload"
          type="font/woff2"
        />
        <link
          as="font"
          crossOrigin="anonymous"
          href="/fonts/geist-mono-latin-variable.woff2"
          rel="preload"
          type="font/woff2"
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
