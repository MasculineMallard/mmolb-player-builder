"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { isAbortError } from "@/lib/utils";
import type { PlayerData, RosterPlayer, TeamSearchResult } from "@/lib/types";

export interface RecentPlayer {
  mmolbPlayerId: string;
  name: string;
  level: number;
  teamName: string | null;
  teamEmoji: string | null;
  position: string | null;
  viewedAt: number;
}

const MAX_RECENT = 10;

interface PlayerStore {
  // Current player
  player: PlayerData | null;
  loading: boolean;
  error: string | null;

  // Selected archetype
  archetypeId: string | null;

  // Last loaded team roster (for quick switching)
  lastTeam: TeamSearchResult | null;
  lastRoster: RosterPlayer[];

  // Recently viewed players
  recentPlayers: RecentPlayer[];

  // Compare mode
  comparePlayer: PlayerData | null;
  compareLoading: boolean;
  compareError: string | null;

  // Actions
  setPlayer: (player: PlayerData | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setArchetypeId: (id: string | null) => void;
  setLastTeam: (team: TeamSearchResult | null, roster: RosterPlayer[]) => void;
  clearCompare: () => void;

  // Async actions
  importPlayer: (mmolbPlayerId: string) => Promise<void>;
  importComparePlayer: (mmolbPlayerId: string) => Promise<void>;
}

// Abort controllers for in-flight requests
let importAbort: AbortController | null = null;
let compareAbort: AbortController | null = null;

function addToRecent(
  recentPlayers: RecentPlayer[],
  player: PlayerData
): RecentPlayer[] {
  const entry: RecentPlayer = {
    mmolbPlayerId: player.mmolbPlayerId,
    name: player.name,
    level: player.level,
    teamName: player.teamName,
    teamEmoji: player.teamEmoji,
    position: player.position,
    viewedAt: Date.now(),
  };
  const filtered = recentPlayers.filter(
    (r) => r.mmolbPlayerId !== player.mmolbPlayerId
  );
  return [entry, ...filtered].slice(0, MAX_RECENT);
}

async function fetchPlayer(
  mmolbPlayerId: string,
  signal: AbortSignal
): Promise<PlayerData> {
  const res = await fetch(`/api/players/${mmolbPlayerId}`, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(18000)]),
  });
  if (!res.ok) {
    throw new Error(
      res.status === 404
        ? "Player not found"
        : res.status === 422
          ? "Player exists but has no stats yet"
          : `Server error (${res.status})`
    );
  }
  try {
    return await res.json();
  } catch {
    throw new Error("Invalid response from server");
  }
}

export const usePlayerStore = create<PlayerStore>()(
  persist(
    (set, get) => ({
      player: null,
      loading: false,
      error: null,
      archetypeId: null,
      lastTeam: null,
      lastRoster: [],
      recentPlayers: [],
      comparePlayer: null,
      compareLoading: false,
      compareError: null,

      setPlayer: (player) => set({ player, error: null }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error, loading: false }),
      setArchetypeId: (archetypeId) => set({ archetypeId }),
      setLastTeam: (lastTeam, lastRoster) => set({ lastTeam, lastRoster }),
      clearCompare: () => set({ comparePlayer: null, compareError: null }),

      importPlayer: async (mmolbPlayerId) => {
        importAbort?.abort();
        const controller = new AbortController();
        importAbort = controller;

        set({ loading: true, error: null });
        try {
          const player = await fetchPlayer(mmolbPlayerId, controller.signal);
          if (controller.signal.aborted) {
            set({ loading: false });
            return;
          }
          set({
            player,
            loading: false,
            error: null,
            recentPlayers: addToRecent(get().recentPlayers, player),
          });
        } catch (e) {
          if (isAbortError(e)) {
            set({ loading: false });
            return;
          }
          console.error("Import player error:", e);
          set({
            error: e instanceof Error ? e.message : "Failed to load player",
            loading: false,
          });
        }
      },

      importComparePlayer: async (mmolbPlayerId) => {
        compareAbort?.abort();
        const controller = new AbortController();
        compareAbort = controller;

        set({ compareLoading: true, compareError: null });
        try {
          const player = await fetchPlayer(mmolbPlayerId, controller.signal);
          if (controller.signal.aborted) {
            set({ compareLoading: false });
            return;
          }
          set({ comparePlayer: player, compareLoading: false });
        } catch (e) {
          if (isAbortError(e)) {
            set({ compareLoading: false });
            return;
          }
          console.error("Compare player error:", e);
          set({
            compareLoading: false,
            compareError: e instanceof Error ? e.message : "Failed to load compare player",
          });
        }
      },
    }),
    {
      name: "mmolb-player-store",
      version: 2,
      partialize: (state) => ({
        player: state.player,
        archetypeId: state.archetypeId,
        recentPlayers: state.recentPlayers,
      }),
      migrate: (persisted, version) => {
        if (version < 2) {
          console.warn(`[player-store] migrating from v${version} to v2`);
          const old = persisted as Record<string, unknown>;
          return {
            player: old.player ?? null,
            archetypeId: old.archetypeId ?? null,
            recentPlayers: [],
          };
        }
        return persisted as Record<string, unknown>;
      },
    }
  )
);
