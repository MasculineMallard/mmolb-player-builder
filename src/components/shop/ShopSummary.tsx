"use client";

import type { SlotRecommendation } from "@/lib/item-advisor";
import type { StatNeed } from "@/lib/item-advisor";

interface ShopSummaryProps {
  recommendations: SlotRecommendation[];
  statNeeds: StatNeed[];
  globalValue: number;
}

/**
 * Flat gives: +value * boonMultiplier per slot
 * Pct gives: current * (value/100) per slot
 * Crossover: pct beats flat when current > 100 * boonMultiplier
 */
function preferredType(stat: string, statNeeds: StatNeed[]): "flat" | "pct" {
  const need = statNeeds.find((n) => n.stat === stat);
  if (!need) return "flat";

  const bm = need.boonMultiplier;
  const current = need.currentValue;
  const crossover = 100 * Math.max(bm, 1.0);

  return current > crossover ? "pct" : "flat";
}

export function ShopSummary({ recommendations, statNeeds }: ShopSummaryProps) {
  if (recommendations.length === 0) return null;

  return (
    <div className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-gray-800/80 px-3 py-1.5 border-b border-gray-700 text-center">
        <span className="text-sm font-semibold text-gray-200">Shopping List</span>
      </div>

      {/* 3-column grid: slot | stat | flat/percent */}
      <div className="px-3 py-2 space-y-1">
        {recommendations.map((rec) => {
          const top = rec.offensivePicks[0] ?? rec.defensivePicks[0];
          if (!top) return null;
          const pref = preferredType(top.stat, statNeeds);
          return (
            <div key={rec.slot} className="grid grid-cols-[28px_1fr_auto] items-center gap-1 text-sm">
              <span className="text-base text-center">{rec.emoji}</span>
              <span className="font-medium text-gray-100 capitalize">{top.stat}</span>
              <span className={`font-medium text-right ${pref === "flat" ? "text-blue-400/70" : "text-blue-400"}`}>
                {pref === "flat" ? "flat" : "percent"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
