import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import Image from "next/image";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NavLinks } from "@/components/builder/NavLinks";
import { BASE_PATH } from "@/lib/constants";
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
  title: "POP - Player Optimization Planner",
  description: "MMOLB Season 11 player builder, stat planner, and roster evaluator",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <TooltipProvider>
          <div className="flex flex-col flex-1">
            <header className="border-b border-border bg-card">
              <div className="relative px-4 sm:px-6 lg:px-8 flex items-center h-11 gap-2 md:gap-6">
                <Link href="/" className="font-bold text-lg flex items-center gap-0.5">
                  <Image src={`${BASE_PATH}/pop-can.png`} alt="POP" width={20} height={28} />
                  POP
                </Link>
                <NavLinks />
                <div className="ml-auto hidden md:flex items-center gap-3">
                  <div id="share-slot" className="flex items-center gap-2" />
                  <span className="text-sm text-muted-foreground">Season 11</span>
                </div>
              </div>
            </header>
            <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-1 sm:py-2">
              <Suspense>{children}</Suspense>
            </main>
          </div>
        </TooltipProvider>
      </body>
    </html>
  );
}
