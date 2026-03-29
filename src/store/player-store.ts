"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PlayerData, RosterPlayer, TeamSearchResult } from "@/lib/types";

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

  // Actions
  setPlayer: (player: PlayerData | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setArchetypeId: (id: string | null) => void;
  setLastTeam: (team: TeamSearchResult | null, roster: RosterPlayer[]) => void;

  // Async actions
  importPlayer: (mmolbPlayerId: string) => Promise<void>;
  searchAndImportFirst: (name: string) => Promise<void>;
}

export const usePlayerStore = create<PlayerStore>()(
  persist(
    (set) => ({
      player: null,
      loading: false,
      error: null,
      archetypeId: null,
      lastTeam: null,
      lastRoster: [],

      setPlayer: (player) => set({ player, error: null }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error, loading: false }),
      setArchetypeId: (archetypeId) => set({ archetypeId }),
      setLastTeam: (lastTeam, lastRoster) => set({ lastTeam, lastRoster }),

      importPlayer: async (mmolbPlayerId) => {
        set({ loading: true, error: null });
        try {
          const res = await fetch(`/api/players/${mmolbPlayerId}`);
          if (!res.ok) throw new Error("Player not found");
          const player: PlayerData = await res.json();
          set({ player, loading: false, error: null });
        } catch (e) {
          set({
            error: e instanceof Error ? e.message : "Failed to load player",
            loading: false,
          });
        }
      },

      searchAndImportFirst: async (name) => {
        set({ loading: true, error: null });
        try {
          const searchRes = await fetch(
            `/api/players/search?q=${encodeURIComponent(name)}&limit=1`
          );
          if (!searchRes.ok) throw new Error("Search failed");
          const results = await searchRes.json();
          if (!results.length) {
            set({ error: "No players found", loading: false });
            return;
          }
          const playerRes = await fetch(
            `/api/players/${results[0].mmolbPlayerId}`
          );
          if (!playerRes.ok) throw new Error("Player not found");
          const player: PlayerData = await playerRes.json();
          set({ player, loading: false, error: null });
        } catch (e) {
          set({
            error: e instanceof Error ? e.message : "Failed to load player",
            loading: false,
          });
        }
      },
    }),
    {
      name: "mmolb-player-store",
      partialize: (state) => ({
        player: state.player,
        archetypeId: state.archetypeId,
        lastTeam: state.lastTeam,
        lastRoster: state.lastRoster,
      }),
    }
  )
);
