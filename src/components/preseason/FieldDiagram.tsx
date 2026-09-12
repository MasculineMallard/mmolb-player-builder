import { BASE_PATH } from "@/lib/constants";
import type {
  PositionAlternative,
  PositionAssignment,
  PositionAssignmentRec,
  PositionFitStat,
} from "@/lib/preseason-recommend";

export interface FieldDiagramProps {
  recommendation: PositionAssignmentRec;
  onLockPosition?: (position: string, playerId: string | null) => void;
  onResetLocks?: () => void;
}

const FIELD_COORDS: Record<string, { left: string; top: string }> = {
  C: { left: "50%", top: "87%" },
  "1B": { left: "80%", top: "68%" },
  "2B": { left: "65%", top: "49%" },
  "3B": { left: "20%", top: "68%" },
  SS: { left: "35%", top: "49%" },
  LF: { left: "19%", top: "24%" },
  CF: { left: "50%", top: "14%" },
  RF: { left: "81%", top: "24%" },
};

function fitColor(score: number | null): string {
  if (score == null) return "var(--muted-foreground)";
  if (score >= 80) return "var(--chart-3)";
  if (score >= 60) return "var(--chart-1)";
  if (score >= 40) return "var(--chart-2)";
  return "var(--destructive)";
}

function statLabel(stat: string): string {
  return stat.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function cardStatLabel(stat: string): string {
  const abbreviations: Record<string, string> = {
    acrobatics: "Acro",
    composure: "Comp",
    awareness: "Aware",
    reaction: "React",
  };
  return abbreviations[stat.toLowerCase()] ?? statLabel(stat);
}

function FitStats({ stats }: { stats: PositionFitStat[] }) {
  if (stats.length === 0) return <div className="text-xs text-muted-foreground">No weighted stats</div>;
  return (
    <div className={`grid border-t border-white/15 ${stats.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
      {stats.map((stat, index) => (
        <div
          key={stat.stat}
          className={`min-w-0 px-1 py-1 text-center ${index > 0 ? "border-l border-white/15" : ""}`}
        >
          <span data-testid="fit-stat-label" className="whitespace-nowrap text-[12px] font-semibold leading-none text-muted-foreground">
            {cardStatLabel(stat.stat)}
          </span>
          <strong className="ml-1 font-mono text-[14px] font-black leading-none text-foreground">{stat.value}</strong>
        </div>
      ))}
    </div>
  );
}

function AssignmentCard({
  assignment,
  alternative,
  startingPlayers,
  onLockPosition,
}: {
  assignment: PositionAssignment;
  alternative?: PositionAlternative;
  startingPlayers: PositionAssignment["player"][];
  onLockPosition?: (position: string, playerId: string | null) => void;
}) {
  const score = assignment.fitScore;
  const selectValue = assignment.isLocked ? assignment.player.mmolbPlayerId : "";

  return (
    <div
      role="group"
      data-testid="fielder-node"
      data-position={assignment.assignedPosition}
      data-locked={assignment.isLocked ? "true" : "false"}
      aria-label={`${assignment.assignedPosition}: ${assignment.player.name}, ${score == null ? "fit unavailable" : `${Math.round(score)} percent fit`}; ${assignment.keyStats.map((stat) => `${statLabel(stat.stat)} ${stat.value}`).join(", ")}${assignment.isPersonalBest ? "; best position for this player" : ""}`}
      className="absolute z-10 w-[180px] -translate-x-1/2 -translate-y-1/2 text-foreground drop-shadow-[0_4px_7px_rgb(0_0_0/0.5)]"
      style={{
        left: FIELD_COORDS[assignment.assignedPosition]?.left ?? "50%",
        top: FIELD_COORDS[assignment.assignedPosition]?.top ?? "50%",
      }}
      title={assignment.isPersonalBest ? "This is this player's best position" : undefined}
    >
      <div className={`overflow-hidden rounded-[5px] border bg-background/95 backdrop-blur-sm ${assignment.isPersonalBest ? "border-primary" : "border-white/25"}`}>
        <div data-testid="fielder-card-header" className="grid min-h-[30px] grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-1 px-[5px] py-px pl-[3px]">
          <span className="grid h-5 place-items-center rounded-[3px] bg-primary/20 font-mono text-[11px] font-black leading-none tracking-wide text-primary">{assignment.assignedPosition}</span>
          {onLockPosition ? (
            <label className="relative flex h-6 min-w-0 cursor-pointer items-center gap-1 rounded-sm px-0.5 focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-primary">
              <span className="sr-only">Player assignment for {assignment.assignedPosition}</span>
              <span className="min-w-0 flex-1 truncate text-[13px] font-extrabold leading-none">{assignment.player.name}</span>
              <span data-testid="fielder-menu-cue" aria-hidden="true" className="grid h-5 w-5 shrink-0 place-items-center rounded border border-primary/50 bg-primary/20 text-[12px] font-black leading-none text-primary shadow-sm">▼</span>
              <select
                aria-label={`Player assignment for ${assignment.assignedPosition}; current player ${assignment.player.name}`}
                value={selectValue}
                onChange={(event) => onLockPosition(assignment.assignedPosition, event.target.value || null)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              >
                <option value="">Auto · {assignment.player.name}</option>
                {startingPlayers.map((player) => (
                  <option key={player.mmolbPlayerId} value={player.mmolbPlayerId}>
                    Lock · {player.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <span className="min-w-0 truncate text-[13px] font-extrabold leading-none">{assignment.player.name}</span>
          )}
          <span className="font-mono text-[15px] font-black leading-none" style={{ color: fitColor(score) }}>
            {score == null ? "N/A" : `${Math.round(score)}%`}
          </span>
        </div>

        <FitStats stats={assignment.keyStats} />
      </div>

      {alternative && (
        <div className="mx-auto -mt-px grid w-[84%] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-[3px] rounded-b-[4px] border border-t-0 border-white/20 bg-secondary/95 px-[5px] py-1 text-[10px] leading-none">
          <span className="text-muted-foreground">Next</span>
          <span className="min-w-0 truncate text-muted-foreground">
            <strong className="text-foreground">{alternative.player.name}</strong>
          </span>
          <strong className="shrink-0 font-mono text-[10px] text-primary">{Math.round(alternative.fitScore)}%</strong>
        </div>
      )}
    </div>
  );
}

export function FieldDiagram({ recommendation, onLockPosition, onResetLocks }: FieldDiagramProps) {
  if (recommendation.fielders.length === 0) {
    return (
      <section data-testid="field-diagram" className="rounded-lg border border-border bg-card px-4 py-6 text-center">
        <h2 className="font-semibold text-foreground">Best Defensive Alignment</h2>
        <p className="mt-1 text-sm text-muted-foreground">No position players are available to plot.</p>
      </section>
    );
  }

  const playerById = new Map(
    [...recommendation.fielders, ...(recommendation.designatedHitter ? [recommendation.designatedHitter] : [])]
      .map((assignment) => [assignment.player.mmolbPlayerId, assignment.player]),
  );
  const startingPlayers = recommendation.startingBatterIds
    .map((playerId) => playerById.get(playerId))
    .filter((player): player is PositionAssignment["player"] => player != null);
  const alternativeByPosition = new Map(
    recommendation.alternatives.map((alternative) => [alternative.position, alternative]),
  );
  const lockedCount = recommendation.fielders.filter((assignment) => assignment.isLocked).length;
  const averageFit = Math.round(recommendation.totalFit / recommendation.fielders.length);

  return (
    <section data-testid="field-diagram" className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Best Defensive Alignment</h2>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">Fit % = Σ(weight × min(item-adjusted stat ÷ target, 1)) ÷ Σ(weights) × 100</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!recommendation.battingOrderLocked && (
            <span className="rounded-full bg-yellow-500/15 px-3 py-1 text-xs font-bold text-yellow-500">Provisional starting nine</span>
          )}
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
            Average position fit {averageFit}%
          </span>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            Equipped items included
          </span>
          {lockedCount > 0 && onResetLocks && (
            <button
              type="button"
              onClick={onResetLocks}
              className="rounded-md border border-border bg-background px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:border-primary hover:text-foreground"
            >
              Reset {lockedCount} {lockedCount === 1 ? "lock" : "locks"}
            </button>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-5xl rounded-xl border border-border bg-background/40 p-2">
        <div className="overflow-x-auto rounded-lg">
          <div
            role="region"
            data-testid="defensive-field"
            aria-label="Defensive alignment by field position"
            className="relative aspect-[8/5] w-full min-w-[700px] overflow-hidden rounded-lg bg-cover bg-center"
            style={{ backgroundImage: `url(${BASE_PATH}/images/field-options-ai/field-ai-02.png)` }}
          >
            {recommendation.fielders.map((assignment) => (
              <AssignmentCard
                key={assignment.assignedPosition}
                assignment={assignment}
                alternative={alternativeByPosition.get(assignment.assignedPosition)}
                startingPlayers={startingPlayers}
                onLockPosition={onLockPosition}
              />
            ))}
          </div>
        </div>
      </div>

      {(recommendation.designatedHitter || recommendation.bench.length > 0) && (
        <div className="mt-5 border-t border-border pt-4">
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            {recommendation.designatedHitter ? "Designated hitter + bench bats" : "Bench bats"} · playable spots
          </h3>
          <div data-testid="reserve-bats-grid" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {recommendation.designatedHitter && (
              <div data-testid="designated-hitter-card" className="rounded-lg border border-primary/35 bg-primary/5 p-2.5">
                <div className="text-[10px] font-black uppercase tracking-wider text-primary">Designated hitter</div>
                <div className="mt-1 truncate text-sm font-bold text-foreground">{recommendation.designatedHitter.player.name}</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  Best field fit: <strong className="text-foreground">{recommendation.designatedHitter.personalBestPosition}</strong>
                </div>
              </div>
            )}
            {recommendation.bench.map((assignment) => (
              <div key={assignment.player.mmolbPlayerId} className="rounded-lg border border-border bg-secondary/35 p-2.5">
                <div className="truncate text-sm font-semibold text-foreground">{assignment.player.name}</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {assignment.positionOptions.map((option) => (
                    <span key={option.position} className="rounded-md bg-background/70 px-1.5 py-1 text-[10px] text-muted-foreground">
                      <strong className="text-foreground">{option.position}</strong> {Math.round(option.fitScore)}%
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
