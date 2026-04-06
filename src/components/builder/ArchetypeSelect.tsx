"use client";

import { useState, useEffect, useCallback } from "react";
import { usePlayerStore } from "@/store/player-store";
import { isAbortError } from "@/lib/utils";
import { createJsonCache, isNonArrayObject } from "@/lib/json-cache";
import { STAT_CATEGORIES } from "@/lib/constants";
import type { Archetype } from "@/lib/types";

interface ArchetypeSelectProps {
  playerType: "pitcher" | "batter";
  onArchetypeChange: (archetype: Archetype | null) => void;
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
}: ArchetypeSelectProps) {
  const [archetypes, setArchetypes] = useState<ArchetypeMap>({});
  const [loadError, setLoadError] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const archetypeId = usePlayerStore((s) => s.archetypeId);
  const setArchetypeId = usePlayerStore((s) => s.setArchetypeId);

  useEffect(() => {
    setLoadError(false);
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

  // Restore archetype from store/URL after archetypes load
  useEffect(() => {
    if (archetypeId && archetypeId !== "__custom" && archetypes[archetypeId]) {
      onArchetypeChange(archetypes[archetypeId]);
    }
  }, [archetypeId, archetypes, onArchetypeChange]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const key = e.target.value || null;
    if (key === "__custom") {
      setShowCustom(true);
      setArchetypeId("__custom");
      onArchetypeChange(null);
      return;
    }
    setShowCustom(false);
    setArchetypeId(key);
    onArchetypeChange(key ? archetypes[key] : null);
  };

  const handleCustomSave = useCallback((arch: Archetype) => {
    setShowCustom(false);
    onArchetypeChange(arch);
  }, [onArchetypeChange]);

  const entries = Object.entries(archetypes);
  const selectedArch = archetypeId && archetypeId !== "__custom" ? archetypes[archetypeId] : null;

  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2">
      <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-2">
        <span className="w-0.5 h-3 bg-primary/40 rounded-full" />
        Archetype
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
        {entries.map(([key, arch]) => (
          <option key={key} value={key}>
            {arch.emoji ? `${arch.emoji} ` : ""}{arch.name}
          </option>
        ))}
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
          <p className="text-sm text-muted-foreground">
            {selectedArch.description}
          </p>
        </div>
      )}
    </div>
  );
}
