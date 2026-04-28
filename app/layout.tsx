import type { Metadata } from "next";
import { Inter_Tight, Newsreader } from "next/font/google";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import "./globals.css";

const interTight = Inter_Tight({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-inter-tight",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BTO Portfolio Intelligence",
  description: "Diagnostic dashboard for BTO initiatives",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${interTight.variable} ${newsreader.variable}`}>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        suppressHydrationWarning
        className="flex h-screen overflow-hidden antialiased font-sans"
      >
        <Sidebar />
        <main className="ml-64 flex-1 flex flex-col h-full bg-base">
          <TopBar />
          {children}
        </main>
      </body>
    </html>
  );
}
