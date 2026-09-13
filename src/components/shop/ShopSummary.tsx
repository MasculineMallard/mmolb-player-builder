"use client";

import type { SlotRecommendation, StatNeed, SlotName } from "@/lib/item-advisor";
import { SLOT_META } from "@/lib/item-advisor";
import { ResponsiveStatLabel } from "./ResponsiveStatLabel";

interface ShopSummaryProps {
  recommendations: SlotRecommendation[];
  statNeeds: StatNeed[];
  flatMax: number;
  pctMax: number;
}

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
    <div data-testid="shopping-list-card" className="flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-gray-700 bg-gray-900/90 backdrop-blur-sm">
      {/* Header */}
      <div className="bg-gray-800/80 px-3 py-1.5 border-b border-gray-700 text-center">
        <span className="text-sm font-semibold text-gray-200">Shopping List</span>
      </div>

      {/* Stat rows */}
      <div className="px-3 py-2 space-y-0.5">
        {rows.map((row) => (
          <div data-testid="shopping-list-row" key={row.stat} className="grid h-[22px] grid-cols-3 items-center text-left text-sm">
            <div className="flex min-w-0 items-center justify-start gap-1.5">
              <span className="truncate capitalize font-medium text-gray-100">
                <ResponsiveStatLabel stat={row.stat} abbreviateLong />
              </span>
              {row.gap > 0 && <span className="text-xs text-gray-500">-{Math.round(row.gap)}</span>}
            </div>
            <span className={`font-mono text-xs ${row.pref === "flat" ? "text-sky-200" : "text-blue-400"}`}>
              {row.pref === "flat" ? `+${flatMax}` : `${pctMax}%`}
            </span>
            <span className="flex justify-start gap-0.5">
              {row.slots.map((s) => <span key={s} className="text-xs" title={s}>{SLOT_META[s as SlotName]?.emoji}</span>)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
