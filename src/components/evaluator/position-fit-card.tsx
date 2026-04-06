"use client";

import { useEffect, useState } from "react";
import { loadPositionDefense, type PositionDefenseMap } from "@/lib/evaluator-data";
import type { PlayerData } from "@/lib/types";
import type { PlayerRole } from "@/lib/evaluator-types";

interface DefenseStatBarsProps {
  player: PlayerData;
  role: PlayerRole;
  fitScore: number;
}

export function DefenseStatBars({ player, role, fitScore }: DefenseStatBarsProps) {
  const [posDefense, setPosDefense] = useState<PositionDefenseMap>({});

  useEffect(() => {
    let cancelled = false;
    loadPositionDefense()
      .then((data) => { if (!cancelled) setPosDefense(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const basePos = player.position?.replace(/\d+$/, "") ?? "";
  const entry = posDefense[basePos];
  const isPitcher = role === "pitcher";
  const isDH = basePos === "DH" || basePos === "Bench";

  if (isPitcher) {
    return (
      <div className="text-center py-2">
        <div className="text-sm text-muted-foreground">{fitScore}% fit</div>
        <p className="text-sm text-muted-foreground mt-1">Defense not scored for pitchers.</p>
      </div>
    );
  }

  if (isDH) {
    return (
      <div className="text-center py-2">
        <div className="text-sm text-muted-foreground">No defense requirements for DH.</div>
      </div>
    );
  }

  const defenseStats = entry?.stat_weights ? Object.keys(entry.stat_weights) : [];
  if (defenseStats.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <div className="text-sm font-medium">
        {entry?.name ?? basePos} — {fitScore}%
      </div>
      {defenseStats.map((stat) => {
        const value = player.stats[stat] ?? 0;
        const weight = entry?.stat_weights[stat] ?? 0.08;
        const target = Math.round((weight / 0.12) * 200);
        const pct = Math.min(100, (value / target) * 100);

        return (
          <div key={stat} className="flex items-center gap-2 text-sm">
            <span className="capitalize text-muted-foreground w-24 shrink-0">{stat}</span>
            <div className="flex-1 h-[11px] bg-muted/80 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  backgroundColor: value >= target
                    ? "var(--scale-good)"
                    : value >= target * 0.5
                      ? "var(--scale-mid)"
                      : "var(--scale-bad)",
                }}
              />
            </div>
            <span className="tabular-nums w-16 text-right">{value}<span className="text-muted-foreground">/{target}</span></span>
          </div>
        );
      })}
    </div>
  );
}
