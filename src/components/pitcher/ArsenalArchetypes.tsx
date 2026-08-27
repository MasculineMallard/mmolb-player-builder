"use client";

import { useEffect, useMemo, useState } from "react";
import { createJsonCache, isNonArrayObject } from "@/lib/json-cache";
import { computePitchFitPct, computeArchetypeFitPct } from "@/lib/optimizer";
import type { Archetype, PitchTypesMap } from "@/lib/types";

interface ArchetypeMap {
  [key: string]: Archetype;
}

// Self-contained: loads its own pitcher archetypes (mirrors ArchetypeSelect; no
// lifted shared map, per review #5/#20).
const loadPitcherArchetypes = createJsonCache<ArchetypeMap>(
  "/data/archetypes/pitcher_archetypes.json",
  (d): d is ArchetypeMap => isNonArrayObject(d),
);

export interface RankedArchetype {
  key: string;
  arch: Archetype;
  pitchFit: number | null;
  statFit: number;
}

/**
 * Rank pitcher archetypes arsenal-first: by pitch-fit (a pitcher's arsenal is fixed,
 * so it's the primary signal), then stat-fit as the tiebreak, then key for stability.
 * Archetypes with no pitch-fit data sort last. Pure + exported for direct testing.
 * Uses the SAME fit functions the dropdown uses, so the two agree on #1 (review #8).
 */
export function rankArsenalArchetypes(
  archetypes: ArchetypeMap,
  playerStats: Record<string, number>,
  playerPitches: string[],
  pitchTypes: PitchTypesMap,
  level: number,
): RankedArchetype[] {
  const ranked: RankedArchetype[] = Object.entries(archetypes).map(([key, arch]) => ({
    key,
    arch,
    pitchFit: computePitchFitPct(playerPitches, arch, pitchTypes),
    statFit: computeArchetypeFitPct(playerStats, arch, level),
  }));
  ranked.sort((a, b) => {
    const pa = a.pitchFit ?? -1;
    const pb = b.pitchFit ?? -1;
    if (pb !== pa) return pb - pa;
    if (b.statFit !== a.statFit) return b.statFit - a.statFit;
    return a.key.localeCompare(b.key);
  });
  return ranked;
}

interface ArsenalArchetypesProps {
  playerStats: Record<string, number>;
  playerPitches: string[];
  pitchTypes: PitchTypesMap;
  level: number;
  selectedKey: string | null;
  onSelect: (key: string, arch: Archetype) => void;
}

export function ArsenalArchetypes({
  playerStats,
  playerPitches,
  pitchTypes,
  level,
  selectedKey,
  onSelect,
}: ArsenalArchetypesProps) {
  const [archetypes, setArchetypes] = useState<ArchetypeMap>({});

  useEffect(() => {
    let cancelled = false;
    loadPitcherArchetypes()
      .then((d) => { if (!cancelled) setArchetypes(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const ranked = useMemo(() => {
    if (Object.keys(archetypes).length === 0 || playerPitches.length === 0) return [];
    return rankArsenalArchetypes(archetypes, playerStats, playerPitches, pitchTypes, level);
  }, [archetypes, playerStats, playerPitches, pitchTypes, level]);

  if (ranked.length === 0) return null;
  const top = ranked.slice(0, 3);

  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2">
      <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-2">
        <span className="w-0.5 h-3 bg-primary/40 rounded-full" />
        Arsenal-first picks
      </div>
      <p className="text-xs text-muted-foreground mb-2">
        Your pitches are hard to change, so we rank by arsenal first, then by how close your stats
        already are.
      </p>
      <div className="flex flex-col gap-1.5">
        {top.map(({ key, arch, pitchFit, statFit }) => (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key, arch)}
            className={`flex items-center justify-between gap-2 text-left rounded-md border px-2.5 py-1.5 transition-colors ${
              selectedKey === key
                ? "bg-primary/15 border-primary/40"
                : "bg-muted/40 border-border hover:border-primary/40"
            }`}
          >
            <span className="text-sm">
              {arch.emoji ? `${arch.emoji} ` : ""}{arch.name}
            </span>
            <span className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">
              {pitchFit != null ? `${pitchFit}%` : "—"} pitch · {statFit}% stat
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
