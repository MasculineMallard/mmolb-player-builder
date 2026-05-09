"use client";

import { useMemo } from "react";
import type { BoonScore } from "@/lib/advisor";
import type { BoonEmojiMap } from "@/hooks/use-boon-emojis";

interface BoonAdvisorProps {
  scoredBoons: BoonScore[];
  takenBoons: string[];
  boonEmojis: BoonEmojiMap;
  /** Scored entries for the player's current boons (for comparison) */
  currentBoonScores: BoonScore[];
}

const TIER_COLORS: Record<string, string> = {
  T1: "#FFD700",
  T2: "#60A5FA",
  T3: "#6B7280",
  "off-role": "#4B5563",
};

function TierBadge({ tier }: { tier: string }) {
  return (
    <span
      className="text-[11px] font-bold px-1 py-px rounded"
      style={{
        color: TIER_COLORS[tier] ?? "#6B7280",
        backgroundColor: `${TIER_COLORS[tier] ?? "#6B7280"}20`,
        border: `1px solid ${TIER_COLORS[tier] ?? "#6B7280"}40`,
      }}
    >
      {tier === "off-role" ? "N/A" : tier}
    </span>
  );
}

function BoonRow({ entry, rank }: { entry: BoonScore; rank?: number }) {
  const netPoints = entry.absoluteGain - entry.absoluteLoss;
  return (
    <>
      <span className="text-sm text-muted-foreground text-right self-center">{rank ?? ""}</span>
      <span className="text-lg self-center">{entry.emoji}</span>
      <div className="min-w-0 self-center">
        <div className="text-[15px] font-medium truncate">{entry.boonName}</div>
        <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <TierBadge tier={entry.bonusTier} />
          <span className="text-green-400">+{entry.absoluteGain} {entry.bonusStatDisplay}</span>
          <span className="text-muted-foreground/50">/</span>
          <TierBadge tier={entry.penaltyTier} />
          <span className="text-red-400">-{entry.absoluteLoss} {entry.penaltyStatDisplay}</span>
        </div>
      </div>
      <div className="self-center">
        <div className="text-[15px] font-bold" style={{ color: netPoints >= 0 ? "#60A5FA" : "#E8A735" }}>
          {netPoints >= 0 ? "+" : ""}{netPoints}
        </div>
        <div className="text-[11px] text-muted-foreground">
          {Math.round(entry.score)} pts
        </div>
      </div>
    </>
  );
}

export function BoonAdvisor({ scoredBoons, takenBoons, boonEmojis, currentBoonScores }: BoonAdvisorProps) {
  const top6 = useMemo(() => scoredBoons.slice(0, 6), [scoredBoons]);

  if (top6.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-2">
        <span className="w-0.5 h-3 bg-primary/40 rounded-full" />
        Boon Advisor
      </h3>

      <div className="grid grid-cols-[auto_auto_auto_auto] justify-between gap-y-2">
        {top6.map((entry, i) => (
          <BoonRow key={entry.boonName} entry={entry} rank={i + 1} />
        ))}
      </div>
    </div>
  );
}
