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
      className="text-[10px] font-bold px-1 py-px rounded"
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
    <div className="flex items-center gap-2 py-1.5 border-b border-border/30 last:border-0">
      {rank != null && (
        <span className="text-xs text-muted-foreground w-4 text-right shrink-0">{rank}</span>
      )}
      <span className="text-base shrink-0">{entry.emoji}</span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">{entry.boonName}</div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <TierBadge tier={entry.bonusTier} />
          <span className="text-green-400">+{entry.absoluteGain} {entry.bonusStatDisplay}</span>
          <span className="text-muted-foreground/50">/</span>
          <TierBadge tier={entry.penaltyTier} />
          <span className="text-red-400">-{entry.absoluteLoss} {entry.penaltyStatDisplay}</span>
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm font-bold" style={{ color: netPoints >= 0 ? "#60A5FA" : "#E8A735" }}>
          {netPoints >= 0 ? "+" : ""}{netPoints}
        </div>
        <div className="text-[10px] text-muted-foreground">
          {Math.round(entry.score)} pts
        </div>
      </div>
    </div>
  );
}

export function BoonAdvisor({ scoredBoons, takenBoons, boonEmojis, currentBoonScores }: BoonAdvisorProps) {
  const top6 = useMemo(() => scoredBoons.slice(0, 6), [scoredBoons]);
  const hasCurrentBoons = currentBoonScores.length > 0;

  // Check if any top recommendation scores higher than a current boon
  const lowestCurrentScore = hasCurrentBoons
    ? Math.min(...currentBoonScores.map(b => b.score))
    : Infinity;
  const hasUpgrade = top6.length > 0 && top6[0].score > lowestCurrentScore;

  if (top6.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 h-full">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
        <span className="w-0.5 h-3 bg-primary/40 rounded-full" />
        Boon Advisor
        {hasUpgrade && (
          <span className="text-[10px] font-bold text-[#FFD700] bg-[#FFD700]/10 border border-[#FFD700]/30 px-1.5 py-px rounded-full ml-auto">
            Upgrade Available
          </span>
        )}
      </h3>

      {hasCurrentBoons && (
        <div className="mb-2">
          <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Current Boons
          </div>
          {currentBoonScores.map((entry) => (
            <BoonRow key={entry.boonName} entry={entry} />
          ))}
        </div>
      )}

      <div>
        <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
          {hasCurrentBoons ? "Top Recommendations" : "Recommended Boons"}
        </div>
        {top6.map((entry, i) => (
          <BoonRow key={entry.boonName} entry={entry} rank={i + 1} />
        ))}
      </div>
    </div>
  );
}
