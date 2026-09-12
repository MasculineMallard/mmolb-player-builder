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
  C: { left: "50%", top: "89%" },
  "1B": { left: "80%", top: "68%" },
  "2B": { left: "63%", top: "49%" },
  "3B": { left: "20%", top: "68%" },
  SS: { left: "37%", top: "49%" },
  LF: { left: "18%", top: "23%" },
  CF: { left: "50%", top: "13%" },
  RF: { left: "82%", top: "23%" },
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

function FitStats({ stats }: { stats: PositionFitStat[] }) {
  if (stats.length === 0) return <div className="text-xs text-muted-foreground">No weighted stats</div>;
  return (
    <div className={`grid gap-1 ${stats.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
      {stats.map((stat) => (
        <div key={stat.stat} className="flex min-w-0 items-baseline justify-between gap-1 rounded bg-black/20 px-1.5 py-1">
          <span className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{statLabel(stat.stat)}</span>
          <strong className="shrink-0 font-mono text-base font-black leading-none text-foreground">{stat.value}</strong>
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
  mobile = false,
}: {
  assignment: PositionAssignment;
  alternative?: PositionAlternative;
  startingPlayers: PositionAssignment["player"][];
  onLockPosition?: (position: string, playerId: string | null) => void;
  mobile?: boolean;
}) {
  const score = assignment.fitScore;
  const selectValue = assignment.isLocked ? assignment.player.mmolbPlayerId : "";

  return (
    <div
      data-testid={mobile ? undefined : "fielder-node"}
      data-position={assignment.assignedPosition}
      data-locked={assignment.isLocked ? "true" : "false"}
      aria-label={`${assignment.assignedPosition}: ${assignment.player.name}, ${score == null ? "fit unavailable" : `${Math.round(score)} percent fit`}; ${assignment.keyStats.map((stat) => `${statLabel(stat.stat)} ${stat.value}`).join(", ")}`}
      className={`${mobile ? "relative" : "absolute z-10 w-[20%] -translate-x-1/2 -translate-y-1/2"} overflow-hidden rounded-[10px] border bg-background/95 text-foreground shadow-[0_8px_24px_rgb(0_0_0/0.45)] backdrop-blur-sm ${assignment.isPersonalBest ? "border-primary ring-1 ring-primary/70" : "border-white/25"}`}
      style={mobile ? undefined : {
        left: FIELD_COORDS[assignment.assignedPosition]?.left ?? "50%",
        top: FIELD_COORDS[assignment.assignedPosition]?.top ?? "50%",
      }}
      title={assignment.isPersonalBest ? "This is this player's best position" : undefined}
    >
      <div className="px-2 py-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-black tracking-wide text-primary">{assignment.assignedPosition}</span>
          <span className="font-mono text-sm font-black" style={{ color: fitColor(score) }}>
            {score == null ? "N/A" : `${Math.round(score)}%`}
          </span>
        </div>

        {onLockPosition ? (
          <label className="mt-1 block">
            <span className="sr-only">Player assignment for {assignment.assignedPosition}</span>
            <select
              aria-label={`Player assignment for ${assignment.assignedPosition}`}
              value={selectValue}
              onChange={(event) => onLockPosition(assignment.assignedPosition, event.target.value || null)}
              className="h-7 w-full cursor-pointer truncate rounded-md border border-border bg-secondary px-1.5 text-[11px] font-bold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
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
          <div className="mt-1 truncate text-xs font-bold">{assignment.player.name}</div>
        )}

        <div className="mt-1">
          <FitStats stats={assignment.keyStats} />
        </div>
      </div>

      {alternative && (
        <div className="flex items-center justify-between gap-1 border-t border-border bg-secondary/95 px-2 py-1 text-[9px] leading-tight">
          <span className="min-w-0 truncate text-muted-foreground">
            Next fit <strong className="text-foreground">{alternative.player.name}</strong>
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
        <div
          className="relative hidden aspect-[8/5] w-full overflow-hidden rounded-lg bg-cover bg-center lg:block"
          style={{ backgroundImage: `url(${BASE_PATH}/images/preseason-field-flat.svg)` }}
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

        <div
          aria-hidden="true"
          className="aspect-[8/5] w-full rounded-lg bg-cover bg-center lg:hidden"
          style={{ backgroundImage: `url(${BASE_PATH}/images/preseason-field-flat.svg)` }}
        />
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:hidden">
          {recommendation.fielders.map((assignment) => (
            <AssignmentCard
              key={`mobile-${assignment.assignedPosition}`}
              assignment={assignment}
              alternative={alternativeByPosition.get(assignment.assignedPosition)}
              startingPlayers={startingPlayers}
              onLockPosition={onLockPosition}
              mobile
            />
          ))}
        </div>
      </div>

      {recommendation.designatedHitter && (
        <div className="mt-4 max-w-sm rounded-lg border border-primary/35 bg-primary/5 p-3">
          <div className="text-[11px] font-black uppercase tracking-wider text-primary">Designated hitter</div>
          <div className="mt-1 truncate text-sm font-bold text-foreground">{recommendation.designatedHitter.player.name}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            Best field fit: <strong className="text-foreground">{recommendation.designatedHitter.personalBestPosition}</strong>
          </div>
        </div>
      )}

      {recommendation.bench.length > 0 && (
        <div className="mt-5 border-t border-border pt-4">
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">Bench bats · playable spots</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
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
