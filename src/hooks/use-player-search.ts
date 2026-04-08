"use client";

import { useSearch } from "./use-search";
import type { PlayerSearchResult } from "@/lib/types";
import { BASE_PATH } from "@/lib/constants";

export function usePlayerSearch(query: string) {
  return useSearch<PlayerSearchResult>(`${BASE_PATH}/api/players/search`, query);
}
