"use client";

import type { SlotRecommendation } from "@/lib/item-advisor";
import type { StatNeed } from "@/lib/item-advisor";

interface SlotCardProps {
  recommendation: SlotRecommendation;
  globalValue: number;
  statNeeds: StatNeed[];
}

function preferredType(stat: string, statNeeds: StatNeed[]): "flat" | "pct" {
  const need = statNeeds.find((n) => n.stat === stat);
  if (!need) return "flat";
  const crossover = 100 * Math.max(need.boonMultiplier, 1.0);
  return need.currentValue > crossover ? "pct" : "flat";
}

export function SlotCard({ recommendation: rec, globalValue, statNeeds }: SlotCardProps) {
  const allPicks = [...rec.offensivePicks, ...rec.defensivePicks];

  return (
    <div className="bg-gray-900/90 border border-gray-700 rounded-md overflow-hidden">
      <div className="px-1.5 py-0.5 bg-gray-800/80 border-b border-gray-700 flex items-center gap-1 justify-center">
        <span className="text-xs">{rec.emoji}</span>
        <span className="text-[11px] font-semibold text-gray-300">{rec.label}</span>
        {rec.priority <= 2 && <span className="text-[9px] text-yellow-400">★</span>}
      </div>
      <div className="px-1.5 py-0.5">
        {allPicks.slice(0, 4).map((pick) => {
          const isDefense = rec.defensivePicks.includes(pick);
          const pref = preferredType(pick.stat, statNeeds);
          return (
            <div key={pick.stat} className="flex items-center justify-between text-[11px] leading-[16px]">
              <span className={`capitalize font-medium truncate ${isDefense ? "text-yellow-400" : "text-gray-100"}`}>
                {pick.stat}
              </span>
              <span className={`font-mono shrink-0 ml-1 ${pref === "flat" ? "text-blue-300/70" : "text-blue-400"}`}>
                {pref === "flat" ? `+${globalValue}` : `${globalValue}%`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
