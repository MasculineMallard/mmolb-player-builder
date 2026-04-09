"use client";

import { useState, useCallback } from "react";
import type { StatRecommendation } from "@/lib/advisor";
import type { ProgressSummary } from "@/lib/planner-utils";
import { getStatColor, getStatBarColor, STAT_DISPLAY_MAX } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StatDevelopmentProps {
  recommendations: StatRecommendation[];
  progress?: ProgressSummary;
  onTargetOverride?: (statName: string, target: number) => void;
}

/** SVG radial gauge for a single stat */
function RadialGauge({ rec, onEdit }: { rec: StatRecommendation; onEdit?: () => void }) {
  const size = 80;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = rec.target > 0 ? Math.min(rec.current / rec.target, 1) : 1;
  const dashOffset = circumference * (1 - pct);
  const barColor = getStatBarColor(rec.current);
  const isSevere = rec.gap > 200;

  return (
    <Tooltip>
      <TooltipTrigger
        className="flex flex-col items-center cursor-default bg-transparent border-none p-0"
        onClick={onEdit}
      >
        <div className="relative">
          <svg width={size} height={size} className="transform -rotate-90">
            {/* Background track */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="var(--muted)"
              strokeWidth={strokeWidth}
            />
            {/* Fill arc */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={barColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              style={{
                transition: "stroke-dashoffset 0.5s ease-out",
                filter: isSevere ? `drop-shadow(0 0 3px ${barColor})` : "none",
              }}
            />
          </svg>
          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="text-sm font-bold tabular-nums"
              style={{ color: getStatColor(rec.current) }}
            >
              {rec.current}
            </span>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              / {rec.target}
            </span>
          </div>
        </div>
        {/* Stat name + gap */}
        <div className="text-center mt-0.5">
          <div className="text-[13px] capitalize font-medium">{rec.statName}</div>
          <div
            className="text-xs font-medium tabular-nums"
            style={{ color: isSevere ? 'var(--scale-bad)' : 'var(--scale-poor)' }}
          >
            -{rec.gap}
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[220px]">
        <p className="capitalize font-medium">{rec.statName}</p>
        <p className="text-sm text-muted-foreground">
          {rec.current} / {rec.target} ({Math.round(pct * 100)}%)
        </p>
        <p className="text-sm text-muted-foreground mt-1">{rec.reasoning}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function StatDevelopment({ recommendations, progress, onTargetOverride }: StatDevelopmentProps) {
  const [editing, setEditing] = useState(false);
  const [editingStatName, setEditingStatName] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const handleStartEdit = useCallback((statName: string, currentTarget: number) => {
    if (!editing || !onTargetOverride) return;
    setEditingStatName(statName);
    setEditValue(String(currentTarget));
  }, [editing, onTargetOverride]);

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

  if (recommendations.length === 0) return null;

  // Only show stats that are behind target
  const behindStats = recommendations.filter((r) => r.gap > 0);

  if (behindStats.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2">
      <div className="flex items-center justify-between mb-2 gap-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide shrink-0 flex items-center gap-2">
          <span className="w-0.5 h-3 bg-primary/40 rounded-full" />
          Stat Development
        </h3>
        <div className="flex items-center gap-3 ml-auto">
          {progress && (
            <div className="flex items-center gap-3 text-sm">
              <span>
                <span className="font-bold text-[var(--scale-good)] tabular-nums">{progress.statsOnTrack}</span>
                <span className="text-muted-foreground ml-1">on track</span>
              </span>
              <span>
                <span className="font-bold text-[var(--scale-bad)] tabular-nums">{progress.statsBehind}</span>
                <span className="text-muted-foreground ml-1">behind</span>
              </span>
            </div>
          )}
          {onTargetOverride && (
            <button
              onClick={() => { setEditing(!editing); setEditingStatName(null); }}
              className={`text-sm px-3 py-1 rounded-md transition-all duration-150 ${
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
      </div>

      {/* Edit overlay for individual stat */}
      {editing && editingStatName && (
        <div className="flex items-center gap-2 bg-muted/50 rounded-md px-3 py-1.5 mb-2 text-sm">
          <span className="capitalize">{editingStatName} target:</span>
          <input
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSaveEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveEdit();
              if (e.key === "Escape") { setEditingStatName(null); setEditValue(""); }
            }}
            className="w-16 bg-muted border border-border rounded px-1.5 py-0.5 text-sm text-foreground text-right tabular-nums focus:outline-none focus:ring-1 focus:ring-ring"
            min={0}
            max={STAT_DISPLAY_MAX}
            autoFocus
          />
        </div>
      )}

      {/* Radial gauges grid */}
      <div className="flex flex-wrap justify-center gap-3">
        {behindStats.slice(0, 8).map((rec) => (
          <div key={rec.statName} className="relative">
            <RadialGauge
              rec={rec}
              onEdit={editing ? () => handleStartEdit(rec.statName, rec.target) : undefined}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
