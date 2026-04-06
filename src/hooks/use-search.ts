"use client";

import { useState, useEffect, useRef } from "react";
import { useDebounce } from "./use-debounce";
import { isAbortError } from "@/lib/utils";

export function useSearch<T>(url: string, query: string) {
  const debouncedQuery = useDebounce(query, 300);
  const [results, setResults] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (debouncedQuery.trim().length < 2) {
      setResults([]);
      setError(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(false);

    fetch(`${url}?q=${encodeURIComponent(debouncedQuery)}`, {
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Search failed: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setResults(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        if (isAbortError(err)) return;
        console.error(`Search error (${url}):`, err);
        setResults([]);
        setError(true);
        setLoading(false);
      });

    return () => controller.abort();
  }, [debouncedQuery, url]);

  return { results, loading, error };
}
