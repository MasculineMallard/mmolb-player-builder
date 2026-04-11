"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { usePlayerStore } from "@/store/player-store";
import { isAbortError } from "@/lib/utils";
import { createJsonCache, isNonArrayObject } from "@/lib/json-cache";
import { STAT_CATEGORIES } from "@/lib/constants";
import { calculateFitTargets } from "@/lib/mechanics";
import { computePitchFitPct } from "@/lib/optimizer";
import type { Archetype, PitchTypesMap } from "@/lib/types";

interface ArchetypeSelectProps {
  playerType: "pitcher" | "batter";
  onArchetypeChange: (archetype: Archetype | null) => void;
  pitchTypes?: PitchTypesMap;
  playerPitches?: string[];
}

interface ArchetypeMap {
  [key: string]: Archetype;
}

const archetypeLoaders: Record<string, () => Promise<ArchetypeMap>> = {};

function getArchetypeLoader(playerType: string): () => Promise<ArchetypeMap> {
  if (!archetypeLoaders[playerType]) {
    archetypeLoaders[playerType] = createJsonCache<ArchetypeMap>(
      `/data/archetypes/${playerType}_archetypes.json`,
      (d): d is ArchetypeMap => isNonArrayObject(d)
    );
  }
  return archetypeLoaders[playerType];
}

/** Compute level-normalized fit % of a player's stats against an archetype */
function computeFitPct(stats: Record<string, number>, arch: Archetype, level: number): number {
  const prioritySet = new Set(arch.priority_stats ?? []);
  const nCore = (arch.priority_stats ?? []).length;
  const nSupport = (arch.secondary_stats ?? []).length;
  const { coreTarget, supportTarget } = calculateFitTargets(level, nCore, nSupport);

  let matchScore = 0;
  let maxPossible = 0;
  for (const [stat, weight] of Object.entries(arch.stat_weights)) {
    const value = stats[stat] ?? 0;
    const target = prioritySet.has(stat) ? coreTarget : supportTarget;
    matchScore += Math.min(value, target) * weight;
    maxPossible += target * weight;
  }
  return maxPossible > 0 ? Math.round((matchScore / maxPossible) * 100) : 0;
}

/** Get all stat names relevant for a player type */
function getStatsForType(playerType: string): string[] {
  const hidden = playerType === "pitcher" ? ["batting", "baserunning"] : ["pitching"];
  const hiddenSet = new Set(hidden);
  const stats: string[] = [];
  for (const [cat, names] of Object.entries(STAT_CATEGORIES)) {
    if (!hiddenSet.has(cat)) {
      stats.push(...names);
    }
  }
  return stats;
}

function CustomArchetypeEditor({
  playerType,
  onSave,
}: {
  playerType: string;
  onSave: (arch: Archetype) => void;
}) {
  const allStats = getStatsForType(playerType);
  const [priority, setPriority] = useState<Set<string>>(new Set());
  const [secondary, setSecondary] = useState<Set<string>>(new Set());

  const toggleStat = (stat: string) => {
    if (priority.has(stat)) {
      // priority -> secondary
      setPriority((prev) => { const n = new Set(prev); n.delete(stat); return n; });
      setSecondary((prev) => new Set(prev).add(stat));
    } else if (secondary.has(stat)) {
      // secondary -> none
      setSecondary((prev) => { const n = new Set(prev); n.delete(stat); return n; });
    } else {
      // none -> priority
      setPriority((prev) => new Set(prev).add(stat));
    }
  };

  const handleSave = () => {
    const priorityArr = [...priority];
    const secondaryArr = [...secondary];
    const weights: Record<string, number> = {};
    for (const s of priorityArr) weights[s] = 2.0;
    for (const s of secondaryArr) weights[s] = 1.0;

    onSave({
      name: "Custom Build",
      emoji: "🔧",
      description: "Your custom stat priority build.",
      priority_stats: priorityArr,
      secondary_stats: secondaryArr,
      stat_weights: weights,
    });
  };

  return (
    <div className="mt-3 space-y-3">
      <p className="text-sm text-muted-foreground">
        Click stats to cycle: none → <span className="text-primary">core</span> → <span className="text-foreground">secondary</span> → none
      </p>
      <div className="flex flex-wrap gap-1.5">
        {allStats.map((stat) => {
          const isPri = priority.has(stat);
          const isSec = secondary.has(stat);
          return (
            <button
              key={stat}
              onClick={() => toggleStat(stat)}
              className={`text-sm px-2 py-1 rounded capitalize transition-colors ${
                isPri
                  ? "bg-primary/20 text-primary border border-primary/40"
                  : isSec
                    ? "bg-muted text-foreground border border-border"
                    : "bg-muted/50 text-muted-foreground border border-transparent hover:border-border"
              }`}
            >
              {stat}
            </button>
          );
        })}
      </div>
      <button
        onClick={handleSave}
        disabled={priority.size === 0}
        className="text-sm bg-primary text-primary-foreground px-4 py-1.5 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        Apply Custom Build
      </button>
    </div>
  );
}

export function ArchetypeSelect({
  playerType,
  onArchetypeChange,
  pitchTypes,
  playerPitches,
}: ArchetypeSelectProps) {
  const [archetypes, setArchetypes] = useState<ArchetypeMap>({});
  const [loadError, setLoadError] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const archetypeId = usePlayerStore((s) => s.archetypeId);
  const setArchetypeId = usePlayerStore((s) => s.setArchetypeId);
  const setPlayerArchetype = usePlayerStore((s) => s.setPlayerArchetype);
  const playerArchetypes = usePlayerStore((s) => s.playerArchetypes);
  const player = usePlayerStore((s) => s.player);

  useEffect(() => {
    setLoadError(false); // eslint-disable-line react-hooks/set-state-in-effect -- reset before async fetch
    let cancelled = false;
    getArchetypeLoader(playerType)()
      .then((data) => {
        if (!cancelled) setArchetypes(data);
      })
      .catch((err) => {
        if (cancelled) return;
        if (isAbortError(err)) return;
        console.error("Archetype load failed:", err);
        setArchetypes({});
        setLoadError(true);
      });
    return () => { cancelled = true; };
  }, [playerType]);

  // Restore archetype from per-player mapping, then fall back to global archetypeId
  useEffect(() => {
    if (Object.keys(archetypes).length === 0) return;
    const playerId = player?.mmolbPlayerId;
    const savedId = playerId ? playerArchetypes[playerId] : null;
    const restoreId = savedId ?? archetypeId;
    if (restoreId && restoreId !== "__custom" && archetypes[restoreId]) {
      if (restoreId !== archetypeId) setArchetypeId(restoreId);
      onArchetypeChange(archetypes[restoreId]);
    }
  }, [player?.mmolbPlayerId, archetypes]); // eslint-disable-line react-hooks/exhaustive-deps -- restore on player/archetype load

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const key = e.target.value || null;
    const playerId = player?.mmolbPlayerId;
    if (key === "__custom") {
      setShowCustom(true);
      setArchetypeId("__custom");
      if (playerId) setPlayerArchetype(playerId, "__custom");
      onArchetypeChange(null);
      return;
    }
    setShowCustom(false);
    setArchetypeId(key);
    if (playerId) setPlayerArchetype(playerId, key);
    onArchetypeChange(key ? archetypes[key] : null);
  };

  const handleCustomSave = useCallback((arch: Archetype) => {
    setShowCustom(false);
    onArchetypeChange(arch);
  }, [onArchetypeChange]);

  const entries = Object.entries(archetypes);
  const selectedArch = archetypeId && archetypeId !== "__custom" ? archetypes[archetypeId] : null;
  const selectedFitPct = selectedArch && player ? computeFitPct(player.stats, selectedArch, player.level) : null;

  // Compute fit % for each archetype for dropdown display
  const fitPcts = useMemo(() => {
    if (!player || Object.keys(archetypes).length === 0) return new Map<string, number>();
    const map = new Map<string, number>();
    for (const [key, arch] of Object.entries(archetypes)) {
      map.set(key, computeFitPct(player.stats, arch, player.level));
    }
    return map;
  }, [player, archetypes]);

  // Compute pitch fit % for each archetype
  const pitchFitPcts = useMemo(() => {
    if (!playerPitches?.length || !pitchTypes || Object.keys(archetypes).length === 0)
      return new Map<string, number | null>();
    const map = new Map<string, number | null>();
    for (const [key, arch] of Object.entries(archetypes)) {
      map.set(key, computePitchFitPct(playerPitches, arch, pitchTypes));
    }
    return map;
  }, [playerPitches, pitchTypes, archetypes]);

  const selectedPitchFitPct = selectedArch && playerPitches?.length && pitchTypes
    ? computePitchFitPct(playerPitches, selectedArch, pitchTypes)
    : null;

  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2">
      <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-2">
        <span className="w-0.5 h-3 bg-primary/40 rounded-full" />
        Archetype
        {selectedArch && selectedFitPct != null && player && (
          <span className="normal-case tracking-normal font-normal text-muted-foreground">
            {selectedFitPct}% stat{selectedPitchFitPct != null && (<> · {selectedPitchFitPct}% pitch</>)} <span className="opacity-60">(Lv. {player.level})</span>
          </span>
        )}
      </label>
      {loadError && (
        <p className="text-sm text-destructive mb-2">Failed to load archetypes.</p>
      )}
      <select
        value={archetypeId ?? ""}
        onChange={handleChange}
        className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <option value="">Select an archetype...</option>
        {entries.map(([key, arch]) => {
          const pct = fitPcts.get(key);
          const pitchPct = pitchFitPcts.get(key);
          const pctLabel = pct != null
            ? pitchPct != null ? ` ${pct}% / ${pitchPct}%` : ` ${pct}%`
            : "";
          return (
            <option key={key} value={key}>
              {arch.emoji ? `${arch.emoji} ` : ""}{arch.name}{pctLabel}
            </option>
          );
        })}
        <option value="__custom">🔧 Custom Build...</option>
      </select>

      {showCustom && (
        <CustomArchetypeEditor playerType={playerType} onSave={handleCustomSave} />
      )}

      {selectedArch && (
        <div className="mt-2">
          <div className="flex gap-1.5 flex-wrap mb-1.5">
            {selectedArch.priority_stats?.slice(0, 4).map((stat) => (
              <span
                key={stat}
                className="text-sm bg-primary/15 text-primary px-2 py-0.5 rounded capitalize font-medium"
              >
                {stat}
              </span>
            ))}
            {selectedArch.secondary_stats?.map((stat) => (
              <span
                key={stat}
                className="text-sm bg-muted text-foreground px-2 py-0.5 rounded capitalize"
              >
                {stat}
              </span>
            ))}
          </div>
          {selectedArch.recommended_pitches && selectedArch.recommended_pitches.length > 0 && playerPitches && (
            <div className="flex gap-1.5 flex-wrap mb-1.5">
              {selectedArch.recommended_pitches.map((pitch) => {
                const has = playerPitches.includes(pitch);
                const info = pitchTypes?.[pitch];
                const label = info?.name ?? pitch.toUpperCase();
                return (
                  <span
                    key={pitch}
                    className={`text-xs px-2 py-0.5 rounded-full border ${
                      has
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                        : "bg-muted/50 text-muted-foreground/50 border-border/50"
                    }`}
                  >
                    {label}
                  </span>
                );
              })}
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            {selectedArch.description}
          </p>
        </div>
      )}
    </div>
  );
}
