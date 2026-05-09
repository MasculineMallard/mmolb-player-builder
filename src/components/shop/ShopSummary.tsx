"use client";

import type { SlotRecommendation } from "@/lib/item-advisor";
import type { StatNeed } from "@/lib/item-advisor";

interface ShopSummaryProps {
  recommendations: SlotRecommendation[];
  statNeeds: StatNeed[];
  globalValue: number;
}

const SLOT_EMOJI: Record<string, string> = {
  head: "🪖",
  body: "👕",
  hands: "🧤",
  feet: "🥾",
  charm: "🧿",
};

function preferredType(currentValue: number, boonMultiplier: number): "flat" | "pct" {
  const crossover = 100 * Math.max(boonMultiplier, 1.0);
  return currentValue > crossover ? "pct" : "flat";
}

export function ShopSummary({ recommendations, statNeeds, globalValue }: ShopSummaryProps) {
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
      pref: preferredType(need.currentValue, need.boonMultiplier),
      slots,
    });
  }

  if (rows.length === 0) return null;

  return (
    <div className="bg-gray-900/90 border border-gray-700 rounded-md overflow-hidden h-full">
      <div className="px-1.5 py-0.5 bg-gray-800/80 border-b border-gray-700 text-center">
        <span className="text-[11px] font-semibold text-gray-300">Shopping List</span>
      </div>
      <div className="px-1.5 py-0.5">
        {rows.map((row) => (
          <div key={row.stat} className="flex items-center gap-1 text-[11px] leading-[16px]">
            <span className="capitalize font-medium text-gray-100 truncate flex-1">{row.stat}</span>
            {row.gap > 0 && <span className="text-gray-500 shrink-0">-{Math.round(row.gap)}</span>}
            <span className={`font-mono shrink-0 ${row.pref === "flat" ? "text-blue-300/70" : "text-blue-400"}`}>
              {row.pref === "flat" ? `+${globalValue}` : `${globalValue}%`}
            </span>
            <span className="flex gap-px shrink-0">
              {row.slots.map((s) => <span key={s} className="text-[10px]" title={s}>{SLOT_EMOJI[s]}</span>)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
