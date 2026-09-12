"use client";

import type { SlotRecommendation, SlotName, StatNeed } from "@/lib/item-advisor";
import type { PlayerEquipment } from "@/lib/types";
import { SlotCard } from "./SlotCard";
import { ShopSummary } from "./ShopSummary";

interface PlayerEquipmentGraphicProps {
  recommendations: SlotRecommendation[];
  flatMax: number;
  pctMax: number;
  statNeeds: StatNeed[];
  equipment?: PlayerEquipment;
}

const SLOT_ORDER: SlotName[] = ["head", "body", "hands", "feet", "charm"];

/** Score how far a slot's current item is from ideal (higher = worse match, shop here) */
function slotMismatchScore(rec: SlotRecommendation, equipment?: PlayerEquipment): number {
  if (!equipment) return 0;
  const item = equipment[rec.slot];
  if (!item) return 100; // no item at all = worst
  const allPicks = [...rec.offensivePicks, ...rec.defensivePicks];
  let misses = 0;
  for (const pick of allPicks) {
    const has = item.effects.some((e) => e.attribute === pick.stat);
    if (!has) misses++;
  }
  return misses;
}

export function PlayerEquipmentGraphic({
  recommendations,
  flatMax,
  pctMax,
  statNeeds,
  equipment,
}: PlayerEquipmentGraphicProps) {
  const recMap = new Map<string, SlotRecommendation>(
    recommendations.map((r) => [r.slot, r]),
  );

  // Blue stars: top 2 by stat priority score (priority 1 = best)
  const sortedByPriority = [...recommendations].sort((a, b) => a.priority - b.priority);
  const topStatSlots = new Set(sortedByPriority.slice(0, 2).map((r) => r.slot));

  // Yellow stars: top 2 by mismatch score (worst current items)
  const mismatchScores = recommendations.map((r) => ({
    slot: r.slot,
    score: slotMismatchScore(r, equipment),
  }));
  mismatchScores.sort((a, b) => b.score - a.score);
  const topShopSlots = new Set(
    mismatchScores
      .filter((m) => m.score > 0)
      .slice(0, 2)
      .map((m) => m.slot),
  );

  return (
    <div data-testid="player-equipment-grid" className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
      <div data-testid="shop-summary-row" className="col-span-2 sm:col-span-3 xl:col-span-5">
        <ShopSummary recommendations={recommendations} statNeeds={statNeeds} flatMax={flatMax} pctMax={pctMax} />
      </div>
      {SLOT_ORDER.map((slot) => {
        const rec = recMap.get(slot);
        if (!rec) return null;
        return (
          <div key={slot} className="min-w-0">
            <SlotCard
              recommendation={rec}
              flatMax={flatMax}
              pctMax={pctMax}
              statNeeds={statNeeds}
              equipment={equipment?.[slot]}
              isStatPriority={topStatSlots.has(slot)}
              isShopPriority={topShopSlots.has(slot)}
            />
          </div>
        );
      })}
    </div>
  );
}
