"use client";

import type { SlotRecommendation } from "@/lib/item-advisor";
import type { StatNeed } from "@/lib/item-advisor";

interface SlotCardProps {
  recommendation: SlotRecommendation;
  flatMax: number;
  pctMax: number;
  statNeeds: StatNeed[];
}

function preferredType(stat: string, statNeeds: StatNeed[], flatMax: number, pctMax: number): "flat" | "pct" {
  const need = statNeeds.find((n) => n.stat === stat);
  if (!need) return "flat";
  const flatGain = flatMax * Math.max(need.boonMultiplier, 1.0);
  const pctGain = need.currentValue * (pctMax / 100);
  return pctGain > flatGain ? "pct" : "flat";
}

export function SlotCard({ recommendation: rec, flatMax, pctMax, statNeeds }: SlotCardProps) {
  return (
    <div className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-gray-800/80 px-3 py-1.5 border-b border-gray-700 flex items-center gap-1.5 justify-center">
        <span className="text-base">{rec.emoji}</span>
        <span className="text-sm font-semibold text-gray-200">{rec.label}</span>
        {rec.priority <= 2 && <span className="text-[10px] text-yellow-400">★</span>}
      </div>

      {/* Offensive stats */}
      <div className="px-3 pt-2 pb-1 space-y-0.5">
        {rec.offensivePicks.map((pick) => {
          const pref = preferredType(pick.stat, statNeeds, flatMax, pctMax);
          return (
            <div key={pick.stat} className="flex items-center justify-between text-sm h-[22px]">
              <span className="capitalize font-medium text-gray-100">{pick.stat}</span>
              <span className={`text-xs font-mono ${pref === "flat" ? "text-sky-200" : "text-blue-400"}`}>
                {pref === "flat" ? `+${flatMax}` : `${pctMax}%`}
              </span>
            </div>
          );
        })}
      </div>

      {/* Divider — only if both sections have content */}
      {rec.offensivePicks.length > 0 && rec.defensivePicks.length > 0 && (
        <div className="px-3"><div className="border-t border-gray-600 my-1" /></div>
      )}

      {/* Defense stats */}
      {rec.defensivePicks.length > 0 && (
        <div className="px-3 pt-1 pb-2 space-y-0.5">
          {rec.defensivePicks.map((pick) => {
            const pref = preferredType(pick.stat, statNeeds, flatMax, pctMax);
            return (
              <div key={pick.stat} className="flex items-center justify-between text-sm h-[22px]">
                <span className="capitalize font-medium text-yellow-400">{pick.stat}</span>
                <span className={`text-xs font-mono ${pref === "flat" ? "text-sky-200" : "text-blue-400"}`}>
                  {pref === "flat" ? `+${flatMax}` : `${pctMax}%`}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
