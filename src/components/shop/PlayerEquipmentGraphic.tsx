"use client";

import type { SlotRecommendation, SlotName, StatNeed } from "@/lib/item-advisor";
import { SlotCard } from "./SlotCard";
import { ShopSummary } from "./ShopSummary";

interface PlayerEquipmentGraphicProps {
  recommendations: SlotRecommendation[];
  globalValue: number;
  statNeeds: StatNeed[];
}

const SLOT_ORDER: SlotName[] = ["head", "body", "hands", "feet", "charm"];

export function PlayerEquipmentGraphic({
  recommendations,
  globalValue,
  statNeeds,
}: PlayerEquipmentGraphicProps) {
  const recMap = new Map<string, SlotRecommendation>(
    recommendations.map((r) => [r.slot, r]),
  );

  return (
    <div className="space-y-2">
      {/* Shopping list — full width */}
      <ShopSummary recommendations={recommendations} statNeeds={statNeeds} globalValue={globalValue} />

      {/* Item cards — 2-column grid, compact */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
        {SLOT_ORDER.map((slot) => {
          const rec = recMap.get(slot);
          if (!rec) return null;
          return (
            <SlotCard key={slot} recommendation={rec} globalValue={globalValue} statNeeds={statNeeds} />
          );
        })}
      </div>
    </div>
  );
}
