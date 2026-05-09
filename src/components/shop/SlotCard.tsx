"use client";

import type { SlotRecommendation } from "@/lib/item-advisor";

export interface StatConfig {
  type: "flat" | "pct";
  value: number;
}

interface SlotCardProps {
  recommendation: SlotRecommendation;
  globalValue: number;
}

const OFF_SLOTS = 3;
const DEF_SLOTS = 2;

export function SlotCard({ recommendation: rec, globalValue }: SlotCardProps) {
  // Pad to fixed counts so all cards are the same height
  const offRows = Array.from({ length: OFF_SLOTS }, (_, i) => rec.offensivePicks[i] ?? null);
  const defRows = Array.from({ length: DEF_SLOTS }, (_, i) => rec.defensivePicks[i] ?? null);

  return (
    <div className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-gray-800/80 px-3 py-1.5 border-b border-gray-700 flex items-center gap-1.5 justify-center">
        <span className="text-base">{rec.emoji}</span>
        <span className="text-sm font-semibold text-gray-200">{rec.label}</span>
      </div>

      {/* Offensive stats (white text) */}
      <div className="px-3 pt-2 pb-1 space-y-0.5">
        {offRows.map((pick, i) => (
          <div key={pick?.stat ?? `off-empty-${i}`} className="flex items-center justify-between text-sm h-[22px]">
            {pick ? (
              <>
                <span className="capitalize font-medium text-gray-100">{pick.stat}</span>
                <span className="text-gray-500 text-xs font-mono">+{globalValue}</span>
              </>
            ) : (
              <span className="text-gray-700 text-xs">&mdash;</span>
            )}
          </div>
        ))}
      </div>

      {/* Divider — always show */}
      <div className="px-3">
        <div className="border-t border-gray-600 my-1" />
      </div>

      {/* Defense stats (yellow text) */}
      <div className="px-3 pt-1 pb-2 space-y-0.5">
        {defRows.map((pick, i) => (
          <div key={pick?.stat ?? `def-empty-${i}`} className="flex items-center justify-between text-sm h-[22px]">
            {pick ? (
              <>
                <span className="capitalize font-medium text-yellow-400">{pick.stat}</span>
                <span className="text-gray-500 text-xs font-mono">+{globalValue}</span>
              </>
            ) : (
              <span className="text-gray-700 text-xs">&mdash;</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
