"use client";

import type { Milestone } from "@/lib/planner";

interface ProgressionPathProps {
  milestones: Milestone[];
  currentLevel: number;
}

export function ProgressionPath({
  milestones,
  currentLevel,
}: ProgressionPathProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <h3 className="text-sm font-medium mb-3">Progression Path</h3>
      <div className="flex items-center gap-1">
        {milestones.map((m, i) => {
          const isCompleted = m.status === "completed";
          const isCurrent =
            m.level <= currentLevel &&
            (i === milestones.length - 1 ||
              milestones[i + 1].level > currentLevel);

          return (
            <div key={m.level} className="flex items-center gap-1 flex-1">
              {/* Node */}
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isCurrent
                      ? "bg-primary text-primary-foreground ring-2 ring-primary/40"
                      : isCompleted
                        ? "bg-[var(--chart-3)]/20 text-[var(--chart-3)]"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {m.level}
                </div>
                <span className="text-[9px] text-muted-foreground text-center leading-tight w-12">
                  {m.name}
                </span>
              </div>

              {/* Connector line */}
              {i < milestones.length - 1 && (
                <div
                  className={`flex-1 h-0.5 ${
                    isCompleted ? "bg-[var(--chart-3)]/40" : "bg-border"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
