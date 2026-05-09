"use client";

import type { SlotRecommendation } from "@/lib/item-advisor";
import type { StatNeed } from "@/lib/item-advisor";
import type { EquipmentSlot } from "@/lib/types";

interface SlotCardProps {
  recommendation: SlotRecommendation;
  flatMax: number;
  pctMax: number;
  statNeeds: StatNeed[];
  equipment?: EquipmentSlot;
  isStatPriority: boolean;
  isShopPriority: boolean;
}

function preferredType(stat: string, statNeeds: StatNeed[], flatMax: number, pctMax: number): "flat" | "pct" {
  const need = statNeeds.find((n) => n.stat === stat);
  if (!need) return "flat";
  const flatGain = flatMax * Math.max(need.boonMultiplier, 1.0);
  const pctGain = need.currentValue * (pctMax / 100);
  return pctGain > flatGain ? "pct" : "flat";
}

/** Summarize what the current item gives for a stat (e.g. "23+17%" or "—") */
function formatHas(stat: string, equipment?: EquipmentSlot): string {
  if (!equipment) return "";
  const matches = equipment.effects.filter((e) => e.attribute === stat);
  if (matches.length === 0) return "—";
  return matches.map((e) => e.type === "flat" ? `${e.value}` : `${e.value}%`).join("+");
}

/** Compute diff between current item and ideal for a stat */
function computeDiff(stat: string, pref: "flat" | "pct", idealValue: number, equipment?: EquipmentSlot): { value: string; isPos: boolean } | null {
  if (!equipment) return null;
  const matches = equipment.effects.filter((e) => e.attribute === stat);
  if (matches.length === 0) {
    // No coverage at all
    return { value: pref === "flat" ? `-${idealValue}` : `-${idealValue}%`, isPos: false };
  }
  // Find the best matching effect of the same type as ideal
  const sameType = matches.filter((e) => e.type === pref);
  if (sameType.length > 0) {
    const best = Math.max(...sameType.map((e) => e.value));
    const diff = best - idealValue;
    const suffix = pref === "pct" ? "%" : "";
    return { value: diff >= 0 ? `+${diff}${suffix}` : `${diff}${suffix}`, isPos: diff >= 0 };
  }
  // Has the stat but different type
  const total = matches.reduce((s, e) => s + e.value, 0);
  return { value: `~${total}`, isPos: total >= idealValue };
}

function StatRow({ stat, isDefense, pref, flatMax, pctMax, equipment }: {
  stat: string;
  isDefense: boolean;
  pref: "flat" | "pct";
  flatMax: number;
  pctMax: number;
  equipment?: EquipmentSlot;
}) {
  const idealValue = pref === "flat" ? flatMax : pctMax;
  const has = equipment ? formatHas(stat, equipment) : null;
  const diff = equipment ? computeDiff(stat, pref, idealValue, equipment) : null;

  return (
    <div className="grid grid-cols-4 items-center text-[12px] h-[22px] px-0.5">
      <span className={`capitalize font-medium truncate ${isDefense ? "text-yellow-400" : "text-gray-100"}`}>
        {stat}
      </span>
      {has !== null ? (
        <span className="text-right font-mono text-gray-500 truncate">{has}</span>
      ) : (
        <span />
      )}
      <span className={`text-right font-mono ${pref === "flat" ? "text-sky-200" : "text-blue-400"}`}>
        {pref === "flat" ? `+${flatMax}` : `${pctMax}%`}
      </span>
      {diff !== null ? (
        <span className={`text-right font-mono ${diff.isPos ? "text-green-400" : "text-red-400"}`}>
          {diff.value}
        </span>
      ) : (
        <span />
      )}
    </div>
  );
}

export function SlotCard({ recommendation: rec, flatMax, pctMax, statNeeds, equipment, isStatPriority, isShopPriority }: SlotCardProps) {
  const hasEquipment = !!equipment;

  return (
    <div className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-gray-800/80 px-3 py-1.5 border-b border-gray-700 flex items-center gap-1.5 justify-center">
        <span className="text-base">{rec.emoji}</span>
        <span className="text-sm font-semibold text-gray-200">{rec.label}</span>
        {isStatPriority && <span className="text-[10px] text-blue-400">★</span>}
        {isShopPriority && <span className="text-[10px] text-yellow-400">★</span>}
      </div>

      {/* Column headers */}
      {hasEquipment && (
        <div className="grid grid-cols-4 items-center px-3 pt-1 text-[10px] text-gray-500 uppercase tracking-wide">
          <span>stat</span>
          <span className="text-right">has</span>
          <span className="text-right">ideal</span>
          <span className="text-right">diff</span>
        </div>
      )}

      {/* Offensive stats */}
      <div className="px-2.5 pt-1 pb-0.5">
        {rec.offensivePicks.map((pick) => (
          <StatRow
            key={pick.stat}
            stat={pick.stat}
            isDefense={false}
            pref={preferredType(pick.stat, statNeeds, flatMax, pctMax)}
            flatMax={flatMax}
            pctMax={pctMax}
            equipment={equipment}
          />
        ))}
      </div>

      {/* Divider */}
      {rec.offensivePicks.length > 0 && rec.defensivePicks.length > 0 && (
        <div className="px-3"><div className="border-t border-gray-600 my-0.5" /></div>
      )}

      {/* Defense stats */}
      {rec.defensivePicks.length > 0 && (
        <div className="px-2.5 pt-0.5 pb-1.5">
          {rec.defensivePicks.map((pick) => (
            <StatRow
              key={pick.stat}
              stat={pick.stat}
              isDefense={true}
              pref={preferredType(pick.stat, statNeeds, flatMax, pctMax)}
              flatMax={flatMax}
              pctMax={pctMax}
              equipment={equipment}
            />
          ))}
        </div>
      )}
    </div>
  );
}
