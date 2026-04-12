import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Share_Tech_Mono, Rajdhani } from "next/font/google";
import "./globals.css";

const shareTechMono = Share_Tech_Mono({
  weight: "400",
  variable: "--font-share-tech-mono",
  subsets: ["latin"],
});

const rajdhani = Rajdhani({
  weight: ["400", "500", "600", "700"],
  variable: "--font-rajdhani",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ReactorCore — Tschernobyl-Simulation",
  description: "Browserbasierte Tschernobyl-Reaktor-Simulation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="de"
        className={`${shareTechMono.variable} ${rajdhani.variable} h-full`}
      >
        <body className="min-h-full flex flex-col" style={{ fontFamily: 'var(--font-rajdhani), sans-serif' }}>{children}</body>
      </html>
    </ClerkProvider>
  );
}
