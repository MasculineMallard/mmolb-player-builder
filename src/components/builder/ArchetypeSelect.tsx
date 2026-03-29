"use client";

import { useState, useEffect } from "react";
import { usePlayerStore } from "@/store/player-store";
import type { Archetype } from "@/lib/optimizer";

interface ArchetypeSelectProps {
  playerType: "pitcher" | "batter";
  onArchetypeChange: (archetype: Archetype | null, id: string | null) => void;
}

interface ArchetypeMap {
  [key: string]: Archetype;
}

export function ArchetypeSelect({
  playerType,
  onArchetypeChange,
}: ArchetypeSelectProps) {
  const [archetypes, setArchetypes] = useState<ArchetypeMap>({});
  const archetypeId = usePlayerStore((s) => s.archetypeId);
  const setArchetypeId = usePlayerStore((s) => s.setArchetypeId);

  useEffect(() => {
    fetch(`/data/archetypes/${playerType}_archetypes.json`)
      .then((res) => res.json())
      .then((data) => setArchetypes(data))
      .catch(() => setArchetypes({}));
  }, [playerType]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const key = e.target.value || null;
    setArchetypeId(key);
    onArchetypeChange(key ? archetypes[key] : null, key);
  };

  const entries = Object.entries(archetypes);

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <label className="text-sm font-medium text-muted-foreground block mb-2">
        Archetype
      </label>
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
      </select>
      {archetypeId && archetypes[archetypeId] && (
        <div className="mt-2">
          <p className="text-xs text-muted-foreground">
            {archetypes[archetypeId].description}
          </p>
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {archetypes[archetypeId].priority_stats?.map((stat) => (
              <span
                key={stat}
                className="text-xs bg-primary/15 text-primary px-1.5 py-0.5 rounded capitalize"
              >
                {stat}
              </span>
            ))}
            {archetypes[archetypeId].secondary_stats?.map((stat) => (
              <span
                key={stat}
                className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded capitalize"
              >
                {stat}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
