"use client";

import { useSearch } from "./use-search";
import type { TeamSearchResult } from "@/lib/types";
import { BASE_PATH } from "@/lib/constants";

export function useTeamSearch(query: string) {
  return useSearch<TeamSearchResult>(`${BASE_PATH}/api/teams/search`, query);
}
