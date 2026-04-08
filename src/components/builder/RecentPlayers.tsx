"use client";

import { usePlayerStore } from "@/store/player-store";
import type { RecentPlayer } from "@/store/player-store";

export function RecentPlayers() {
  const recentPlayers = usePlayerStore((s) => s.recentPlayers);
  const { importPlayer, loading, player, importComparePlayer, compareLoading } =
    usePlayerStore();

  if (recentPlayers.length === 0) return null;

  const handleCompare = (p: RecentPlayer) => {
    if (p.mmolbPlayerId === player?.mmolbPlayerId) return;
    importComparePlayer(p.mmolbPlayerId);
  };

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
        Recent Players
      </h4>
      <div className="space-y-0.5 max-h-48 overflow-y-auto">
        {recentPlayers.map((p) => {
          const isCurrent = p.mmolbPlayerId === player?.mmolbPlayerId;
          return (
            <div
              key={p.mmolbPlayerId}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm ${
                isCurrent ? "bg-primary/10 border border-primary/30" : ""
              }`}
            >
              <button
                onClick={() => importPlayer(p.mmolbPlayerId)}
                disabled={loading || isCurrent}
                className="flex-1 text-left hover:text-primary transition-colors disabled:opacity-50 truncate"
              >
                {p.teamEmoji && <span className="mr-1">{p.teamEmoji}</span>}
                {p.name}
              </button>
              <span className="text-sm text-muted-foreground shrink-0">
                Lv.{p.level}
              </span>
              {player && !isCurrent && (
                <button
                  onClick={() => handleCompare(p)}
                  disabled={compareLoading}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors shrink-0 disabled:opacity-50"
                  title="Compare with current player"
                >
                  vs
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
