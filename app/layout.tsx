import type { Metadata } from "next";
import "./globals.css";
import "./security-suite.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://aifix3r.ramjiban84.chatgpt.site"),
  title: "AiFix3r — AI Bug Hunting Automation",
  description:
    "Discover authorized projects, build safe recon workflows, copy bounded tool scripts, and plan missions with NVIDIA-powered AI.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "AiFix3r — AI Bug Hunting Automation",
    description: "Project discovery, 20 recon tool templates, AI-guided triage, and human-controlled security automation.",
    type: "website",
    url: "https://aifix3r.ramjiban84.chatgpt.site",
    siteName: "AiFix3r",
    images: [
      {
        url: "https://aifix3r.ramjiban84.chatgpt.site/og.png",
        width: 1200,
        height: 630,
        alt: "AiFix3r — AI Bug Hunting Automation",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AiFix3r — AI Bug Hunting Automation",
    description: "Project discovery, 20 recon tool templates, AI-guided triage, and human-controlled security automation.",
    images: ["https://aifix3r.ramjiban84.chatgpt.site/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
