"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { usePlayerStore } from "@/store/player-store";
import { PlayerSearch } from "./PlayerSearch";
import { PlayerContent } from "./PlayerContent";
import { RecentPlayers } from "./RecentPlayers";
import { CompareView } from "./CompareView";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { EmptyState } from "./EmptyState";

interface BuilderViewProps {
  playerType: "pitcher" | "batter";
}

export function BuilderView({ playerType }: BuilderViewProps) {
  const { player, loading, error, comparePlayer } = usePlayerStore();
  const searchParams = useSearchParams();
  const didAutoImport = useRef(false);
  const [searchOpen, setSearchOpen] = useState(true);

  // Auto-import from URL params: ?player=<id>&archetype=<key>
  // Also refresh persisted player on mount to avoid stale data
  useEffect(() => {
    if (didAutoImport.current) return;
    const playerId = searchParams.get("player");
    const archetypeKey = searchParams.get("archetype");

    if (playerId) {
      didAutoImport.current = true;
      usePlayerStore.getState().importPlayer(playerId);
      if (archetypeKey) {
        usePlayerStore.getState().setArchetypeId(archetypeKey);
      }
    } else if (player) {
      // Refresh persisted player to get latest stats
      didAutoImport.current = true;
      usePlayerStore.getState().importPlayer(player.mmolbPlayerId);
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // Collapse search after player loads
  useEffect(() => {
    if (player && !loading) {
      setSearchOpen(false); // eslint-disable-line react-hooks/set-state-in-effect -- derived from async load completion
    }
  }, [player, loading]);

  return (
    <div className="space-y-2">
      {/* Search: always visible when no player, collapsible when player loaded */}
      {(!player || searchOpen) && (
        <div className="bg-card border border-border rounded-lg px-3 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PlayerSearch />
            <RecentPlayers />
          </div>
          {player && (
            <button
              onClick={() => setSearchOpen(false)}
              className="mt-2 text-sm text-muted-foreground hover:text-foreground"
            >
              Close search
            </button>
          )}
        </div>
      )}

      {/* Main content */}
      {loading && <LoadingSkeleton />}

      {error && (
        <div className="bg-card border border-destructive/50 rounded-lg p-4">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}

      {!player && !loading && !searchOpen && <EmptyState playerType={playerType} />}

      {player && !loading && (
        <>
          {comparePlayer && <CompareView />}
          <PlayerContent player={player} playerType={playerType} onChangePlayer={() => setSearchOpen(true)} searchOpen={searchOpen} />
        </>
      )}
    </div>
  );
}
