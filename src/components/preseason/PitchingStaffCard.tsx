"use client";

import { useMemo, useState } from "react";
import type { PreseasonPlayerData } from "@/lib/preseason-data";
import { recommendPitchingStaff, type PitchingStaffEntry } from "@/lib/preseason-recommend";

export interface PitchingStaffCardProps {
  pitchers: PreseasonPlayerData[];
  defaultCloserRank?: number;
}

function formatRate(value: number | null | undefined, digits = 2): string {
  return value == null ? "—" : value.toFixed(digits);
}

function PitcherTile({ entry }: { entry: PitchingStaffEntry }) {
  const stats = entry.player.preseasonPitching;
  return (
    <div className="min-w-0 rounded-md border border-border bg-secondary/45 px-2.5 py-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-foreground">{entry.player.name}</div>
          <div className="text-[11px] text-muted-foreground">
            {entry.roleEligible ? `#${entry.rank} · ${entry.blendedScore.toFixed(1)} blend` : `${entry.attributeScore} attr · Depth only`}
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">
          {entry.role === "Starter" ? "SP" : entry.role === "Reliever" ? "RP" : entry.role === "Closer" ? "CL" : "DEPTH"}
        </span>
      </div>
      <div className="mt-1.5 grid grid-cols-3 gap-1 text-center text-[10px] text-muted-foreground">
        <span><strong className="block text-xs text-foreground">{formatRate(stats?.ERA)}</strong>ERA</span>
        <span><strong className="block text-xs text-foreground">{formatRate(stats?.WHIP)}</strong>WHIP</span>
        <span><strong className="block text-xs text-foreground">{formatRate(stats?.K9, 1)}</strong>K/9</span>
      </div>
      {entry.lowSample && (
        <div className="mt-1.5 text-[10px] font-medium text-yellow-500">Low sample · leaning on attributes</div>
      )}
    </div>
  );
}

export function PitchingStaffCard({ pitchers, defaultCloserRank = 4 }: PitchingStaffCardProps) {
  const [closerRank, setCloserRank] = useState(defaultCloserRank);
  const recommendation = useMemo(
    () => recommendPitchingStaff(pitchers, closerRank),
    [pitchers, closerRank],
  );
  const starters = recommendation.entries.filter((entry) => entry.role === "Starter");
  const closer = recommendation.entries.find((entry) => entry.role === "Closer");
  const relievers = recommendation.entries.filter((entry) => entry.role === "Reliever");
  const depth = recommendation.entries.filter((entry) => entry.role === "Depth");

  if (pitchers.length === 0) {
    return (
      <section data-testid="pitching-staff-card" className="rounded-lg border border-border bg-card px-4 py-6 text-center">
        <h2 className="font-semibold text-foreground">Recommended Pitching Staff</h2>
        <p className="mt-1 text-sm text-muted-foreground">No pitchers are available for this roster.</p>
      </section>
    );
  }

  return (
    <section data-testid="pitching-staff-card" className="rounded-lg border border-border bg-card p-3">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-semibold text-foreground">Recommended Pitching Staff</h2>
          <p className="text-xs text-muted-foreground">75% Offseason performance · 25% underlying attributes</p>
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Closer rank
          <select
            aria-label="Closer rank"
            value={recommendation.closerRank ?? ""}
            disabled={recommendation.eligibleCount === 0}
            onChange={(event) => setCloserRank(Number(event.target.value))}
            className="rounded-md border border-border bg-secondary px-2 py-1 text-sm font-semibold text-foreground disabled:opacity-50"
          >
            {Array.from({ length: recommendation.eligibleCount }, (_, index) => index + 1).map((rank) => (
              <option key={rank} value={rank}>#{rank}</option>
            ))}
          </select>
        </label>
      </div>

      {recommendation.eligibleCount === 0 ? (
        <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-3 text-sm text-yellow-500">
          No pitcher has reached the 3 IP recommendation floor yet. Everyone remains Depth until the sample grows.
        </div>
      ) : (
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_13rem]">
          <div>
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rotation</h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5 xl:grid-cols-5">
              {starters.map((entry) => <PitcherTile key={entry.player.mmolbPlayerId} entry={entry} />)}
            </div>
            {relievers.length > 0 && (
              <>
                <h3 className="mb-1.5 mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bullpen</h3>
                <div className="grid gap-2 sm:grid-cols-3">
                  {relievers.map((entry) => <PitcherTile key={entry.player.mmolbPlayerId} entry={entry} />)}
                </div>
              </>
            )}
          </div>
          <div>
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Closer</h3>
            {closer && (
              <div className="rounded-lg border-2 border-primary bg-primary/10 p-1">
                <PitcherTile entry={closer} />
              </div>
            )}
          </div>
        </div>
      )}

      {depth.length > 0 && (
        <div className="mt-3 border-t border-border pt-2">
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Depth</h3>
          <div className="flex flex-wrap gap-1.5">
            {depth.map((entry) => (
              <span key={entry.player.mmolbPlayerId} className="rounded-md bg-secondary px-2 py-1 text-xs text-muted-foreground">
                {entry.player.name}{!entry.roleEligible ? " · below 3 IP" : ""}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
