"use client";

import type { PlayerData } from "@/lib/types";

interface PlayerInfoProps {
  player: PlayerData;
}

export function PlayerInfo({ player }: PlayerInfoProps) {
  const boonCount = player.lesserBoons.length + player.greaterBoons.length;

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">{player.name}</h2>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            {player.teamEmoji && <span>{player.teamEmoji}</span>}
            {player.teamName && <span>{player.teamName}</span>}
            {player.position && (
              <>
                <span className="text-border">|</span>
                <span>{player.position}</span>
              </>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold tabular-nums">
            Lv.{player.level}
          </div>
          {boonCount > 0 && (
            <div className="text-xs text-muted-foreground mt-0.5">
              {player.lesserBoons.length} lesser
              {player.greaterBoons.length > 0 &&
                `, ${player.greaterBoons.length} greater`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
