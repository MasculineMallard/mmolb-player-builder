"use client";

import { useMemo } from "react";
import { usePlayerStore } from "@/store/player-store";
import { STAT_CATEGORIES, CATEGORY_LABELS } from "@/lib/constants";
import type { PlayerData } from "@/lib/types";

function CompareStatRow({
  statName,
  valueA,
  valueB,
}: {
  statName: string;
  valueA: number | undefined;
  valueB: number | undefined;
}) {
  const a = valueA ?? 0;
  const b = valueB ?? 0;
  const diff = a - b;

  return (
    <div className="flex items-center justify-between py-0.5 px-2 text-sm">
      <span className="font-mono tabular-nums w-12 text-right">{a}</span>
      <div className="flex-1 text-center">
        <span className="capitalize text-muted-foreground">{statName}</span>
        {diff !== 0 && (
          <span
            className="ml-1.5 text-sm font-medium"
            style={{
              color: diff > 0 ? "var(--scale-good)" : "var(--scale-bad)",
            }}
          >
            {diff > 0 ? `+${diff}` : diff}
          </span>
        )}
      </div>
      <span className="font-mono tabular-nums w-12 text-left">{b}</span>
    </div>
  );
}

function CompareHeader({ player, side }: { player: PlayerData; side: "left" | "right" }) {
  return (
    <div className={`text-${side === "left" ? "right" : "left"} min-w-0`}>
      <div className="font-bold truncate">{player.name}</div>
      <div className="text-sm text-muted-foreground">
        {player.teamEmoji} {player.position} | Lv.{player.level}
      </div>
    </div>
  );
}

export function CompareView() {
  const player = usePlayerStore((s) => s.player);
  const comparePlayer = usePlayerStore((s) => s.comparePlayer);
  const clearCompare = usePlayerStore((s) => s.clearCompare);

  const activeCategories = useMemo(() => {
    if (!player || !comparePlayer) return [];
    return Object.entries(STAT_CATEGORIES).filter(([, statNames]) =>
      statNames.some(
        (s) => player.stats[s] !== undefined || comparePlayer.stats[s] !== undefined
      )
    );
  }, [player, comparePlayer]);

  if (!player || !comparePlayer) return null;

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Comparing Players
        </h3>
        <button
          onClick={clearCompare}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Close
        </button>
      </div>

      <div className="flex items-start justify-between mb-4 gap-4">
        <CompareHeader player={player} side="left" />
        <span className="text-muted-foreground text-sm font-medium shrink-0 pt-1">
          vs
        </span>
        <CompareHeader player={comparePlayer} side="right" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        {activeCategories.map(([category, statNames]) => (
          <div key={category}>
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-1 border-b border-border pb-1">
              {CATEGORY_LABELS[category]}
            </h4>
            <div className="space-y-0">
              {statNames.map((statName) => {
                const a = player.stats[statName];
                const b = comparePlayer.stats[statName];
                if (a === undefined && b === undefined) return null;
                return (
                  <CompareStatRow
                    key={statName}
                    statName={statName}
                    valueA={a}
                    valueB={b}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
