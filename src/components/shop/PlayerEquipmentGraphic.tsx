"use client";

import type { SlotRecommendation, SlotName, StatNeed } from "@/lib/item-advisor";
import { SlotCard } from "./SlotCard";
import { ShopSummary } from "./ShopSummary";

interface PlayerEquipmentGraphicProps {
  recommendations: SlotRecommendation[];
  flatMax: number;
  pctMax: number;
  statNeeds: StatNeed[];
}

const SLOT_ORDER: SlotName[] = ["head", "body", "hands", "feet", "charm"];

export function PlayerEquipmentGraphic({
  recommendations,
  flatMax,
  pctMax,
  statNeeds,
}: PlayerEquipmentGraphicProps) {
  const recMap = new Map<string, SlotRecommendation>(
    recommendations.map((r) => [r.slot, r]),
  );

  return (
    <div className="flex gap-2 flex-wrap">
      <div className="flex-1 min-w-[140px]">
        <ShopSummary recommendations={recommendations} statNeeds={statNeeds} flatMax={flatMax} pctMax={pctMax} />
      </div>
      {SLOT_ORDER.map((slot) => {
        const rec = recMap.get(slot);
        if (!rec) return null;
        return (
          <div key={slot} className="flex-1 min-w-[120px]">
            <SlotCard recommendation={rec} flatMax={flatMax} pctMax={pctMax} statNeeds={statNeeds} />
          </div>
        );
      })}
    </div>
  );
}
