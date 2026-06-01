"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Route error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <h2 className="text-lg font-bold text-foreground">Something went wrong</h2>
      <p className="text-sm text-muted-foreground max-w-md">
        This page hit an unexpected error. It may be a temporary issue with the
        live MMOLB data feed.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-3 py-1.5 rounded-md border border-border text-sm text-foreground hover:bg-secondary/40 transition-colors"
        >
          Try again
        </button>
        <Link
          href="/"
          className="px-3 py-1.5 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
