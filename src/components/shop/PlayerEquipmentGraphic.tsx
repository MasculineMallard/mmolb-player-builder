"use client";

import type { Archetype, PlayerData } from "@/lib/types";
import type { SlotRecommendation, SlotName, StatNeed } from "@/lib/item-advisor";
import { SlotCard } from "./SlotCard";
import { ShopSummary } from "./ShopSummary";

interface PlayerEquipmentGraphicProps {
  player: PlayerData;
  archetype: Archetype;
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
    <div className="flex gap-2 flex-wrap">
      {/* Shopping list card — same height as item cards */}
      <div className="flex-1 min-w-[130px]">
        <ShopSummary recommendations={recommendations} statNeeds={statNeeds} globalValue={globalValue} />
      </div>

      {/* Item cards: Helmet, Jersey, Gloves, Boots, Charm */}
      {SLOT_ORDER.map((slot) => {
        const rec = recMap.get(slot);
        if (!rec) return null;
        return (
          <div key={slot} className="flex-1 min-w-[130px]">
            <SlotCard recommendation={rec} globalValue={globalValue} />
          </div>
        );
      })}
    </div>
  );
}
