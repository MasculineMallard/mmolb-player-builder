"use client";

import { useSearch } from "./use-search";
import type { TeamSearchResult } from "@/lib/types";

export function useTeamSearch(query: string) {
  return useSearch<TeamSearchResult>("/api/teams/search", query);
}
