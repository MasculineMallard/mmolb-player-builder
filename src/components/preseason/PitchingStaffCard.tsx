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

function PitcherTile({
  entry,
  onToggleStarter,
  forceDisabled,
}: {
  entry: PitchingStaffEntry;
  onToggleStarter: (playerId: string) => void;
  forceDisabled: boolean;
}) {
  const stats = entry.player.preseasonPitching;
  return (
    <div data-testid={`pitcher-tile-${entry.player.mmolbPlayerId}`} className={`min-w-0 rounded-lg border px-2.5 py-2 ${entry.forcedStarter ? "border-primary bg-primary/10 shadow-sm" : "border-border bg-secondary/45"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-foreground">{entry.player.name}</div>
          <div className="text-[11px] text-muted-foreground">
            {entry.roleEligible
              ? `#${entry.rank} · ${entry.blendedScore.toFixed(1)} blend`
              : `#${entry.rank} · ${entry.attributeScore} attr fallback`}
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
        <div className="mt-1.5 text-[10px] font-medium text-yellow-500">
          {entry.roleEligible ? "Low sample · results still volatile" : "Below 3 IP · attribute fallback"}
        </div>
      )}
      {entry.role !== "Closer" && (
        <button
          type="button"
          onClick={() => onToggleStarter(entry.player.mmolbPlayerId)}
          disabled={forceDisabled && !entry.forcedStarter}
          aria-pressed={entry.forcedStarter}
          className={`mt-2 w-full rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${entry.forcedStarter ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background/50 text-muted-foreground hover:border-primary hover:text-foreground"}`}
        >
          {entry.forcedStarter ? "Forced SP · click to release" : "Force as SP"}
        </button>
      )}
    </div>
  );
}

export function PitchingStaffCard({ pitchers, defaultCloserRank = 4 }: PitchingStaffCardProps) {
  const [closerRank, setCloserRank] = useState(defaultCloserRank);
  const [forcedStarterIds, setForcedStarterIds] = useState<Set<string>>(() => new Set());
  const recommendation = useMemo(
    () => recommendPitchingStaff(pitchers, closerRank, forcedStarterIds),
    [pitchers, closerRank, forcedStarterIds],
  );
  const starters = recommendation.entries.filter((entry) => entry.role === "Starter");
  const closer = recommendation.entries.find((entry) => entry.role === "Closer");
  const relievers = recommendation.entries.filter((entry) => entry.role === "Reliever");
  const depth = recommendation.entries.filter((entry) => entry.role === "Depth");
  const closerCandidates = recommendation.entries.filter((entry) => !entry.forcedStarter);

  const toggleForcedStarter = (playerId: string) => {
    setForcedStarterIds((current) => {
      const next = new Set(current);
      if (next.has(playerId)) next.delete(playerId);
      else if (next.size < 5) next.add(playerId);
      return next;
    });
  };
  const forceDisabled = forcedStarterIds.size >= 5;

  if (pitchers.length === 0) {
    return (
      <section data-testid="pitching-staff-card" className="rounded-lg border border-border bg-card px-4 py-6 text-center">
        <h2 className="font-semibold text-foreground">Recommended Pitching Staff</h2>
        <p className="mt-1 text-sm text-muted-foreground">No pitchers are available for this roster.</p>
      </section>
    );
  }

  return (
    <section data-testid="pitching-staff-card" className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground">Recommended Pitching Staff</h2>
        <p className="text-xs text-muted-foreground">5 starters · 3 relief pitchers · 1 closer · 75% Offseason performance / 25% attributes</p>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">Starting rotation</h3>
          <span className="rounded-full bg-secondary px-2 py-1 text-xs font-semibold text-muted-foreground">{starters.length}/5 SP</span>
        </div>
        <p className="mb-2 text-xs text-muted-foreground">Click “Force as SP” on any arm—including a pitcher below 3 IP—to lock them into the rotation.</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {starters.map((entry) => (
            <PitcherTile
              key={entry.player.mmolbPlayerId}
              entry={entry}
              onToggleStarter={toggleForcedStarter}
              forceDisabled={forceDisabled}
            />
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-border bg-background/25 p-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">Relief pitchers</h3>
          <span className="rounded-full bg-primary/15 px-2 py-1 text-xs font-bold text-primary">{relievers.length}/3 RP</span>
        </div>
        <div data-testid="relief-grid" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div data-testid="closer-selector" className="min-w-0 rounded-lg border-2 border-primary/60 bg-primary/10 px-2.5 py-2 shadow-[0_0_18px_rgb(59_130_246/0.1)]">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="text-[11px] font-black uppercase tracking-wide text-primary">Choose your closer</span>
              <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">CL</span>
            </div>
            <select
              aria-label="Closer rank"
              value={recommendation.closerRank ?? ""}
              disabled={closerCandidates.length === 0}
              onChange={(event) => setCloserRank(Number(event.target.value))}
              className="w-full rounded-md border border-primary/70 bg-card px-2 py-1.5 text-xs font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
            >
              {closerCandidates.map((entry) => (
                <option key={entry.player.mmolbPlayerId} value={entry.rank ?? 1}>
                  #{entry.rank} — {entry.player.name}
                </option>
              ))}
            </select>
            {closer && (
              <div data-testid={`pitcher-tile-${closer.player.mmolbPlayerId}`} className="mt-1.5">
                <div className="truncate text-sm font-semibold text-foreground">{closer.player.name}</div>
                <div className="mt-1 grid grid-cols-3 gap-1 text-center text-[10px] text-muted-foreground">
                  <span><strong className="block text-xs text-foreground">{formatRate(closer.player.preseasonPitching?.ERA)}</strong>ERA</span>
                  <span><strong className="block text-xs text-foreground">{formatRate(closer.player.preseasonPitching?.WHIP)}</strong>WHIP</span>
                  <span><strong className="block text-xs text-foreground">{formatRate(closer.player.preseasonPitching?.K9, 1)}</strong>K/9</span>
                </div>
              </div>
            )}
          </div>
          {relievers.map((entry) => (
            <PitcherTile
              key={entry.player.mmolbPlayerId}
              entry={entry}
              onToggleStarter={toggleForcedStarter}
              forceDisabled={forceDisabled}
            />
          ))}
          {Array.from({ length: Math.max(0, 3 - relievers.length) }, (_, index) => (
            <div key={`rp-vacancy-${index}`} className="flex min-h-28 items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
              RP slot open
            </div>
          ))}
        </div>
      </div>

      {depth.length > 0 && (
        <div className="mt-5 border-t border-border pt-4">
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">Depth / alternate arms</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {depth.map((entry) => (
              <PitcherTile
                key={entry.player.mmolbPlayerId}
                entry={entry}
                onToggleStarter={toggleForcedStarter}
                forceDisabled={forceDisabled}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
