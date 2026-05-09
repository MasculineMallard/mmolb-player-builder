"use client";

import { useMemo } from "react";
import type { SlotRecommendation } from "@/lib/item-advisor";
import type { Archetype } from "@/lib/types";
import { calculateStatTargets } from "@/lib/optimizer";
import { STAT_CATEGORIES, CATEGORY_LABELS } from "@/lib/constants";
import { STAT_DISPLAY_MAX, DEFENSE_DISPLAY_MAX } from "@/lib/utils";

interface StatBarPanelProps {
  recommendations: SlotRecommendation[];
  playerStats: Record<string, number>;
  boonMultipliers: Record<string, number>;
  flatMax: number;
  pctMax: number;
  archetype: Archetype;
}

interface StatBar {
  stat: string;
  current: number;
  withFlat: number;
  withPct: number;
  target: number;
  itemSlots: number;
  group: "batting" | "baserunning" | "defense";
}

export function StatBarPanel({
  recommendations,
  playerStats,
  boonMultipliers,
  flatMax,
  pctMax,
  archetype,
}: StatBarPanelProps) {
  const bars = useMemo(() => {
    const { corePer, supportPer } = calculateStatTargets(archetype);
    const prioritySet = new Set(archetype.priority_stats ?? []);
    const secondarySet = new Set(archetype.secondary_stats ?? []);

    const itemContributions = new Map<string, number>();
    for (const rec of recommendations) {
      for (const pick of [...rec.offensivePicks, ...rec.defensivePicks]) {
        itemContributions.set(pick.stat, (itemContributions.get(pick.stat) ?? 0) + 1);
      }
    }

    // Only include stats that are archetype targets OR have item contributions
    const targetStats = new Set<string>([
      ...(archetype.priority_stats ?? []),
      ...(archetype.secondary_stats ?? []),
      ...itemContributions.keys(),
    ]);

    function buildBar(stat: string, group: StatBar["group"]): StatBar | null {
      if (!targetStats.has(stat)) return null;

      const current = playerStats[stat] ?? 0;
      const count = itemContributions.get(stat) ?? 0;
      const boonMult = boonMultipliers[stat] ?? 1.0;
      const target = prioritySet.has(stat) ? corePer : secondarySet.has(stat) ? supportPer : 0;

      const withFlat = count > 0 ? Math.round(current + flatMax * count * boonMult) : current;
      const withPct = count > 0 ? Math.round(current * Math.pow(1 + pctMax / 100, count)) : current;

      return {
        stat, current, withFlat, withPct,
        target, itemSlots: count, group,
      };
    }

    const batting = STAT_CATEGORIES.batting.map((s) => buildBar(s, "batting")).filter((b): b is StatBar => b !== null);
    const baserunning = STAT_CATEGORIES.baserunning.map((s) => buildBar(s, "baserunning")).filter((b): b is StatBar => b !== null);
    const defense = STAT_CATEGORIES.defense.map((s) => buildBar(s, "defense")).filter((b): b is StatBar => b !== null);

    return { batting, baserunning, defense };
  }, [recommendations, playerStats, boonMultipliers, flatMax, pctMax, archetype]);

  const allBars = [...bars.batting, ...bars.baserunning, ...bars.defense];
  if (allBars.length === 0) return null;

  const maxStat = Math.max(...allBars.map((b) => Math.max(b.current, b.withFlat, b.withPct, b.target)), 500);
  const prioritySet = new Set(archetype.priority_stats ?? []);
  const secondarySet = new Set(archetype.secondary_stats ?? []);

  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2 mb-2">
        <span className="w-0.5 h-3.5 bg-primary/40 rounded-full" />
        Projected Build
        <span className="normal-case tracking-normal font-normal text-muted-foreground/70 text-xs">
          if all 5 items target these stats at +{flatMax} flat / {pctMax}%
        </span>
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-12 gap-y-4 md:gap-y-6">
        {bars.batting.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1 border-b border-border pb-0.5">
              {CATEGORY_LABELS.batting}
            </h4>
            <div className="space-y-0.5">
              {bars.batting.map((b) => (
                <BarRow key={b.stat} bar={b} displayMax={STAT_DISPLAY_MAX} isPriority={prioritySet.has(b.stat)} isSecondary={secondarySet.has(b.stat)} />
              ))}
            </div>
          </div>
        )}

        {bars.baserunning.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1 border-b border-border pb-0.5">
              {CATEGORY_LABELS.baserunning}
            </h4>
            <div className="space-y-0.5">
              {bars.baserunning.map((b) => (
                <BarRow key={b.stat} bar={b} displayMax={STAT_DISPLAY_MAX} isPriority={prioritySet.has(b.stat)} isSecondary={secondarySet.has(b.stat)} />
              ))}
            </div>
          </div>
        )}

        {bars.defense.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1 border-b border-border pb-0.5">
              {CATEGORY_LABELS.defense}
            </h4>
            <div className="space-y-0.5">
              {bars.defense.map((b) => (
                <BarRow key={b.stat} bar={b} displayMax={DEFENSE_DISPLAY_MAX} isPriority={false} isSecondary={false} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BarRow({ bar, displayMax, isPriority, isSecondary }: {
  bar: StatBar;
  displayMax: number;
  isPriority: boolean;
  isSecondary: boolean;
}) {
  const currentPct = Math.min((bar.current / displayMax) * 100, 100);
  const flatPct = Math.min((bar.withFlat / displayMax) * 100, 100);
  const pctPct = Math.min((bar.withPct / displayMax) * 100, 100);
  const targetPct = bar.target > 0 ? Math.min((bar.target / displayMax) * 100, 100) : 0;
  const isHighlighted = isPriority || isSecondary;

  // Flat and pct deltas from current
  const flatDelta = bar.withFlat - bar.current;
  const pctDelta = bar.withPct - bar.current;
  const hasImprovement = flatDelta > 0 || pctDelta > 0;

  // Bar segments: grey current, then flat range (light blue), then pct range (dark blue)
  // Show them overlapping from current: the smaller one first, the larger extending further
  const minProjPct = Math.min(flatPct, pctPct);
  const maxProjPct = Math.max(flatPct, pctPct);
  const flatIsSmaller = flatPct <= pctPct;

  // First segment after grey: the smaller projection
  const seg1Pct = minProjPct - currentPct;
  // Second segment: the difference between the two projections
  const seg2Pct = maxProjPct - minProjPct;

  const minDelta = Math.min(flatDelta, pctDelta);
  const maxDelta = Math.max(flatDelta, pctDelta);

  return (
    <div className="py-1 px-1 rounded">
      {/* Stat name | Base | +flat | +pct */}
      <div className="flex items-center mb-0.5">
        <span className="text-sm capitalize text-muted-foreground flex items-center gap-1 flex-1 min-w-0">
          {isHighlighted && (
            <span className={`text-sm ${isPriority ? 'text-primary' : 'text-foreground/60'}`}>★</span>
          )}
          <span className="truncate">{bar.stat}</span>
        </span>
        <span className="flex items-center text-sm font-mono tabular-nums shrink-0">
          <span className="text-gray-400 w-10 text-right">{bar.current}</span>
          {bar.target > 0 && (
            <>
              <span className="text-gray-600 mx-1.5">|</span>
              <span className="text-foreground/50 w-10 text-right">{bar.target}</span>
            </>
          )}
          {hasImprovement && (
            <>
              <span className="text-gray-600 mx-1.5">|</span>
              <span className="text-blue-400/70 w-10 text-right">+{flatDelta}</span>
              <span className="text-gray-600 mx-1.5">|</span>
              <span className="text-blue-400 w-10 text-right">+{pctDelta}</span>
            </>
          )}
        </span>
      </div>

      <div className="h-[13px] bg-muted/80 rounded-full overflow-hidden relative">
        {targetPct > 0 && (
          <div
            className="absolute w-[3px] rounded-full z-10"
            style={{
              left: `${targetPct}%`,
              top: -1,
              bottom: -1,
              backgroundColor: "var(--foreground)",
              opacity: 0.5,
            }}
          />
        )}

        <div className="h-full flex">
          {/* Current — grey */}
          <div className="h-full bg-gray-500/60" style={{ width: `${currentPct}%` }} />
          {/* Shared improvement zone — both flat and pct cover this */}
          {seg1Pct > 0 && (
            <div
              className={`h-full ${flatIsSmaller ? "bg-blue-400/50" : "bg-blue-600/80"}`}
              style={{ width: `${seg1Pct}%` }}
            />
          )}
          {/* Extended zone — only the larger projection reaches here */}
          {seg2Pct > 0.3 && (
            <div
              className={`h-full ${flatIsSmaller ? "bg-blue-600/80" : "bg-blue-400/50"}`}
              style={{ width: `${seg2Pct}%` }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
