"use client";

import { useMemo, useState } from "react";
import {
  recommendBattingOrder,
  type BattingOrderEntry,
  type BattingOrderMode,
  type BattingOrderRec,
} from "@/lib/preseason-recommend";

export interface BattingLineupCardProps {
  recommendation: BattingOrderRec;
}

const ORDER_MODES: Array<{ value: BattingOrderMode; label: string }> = [
  { value: "recommended", label: "Recommended" },
  { value: "OBP", label: "OBP" },
  { value: "OPS", label: "OPS" },
  { value: "SLG", label: "SLG" },
  { value: "SO%", label: "Lowest SO%" },
];

function barWidth(entry: BattingOrderEntry): number {
  if (entry.value == null) return 0;
  if (entry.driver === "SO%") return Math.min(100, Math.max(3, 100 - ((entry.value / 0.5) * 100)));
  const visualCeiling = entry.driver === "OBP" ? 0.55 : entry.driver === "SLG" ? 0.85 : 1.35;
  return Math.min(100, Math.max(3, (entry.value / visualCeiling) * 100));
}

function formatValue(entry: BattingOrderEntry): string {
  if (entry.value == null) return "—";
  return entry.driver === "SO%" ? `${(entry.value * 100).toFixed(1)}%` : entry.value.toFixed(3);
}

function formatStrikeoutRate(entry: BattingOrderEntry): string {
  const value = entry.player.preseasonBatting?.SO_PCT;
  return value == null ? "—" : `${(value * 100).toFixed(1)}%`;
}

export function BattingLineupCard({ recommendation }: BattingLineupCardProps) {
  const [mode, setMode] = useState<BattingOrderMode>("recommended");
  const allBatters = useMemo(
    () => [...recommendation.lineup.map((entry) => entry.player), ...recommendation.unplaced],
    [recommendation],
  );
  const displayedRecommendation = useMemo(
    () => mode === "recommended" ? recommendation : recommendBattingOrder(allBatters, mode),
    [allBatters, mode, recommendation],
  );

  if (displayedRecommendation.lineup.length === 0) {
    return (
      <section data-testid="batting-lineup-card" className="rounded-xl border border-border bg-card px-4 py-10 text-center">
        <h2 className="font-semibold text-foreground">Recommended Batting Order</h2>
        <p className="mt-1 text-sm text-muted-foreground">No batter has reached the 10 PA lineup floor yet.</p>
      </section>
    );
  }

  return (
    <section data-testid="batting-lineup-card" className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Recommended Batting Order</h2>
            <p className="text-xs text-muted-foreground">Default: 1–2 OBP · 3–4 SLG · 5–9 OPS</p>
          </div>
          <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Order by
            <select
              aria-label="Batting order sort"
              value={mode}
              onChange={(event) => setMode(event.target.value as BattingOrderMode)}
              className="min-w-44 rounded-lg border-2 border-primary/70 bg-secondary px-3 py-2 text-sm font-bold normal-case tracking-normal text-foreground shadow-sm outline-none focus:ring-2 focus:ring-primary/40"
            >
              {ORDER_MODES.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>

        {mode !== "recommended" && (
          <div className="mb-3 rounded-lg border border-primary/25 bg-primary/10 px-3 py-2 text-xs text-muted-foreground">
            Viewing a custom sort. The defensive tab keeps the default recommended starting nine.
          </div>
        )}

        <ol className="space-y-2">
          {displayedRecommendation.lineup.map((entry) => (
            <li
              key={entry.player.mmolbPlayerId}
              className="relative min-h-16 overflow-hidden rounded-lg border border-border bg-secondary/40 px-3 py-3 sm:min-h-18 sm:px-4"
            >
              <div
                aria-hidden="true"
                className="absolute inset-y-0 left-0 bg-primary/10"
                style={{ width: `${barWidth(entry)}%` }}
              />
              <div className="relative flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-base font-black text-primary-foreground shadow-sm">
                  {entry.slot}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-base font-semibold text-foreground">{entry.player.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {entry.lowSample ? "Low sample · " : ""}{entry.player.sampleSize.PA} PA
                    <span className="ml-2 border-l border-border pl-2">
                      SO% <strong className="font-mono text-foreground">{formatStrikeoutRate(entry)}</strong>
                    </span>
                  </div>
                </div>
                <div className="min-w-16 text-right">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-primary">{entry.driver}</div>
                  <div className="font-mono text-base font-bold text-foreground">{formatValue(entry)}</div>
                </div>
              </div>
            </li>
          ))}
        </ol>

        {displayedRecommendation.incomplete && (
          <div className="mt-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-500">
            Lineup incomplete: fewer than nine batters have reached 10 Offseason PA.
          </div>
        )}
      </div>
    </section>
  );
}
