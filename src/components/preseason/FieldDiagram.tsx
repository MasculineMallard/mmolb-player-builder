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
  C: { left: "50%", top: "86%" },
  "1B": { left: "84%", top: "68%" },
  "2B": { left: "63%", top: "49%" },
  "3B": { left: "16%", top: "68%" },
  SS: { left: "37%", top: "49%" },
  LF: { left: "19%", top: "25%" },
  CF: { left: "50%", top: "15%" },
  RF: { left: "81%", top: "25%" },
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
    <div className="grid grid-cols-2 gap-1.5">
      {stats.map((stat) => (
        <div key={stat.stat} className="min-w-0">
          <div className="truncate text-[10px] leading-tight text-muted-foreground">{statLabel(stat.stat)}</div>
          <div className="font-mono text-sm font-black leading-tight text-foreground sm:text-base">{stat.value}</div>
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
      className={`${mobile ? "relative" : "absolute w-[24%] -translate-x-1/2 -translate-y-1/2 md:w-[21%]"} rounded-lg border-2 bg-card/95 text-foreground ${assignment.isPersonalBest ? "border-primary" : "border-white/25"}`}
      style={mobile ? undefined : {
        left: FIELD_COORDS[assignment.assignedPosition]?.left ?? "50%",
        top: FIELD_COORDS[assignment.assignedPosition]?.top ?? "50%",
      }}
      title={assignment.isPersonalBest ? "This is this player's best position" : undefined}
    >
      <div className="px-2.5 pb-2 pt-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-black tracking-wide">{assignment.assignedPosition}</span>
          <span className="font-mono text-sm font-black sm:text-base" style={{ color: fitColor(score) }}>
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
              className="w-full cursor-pointer rounded-md border border-border bg-secondary px-1.5 py-1 text-xs font-bold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/25 sm:text-sm"
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
          <div className="mt-1 truncate text-sm font-bold">{assignment.player.name}</div>
        )}

        <div className="mt-2">
          <FitStats stats={assignment.keyStats} />
        </div>
      </div>

      {alternative && (
        <div className="flex items-center justify-between gap-2 rounded-b-md border-t border-border bg-secondary/95 px-2.5 py-1.5 text-[10px]">
          <span className="min-w-0 truncate text-muted-foreground">
            Next fit <strong className="text-foreground">{alternative.player.name}</strong>
          </span>
          <strong className="shrink-0 font-mono text-xs text-primary">{Math.round(alternative.fitScore)}%</strong>
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
          <p className="text-xs text-muted-foreground">Choose a player on any position card to lock that spot; every other position re-optimizes automatically. A blue outline marks that player’s best position.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${recommendation.battingOrderLocked ? "bg-green-500/15 text-green-400" : "bg-yellow-500/15 text-yellow-500"}`}>
            {recommendation.battingOrderLocked ? "9/9 best bats locked" : "Provisional starting nine"}
          </span>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
            Average position fit {averageFit}%
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

      {recommendation.designatedHitter && (
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-xs">
          <strong className="uppercase tracking-wide text-primary">DH</strong>
          <span className="font-semibold text-foreground">{recommendation.designatedHitter.player.name}</span>
          <span className="text-muted-foreground">Best field fit: {recommendation.designatedHitter.personalBestPosition}</span>
        </div>
      )}

      <div className="mx-auto max-w-4xl rounded-xl border border-border bg-background/40 p-2">
        <div
          className="relative hidden aspect-[3/2] w-full overflow-hidden rounded-lg bg-cover bg-center lg:block"
          style={{ backgroundImage: `linear-gradient(rgb(15 20 25 / 0.08), rgb(15 20 25 / 0.18)), url(${BASE_PATH}/images/preseason-field.webp)` }}
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
          className="aspect-[4/3] w-full rounded-lg bg-cover bg-center lg:hidden"
          style={{ backgroundImage: `url(${BASE_PATH}/images/preseason-field.webp)` }}
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
