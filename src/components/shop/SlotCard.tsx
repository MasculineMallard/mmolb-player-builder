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
    <div className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800/80 px-2 py-1 border-b border-gray-700 flex items-center gap-1 justify-center">
        <span className="text-sm">{rec.emoji}</span>
        <span className="text-xs font-semibold text-gray-200">{rec.label}</span>
        {rec.priority <= 2 && (
          <span className="text-[10px] text-yellow-400 ml-0.5" title={`Priority #${rec.priority}`}>★</span>
        )}
      </div>

      {/* Stat rows — compact */}
      <div className="px-2 py-1 space-y-px">
        {allPicks.slice(0, 4).map((pick) => {
          const isDefense = rec.defensivePicks.includes(pick);
          const pref = preferredType(pick.stat, statNeeds);
          return (
            <div key={pick.stat} className="flex items-center justify-between text-xs h-[18px]">
              <span className={`capitalize font-medium truncate ${isDefense ? "text-yellow-400" : "text-gray-100"}`}>
                {pick.stat}
              </span>
              <span className={`font-mono shrink-0 ml-1 ${
                pref === "flat" ? "text-blue-300/70" : "text-blue-400"
              }`}>
                {pref === "flat" ? `+${globalValue}` : `${globalValue}%`}
              </span>
            </div>
          );
        })}
        {allPicks.length === 0 && (
          <div className="text-[11px] text-gray-600 text-center py-1">No gaps</div>
        )}
      </div>
    </div>
  );
}
