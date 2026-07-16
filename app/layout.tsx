import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ChatbotButton } from "@/components/ChatbotButton";
import { MetaPixel } from "@/components/MetaPixel";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700", "800"],
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

const SITE_URL = "https://cvly.in";
const TITLE = "Cvly — The interview isn't the hard part. Getting one is.";
const DESCRIPTION = "See exactly what's standing between your resume and a callback — then fix it. ATS score, rewrite, cover letter, and 100 interview questions, free while we're building.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s — Cvly",
  },
  description: DESCRIPTION,
  keywords: [
    "ATS resume checker", "resume score", "resume scanner", "ATS score",
    "resume keywords", "cover letter generator", "interview questions",
    "resume rewrite AI", "job application tracker", "career tool India",
  ],
  authors: [{ name: "Cvly" }],
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Cvly",
    title: TITLE,
    description: DESCRIPTION,
    locale: "en_IN",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Cvly" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${mono.variable}`}>
        {children}
        <ChatbotButton />
        <MetaPixel />
      </body>
    </html>
  );
}
