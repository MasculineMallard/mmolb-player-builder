"use client";

import { useSearch } from "./use-search";
import type { PlayerSearchResult } from "@/lib/types";

export function usePlayerSearch(query: string) {
  return useSearch<PlayerSearchResult>("/api/players/search", query);
}
