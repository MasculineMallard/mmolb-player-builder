"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1">
      <Link
        href="/pop/pitcher"
        className={cn(
          "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
          pathname === "/pop/pitcher"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary"
        )}
      >
        Pitcher Planner
      </Link>
      <Link
        href="/pop/batter"
        className={cn(
          "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
          pathname === "/pop/batter"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary"
        )}
      >
        Batter Builder
      </Link>
      <Link
        href="/pop/mulch"
        className={cn(
          "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
          pathname === "/pop/mulch"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary"
        )}
      >
        Mulch-o-Meter
      </Link>
    </nav>
  );
}
