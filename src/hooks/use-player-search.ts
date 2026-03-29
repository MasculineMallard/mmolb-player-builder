"use client";

import { useState, useEffect } from "react";
import { useDebounce } from "./use-debounce";
import type { PlayerSearchResult } from "@/lib/types";

export function usePlayerSearch(query: string) {
  const debouncedQuery = useDebounce(query, 300);
  const [results, setResults] = useState<PlayerSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (debouncedQuery.trim().length < 2) {
      setResults([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch(`/api/players/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setResults(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResults([]);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  return { results, loading };
}
