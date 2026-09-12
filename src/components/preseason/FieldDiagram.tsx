import { BASE_PATH } from "@/lib/constants";
import type {
  PositionAssignmentRec,
  PositionFitStat,
} from "@/lib/preseason-recommend";

export interface FieldDiagramProps {
  recommendation: PositionAssignmentRec;
}

const FIELD_COORDS: Record<string, { left: string; top: string }> = {
  C: { left: "50%", top: "88%" },
  "1B": { left: "72%", top: "66%" },
  "2B": { left: "63%", top: "49%" },
  "3B": { left: "28%", top: "66%" },
  SS: { left: "37%", top: "49%" },
  LF: { left: "20%", top: "27%" },
  CF: { left: "50%", top: "17%" },
  RF: { left: "80%", top: "27%" },
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
  if (stats.length === 0) return <span className="text-muted-foreground">No weighted stats</span>;
  return (
    <span className="flex flex-wrap gap-x-2 gap-y-0.5">
      {stats.map((stat) => (
        <span key={stat.stat}><span className="text-muted-foreground">{statLabel(stat.stat)}</span> <strong>{stat.value}</strong></span>
      ))}
    </span>
  );
}

export function FieldDiagram({ recommendation }: FieldDiagramProps) {
  if (recommendation.fielders.length === 0) {
    return (
      <section data-testid="field-diagram" className="rounded-lg border border-border bg-card px-4 py-6 text-center">
        <h2 className="font-semibold text-foreground">Best Defensive Alignment</h2>
        <p className="mt-1 text-sm text-muted-foreground">No position players are available to plot.</p>
      </section>
    );
  }

  return (
    <section data-testid="field-diagram" className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Best Defensive Alignment</h2>
          <p className="text-xs text-muted-foreground">The default batting-order nine are locked first; eight are optimized across the field and one becomes DH.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${recommendation.battingOrderLocked ? "bg-green-500/15 text-green-400" : "bg-yellow-500/15 text-yellow-500"}`}>
            {recommendation.battingOrderLocked ? "9/9 best bats locked" : "Provisional starting nine"}
          </span>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
            Total fit {Math.round(recommendation.totalFit)}
          </span>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="rounded-xl border border-border bg-background/40 p-2">
          <div
            className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-cover bg-center shadow-inner"
            style={{ backgroundImage: `linear-gradient(rgb(0 0 0 / 0.12), rgb(0 0 0 / 0.28)), url(${BASE_PATH}/images/preseason-field.webp)` }}
          >
            {recommendation.fielders.map((assignment) => {
              const coords = FIELD_COORDS[assignment.assignedPosition] ?? { left: "50%", top: "50%" };
              const score = assignment.fitScore;
              return (
                <div
                  key={assignment.assignedPosition}
                  data-testid="fielder-node"
                  data-position={assignment.assignedPosition}
                  aria-label={`${assignment.assignedPosition}: ${assignment.player.name}, ${score == null ? "fit unavailable" : `${Math.round(score)} percent fit`}; ${assignment.keyStats.map((stat) => `${statLabel(stat.stat)} ${stat.value}`).join(", ")}`}
                  className="absolute w-[24%] -translate-x-1/2 -translate-y-1/2 rounded-md border bg-black/82 px-1 py-1 text-white shadow-xl backdrop-blur-sm sm:w-[19%] sm:rounded-lg sm:px-2 sm:py-1.5"
                  style={{ left: coords.left, top: coords.top, borderLeftWidth: 5, borderLeftColor: fitColor(score) }}
                  title={`${assignment.player.name}: ${assignment.assignedPosition}, ${score == null ? "N/A" : `${Math.round(score)}% fit`}`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[9px] font-black tracking-wide sm:text-xs">{assignment.assignedPosition}{assignment.isPersonalBest ? "" : " !"}</span>
                    <span className="text-[9px] font-black sm:text-xs" style={{ color: fitColor(score) }}>
                      {score == null ? "N/A" : `${Math.round(score)}%`}
                    </span>
                  </div>
                  <div className="truncate text-[9px] font-bold sm:text-sm">{assignment.player.name}</div>
                  <div className="mt-0.5 hidden text-[9px] leading-tight text-white/90 sm:block">
                    <FitStats stats={assignment.keyStats} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1.5 sm:hidden">
            {recommendation.fielders.map((assignment) => (
              <div key={`mobile-${assignment.assignedPosition}`} className="rounded-md border border-border bg-secondary/55 px-2 py-1.5 text-[10px]">
                <div className="flex items-center justify-between gap-1">
                  <strong className="truncate text-foreground">{assignment.assignedPosition} · {assignment.player.name}</strong>
                  <span className="font-mono font-bold text-primary">{Math.round(assignment.fitScore ?? 0)}%</span>
                </div>
                <FitStats stats={assignment.keyStats} />
              </div>
            ))}
          </div>
        </div>

        <aside className="space-y-4">
          {recommendation.designatedHitter && (
            <div className="rounded-xl border-2 border-primary/40 bg-primary/10 p-3">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-primary">Ninth starter · DH</div>
              <div className="mt-1 font-semibold text-foreground">{recommendation.designatedHitter.player.name}</div>
              <div className="text-xs text-muted-foreground">Best field fit: {recommendation.designatedHitter.personalBestPosition}</div>
            </div>
          )}

          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Next-best fit by position</h3>
            <div className="space-y-1.5">
              {recommendation.alternatives.map((alternative) => (
                <div key={alternative.position} className="rounded-lg border border-border bg-secondary/45 px-2.5 py-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <strong className="text-foreground">{alternative.position} · {alternative.player.name}</strong>
                    <span className="font-mono font-bold text-primary">{Math.round(alternative.fitScore)}%</span>
                  </div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">
                    {alternative.isStarter ? "Starting nine" : "Bench"} · <FitStats stats={alternative.keyStats} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
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
