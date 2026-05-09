"use client";

import type { SlotRecommendation } from "@/lib/item-advisor";
import type { StatNeed } from "@/lib/item-advisor";

interface ShopSummaryProps {
  recommendations: SlotRecommendation[];
  statNeeds: StatNeed[];
  flatMax: number;
  pctMax: number;
}

const SLOT_EMOJI: Record<string, string> = {
  head: "🪖",
  body: "👕",
  hands: "🧤",
  feet: "🥾",
  charm: "🧿",
};

function preferredType(currentValue: number, boonMultiplier: number, flatMax: number, pctMax: number): "flat" | "pct" {
  // Compare actual gains: flat gives flatMax * boonMult, pct gives current * pctMax/100
  const flatGain = flatMax * Math.max(boonMultiplier, 1.0);
  const pctGain = currentValue * (pctMax / 100);
  return pctGain > flatGain ? "pct" : "flat";
}

export function ShopSummary({ recommendations, statNeeds, flatMax, pctMax }: ShopSummaryProps) {
  if (recommendations.length === 0 || statNeeds.length === 0) return null;

  const statToSlots = new Map<string, string[]>();
  for (const rec of recommendations) {
    for (const pick of [...rec.offensivePicks, ...rec.defensivePicks]) {
      const existing = statToSlots.get(pick.stat) ?? [];
      if (!existing.includes(rec.slot)) existing.push(rec.slot);
      statToSlots.set(pick.stat, existing);
    }
  }

  const rows: { stat: string; gap: number; pref: "flat" | "pct"; slots: string[] }[] = [];
  for (const need of statNeeds) {
    if (rows.length >= 8) break;
    const slots = statToSlots.get(need.stat);
    if (!slots || slots.length === 0) continue;
    if (need.combinedScore <= 0) continue;
    rows.push({
      stat: need.stat,
      gap: Math.max(need.archetypeGap, need.defenseGap),
      pref: preferredType(need.currentValue, need.boonMultiplier, flatMax, pctMax),
      slots,
    });
  }

  if (rows.length === 0) return null;

  return (
    <div className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-gray-800/80 px-3 py-1.5 border-b border-gray-700 text-center">
        <span className="text-sm font-semibold text-gray-200">Shopping List</span>
      </div>

      {/* Stat rows */}
      <div className="px-3 py-2 space-y-0.5">
        {rows.map((row) => (
          <div key={row.stat} className="flex items-center justify-between text-sm h-[22px]">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="capitalize font-medium text-gray-100 truncate">{row.stat}</span>
              {row.gap > 0 && <span className="text-xs text-gray-500">-{Math.round(row.gap)}</span>}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={`text-xs font-mono ${row.pref === "flat" ? "text-blue-300/70" : "text-blue-400"}`}>
                {row.pref === "flat" ? `+${flatMax}` : `${pctMax}%`}
              </span>
              <span className="flex gap-0.5">
                {row.slots.map((s) => <span key={s} className="text-xs" title={s}>{SLOT_EMOJI[s]}</span>)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
