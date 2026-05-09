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

/**
 * Flat gives: +value * boonMultiplier per slot
 * Pct gives: current * (value/100) per slot
 * Crossover: pct beats flat when current > 100 * boonMultiplier
 */
function preferredType(currentValue: number, boonMultiplier: number): "flat" | "pct" {
  const crossover = 100 * Math.max(boonMultiplier, 1.0);
  return currentValue > crossover ? "pct" : "flat";
}

interface StatRow {
  stat: string;
  currentValue: number;
  gap: number;
  boonMultiplier: number;
  pref: "flat" | "pct";
  slots: string[]; // slot keys that can roll this stat
  category: string;
}

export function ShopSummary({ recommendations, statNeeds, globalValue }: ShopSummaryProps) {
  if (recommendations.length === 0 || statNeeds.length === 0) return null;

  // Build a map of which slots can roll each stat (from recommendations)
  const statToSlots = new Map<string, string[]>();
  for (const rec of recommendations) {
    for (const pick of [...rec.offensivePicks, ...rec.defensivePicks]) {
      const existing = statToSlots.get(pick.stat) ?? [];
      if (!existing.includes(rec.slot)) existing.push(rec.slot);
      statToSlots.set(pick.stat, existing);
    }
  }

  // Take the top stat needs that actually appear in recommendations, cap at ~8
  const rows: StatRow[] = [];
  for (const need of statNeeds) {
    if (rows.length >= 8) break;
    const slots = statToSlots.get(need.stat);
    if (!slots || slots.length === 0) continue;
    if (need.combinedScore <= 0) continue;

    rows.push({
      stat: need.stat,
      currentValue: need.currentValue,
      gap: Math.max(need.archetypeGap, need.defenseGap),
      boonMultiplier: need.boonMultiplier,
      pref: preferredType(need.currentValue, need.boonMultiplier),
      slots,
      category: need.category,
    });
  }

  if (rows.length === 0) return null;

  return (
    <div className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-gray-800/80 px-3 py-1.5 border-b border-gray-700 text-center">
        <span className="text-sm font-semibold text-gray-200">Shopping List</span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-2 px-3 pt-1.5 pb-0.5">
        <span className="text-[11px] text-gray-500 uppercase tracking-wide">Stat</span>
        <span className="text-[11px] text-gray-500 uppercase tracking-wide">Type</span>
        <span className="text-[11px] text-gray-500 uppercase tracking-wide">Slots</span>
      </div>

      {/* Stat rows */}
      <div className="px-3 pb-2 space-y-0.5">
        {rows.map((row) => (
          <div key={row.stat} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-2 text-sm">
            <div className="flex items-center gap-1 min-w-0">
              <span className="capitalize font-medium text-gray-100 truncate">{row.stat}</span>
              {row.gap > 0 && (
                <span className="text-[11px] text-gray-500 shrink-0">-{Math.round(row.gap)}</span>
              )}
            </div>
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
              row.pref === "flat"
                ? "bg-blue-400/15 text-blue-300"
                : "bg-blue-600/20 text-blue-400"
            }`}>
              {row.pref === "flat" ? `+${globalValue}` : `${globalValue}%`}
            </span>
            <div className="flex gap-0.5">
              {row.slots.map((slot) => (
                <span key={slot} className="text-xs" title={slot}>{SLOT_EMOJI[slot] ?? slot}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
