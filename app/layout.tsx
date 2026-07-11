import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "cvly — Know if your resume passes the bots",
  description: "Instant ATS resume scoring, rewriting, cover letters, and interview prep.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
