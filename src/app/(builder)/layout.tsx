"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function BuilderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col flex-1">
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 flex items-center h-14 gap-6">
          <Link href="/" className="font-bold text-lg">
            ⚾ MMOLB
          </Link>
          <nav className="flex gap-1">
            <Link
              href="/pitcher"
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                pathname === "/pitcher"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              Pitcher
            </Link>
            <Link
              href="/batter"
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                pathname === "/batter"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              Batter
            </Link>
          </nav>
          <div className="ml-auto text-xs text-muted-foreground">
            Season 11
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        {children}
      </main>
    </div>
  );
}
