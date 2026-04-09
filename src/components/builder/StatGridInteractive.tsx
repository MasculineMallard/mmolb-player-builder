"use client";

import { useState, useCallback, useMemo } from "react";
import { STAT_CATEGORIES, CATEGORY_LABELS } from "@/lib/constants";
import { S11 } from "@/lib/mechanics";
import { getStatColor, getStatBarColor, STAT_DISPLAY_MAX, DEFENSE_DISPLAY_MAX } from "@/lib/utils";
import type { StatRecommendation } from "@/lib/advisor";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StatGridInteractiveProps {
  stats: Record<string, number>;
  highlightStats?: string[];
  priorityStats?: string[];
  level: number;
  isPitcher: boolean;
  recommendations?: StatRecommendation[];
  onTargetOverride?: (statName: string, target: number) => void;
  extraColumn?: React.ReactNode;
}

/** Categories to hide based on player type */
const HIDDEN_CATEGORIES: Record<string, string[]> = {
  pitcher: ["batting", "baserunning"],
  batter: ["pitching"],
};

export function StatGridInteractive({
  stats,
  highlightStats = [],
  priorityStats = [],
  level,
  isPitcher,
  recommendations = [],
  onTargetOverride,
  extraColumn,
}: StatGridInteractiveProps) {
  const [editing, setEditing] = useState(false);
  const [editingStatName, setEditingStatName] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const highlightSet = useMemo(() => new Set(highlightStats), [highlightStats]);
  const prioritySet = useMemo(() => new Set(priorityStats), [priorityStats]);

  // Build a lookup from stat name to recommendation
  const recMap = useMemo(() => {
    const m = new Map<string, StatRecommendation>();
    for (const r of recommendations) m.set(r.statName, r);
    return m;
  }, [recommendations]);

  const hasTargets = recommendations.length > 0 && onTargetOverride;

  const handleStartEdit = useCallback((statName: string, currentTarget: number) => {
    setEditingStatName(statName);
    setEditValue(String(currentTarget));
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (editingStatName && onTargetOverride) {
      const val = parseInt(editValue, 10);
      if (!isNaN(val) && val >= 0 && val <= STAT_DISPLAY_MAX) {
        onTargetOverride(editingStatName, val);
      }
    }
    setEditingStatName(null);
    setEditValue("");
  }, [editingStatName, editValue, onTargetOverride]);

  const hiddenCats = new Set(HIDDEN_CATEGORIES[isPitcher ? "pitcher" : "batter"] ?? []);
  const luckStatSet = new Set<string>((STAT_CATEGORIES.luck ?? []).filter((s) => stats[s] !== undefined));
  const activeCategories = Object.entries(STAT_CATEGORIES)
    .filter(
      ([category, statNames]) =>
        !hiddenCats.has(category) && category !== "luck"
    )
    .map(([category, statNames]) => {
      // Append luck stats to defense category
      if (category === "defense") {
        return [category, [...statNames, ...luckStatSet]] as [string, string[]];
      }
      return [category, [...statNames]] as [string, string[]];
    });

  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <span className="w-0.5 h-3.5 bg-primary/40 rounded-full" />
          All Stats
        </h3>
        {hasTargets && (
          <button
            onClick={() => { setEditing(!editing); setEditingStatName(null); }}
            className={`text-sm px-3 py-2 sm:py-1 min-h-[44px] sm:min-h-0 rounded-md transition-all duration-150 ${
              editing
                ? "text-primary-foreground hover:brightness-110 active:scale-[0.98]"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
            style={editing ? { background: 'linear-gradient(180deg, #4B8DF7 0%, #3B82F6 100%)' } : undefined}
          >
            {editing ? "Done" : "Edit Targets"}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-12 gap-y-4 md:gap-y-6">
        {activeCategories.map(([category, statNames]) => (
          <div key={category}>
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1 border-b border-border pb-0.5">
              {CATEGORY_LABELS[category]}
            </h4>
            <div className="space-y-0.5">
              {statNames.map((statName, statIdx) => {
                const baseValue = stats[statName] ?? 0;
                const displayMax = category === "defense" ? DEFENSE_DISPLAY_MAX : STAT_DISPLAY_MAX;

                // Show "Luck" sub-header before first luck stat in defense column
                const showLuckHeader = category === "defense" && luckStatSet.has(statName) &&
                  (statIdx === 0 || !luckStatSet.has(statNames[statIdx - 1]));

                const rec = recMap.get(statName);
                const target = rec?.target;
                const gap = rec?.gap ?? 0;
                const isHighlighted = highlightSet.has(statName);
                const barPct = Math.min((baseValue / displayMax) * 100, 100);
                const barColor = getStatBarColor(baseValue, displayMax);
                const isMaxed = baseValue >= displayMax;
                const isEditing = editingStatName === statName;

                return (
                  <div key={statName}>
                    {showLuckHeader && (
                      <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mt-2 mb-1 border-b border-border pb-0.5">
                        Luck
                      </h4>
                    )}
                    <div className="py-1 px-1 rounded">
                    {/* Stat name + value row */}
                    <div className="flex items-center justify-between mb-0.5">
                      <Tooltip>
                        <TooltipTrigger className="text-sm capitalize text-muted-foreground text-left flex items-center gap-1">
                          {isHighlighted && (
                            <span
                              className={`text-sm ${prioritySet.has(statName) ? 'text-primary' : 'text-foreground/60'}`}
                              aria-label={prioritySet.has(statName) ? "Priority stat" : "Secondary stat"}
                            >★</span>
                          )}
                          {statName}
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[240px]">
                          <p className="capitalize font-medium">{statName}: {baseValue}/{displayMax}</p>
                          {target !== undefined && (
                            <p className="text-sm text-muted-foreground">
                              Target: {target}
                              {gap > 0 && <span style={{ color: gap > 200 ? 'var(--scale-bad)' : 'var(--scale-poor)' }}> ({-gap})</span>}
                              {gap <= 0 && <span style={{ color: 'var(--scale-good)' }}> (on track)</span>}
                            </p>
                          )}
                          {rec?.reasoning && (
                            <p className="text-sm text-muted-foreground mt-0.5">{rec.reasoning}</p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                      <span className="flex items-center gap-1.5">
                        <span
                          className="text-sm font-mono font-medium tabular-nums"
                          style={{ color: getStatColor(baseValue) }}
                        >
                          {baseValue}
                        </span>
                        {/* Target display / edit */}
                        {editing && target !== undefined && (
                          isEditing ? (
                            <input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={handleSaveEdit}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveEdit();
                                if (e.key === "Escape") { setEditingStatName(null); setEditValue(""); }
                              }}
                              className="w-12 bg-muted border border-border rounded px-1 py-0 text-sm text-foreground text-right tabular-nums focus:outline-none focus:ring-1 focus:ring-ring"
                              min={0}
                              max={displayMax}
                              autoFocus
                            />
                          ) : (
                            <button
                              onClick={() => handleStartEdit(statName, target)}
                              className="text-sm text-muted-foreground hover:text-primary tabular-nums underline decoration-dotted underline-offset-2"
                            >
                              /{target}
                            </button>
                          )
                        )}
                      </span>
                    </div>

                    {/* Bar */}
                    <div className="h-[13px] bg-muted/80 rounded-full overflow-hidden relative">
                      {/* Target marker — show on starred stats or in edit mode */}
                      {target !== undefined && target > 0 && (isHighlighted || editing) && (
                        <div
                          className="absolute w-[3px] rounded-full z-10"
                          style={{
                            left: `${Math.min((target / displayMax) * 100, 100)}%`,
                            top: -1,
                            bottom: -1,
                            backgroundColor: "var(--foreground)",
                            opacity: 0.5,
                          }}
                        />
                      )}
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${barPct}%`,
                          backgroundColor: barColor,
                          boxShadow: isMaxed
                            ? `0 0 6px ${barColor}, 0 0 12px ${barColor}40`
                            : baseValue >= displayMax * 0.8
                              ? `0 0 4px ${barColor}60`
                              : "none",
                        }}
                      />
                    </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Extra column slot (e.g. PitchArsenal for pitchers) */}
        {extraColumn}
      </div>
    </div>
  );
}
