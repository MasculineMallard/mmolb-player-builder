import type { PositionAssignmentRec } from "@/lib/preseason-recommend";

export interface FieldDiagramProps {
  recommendation: PositionAssignmentRec;
}

const FIELD_COORDS: Record<string, { x: number; y: number }> = {
  C: { x: 200, y: 315 },
  "1B": { x: 292, y: 230 },
  "2B": { x: 247, y: 165 },
  "3B": { x: 108, y: 230 },
  SS: { x: 153, y: 165 },
  LF: { x: 82, y: 95 },
  CF: { x: 200, y: 62 },
  RF: { x: 318, y: 95 },
};

function fitColor(score: number | null): string {
  if (score == null) return "var(--muted-foreground)";
  if (score >= 80) return "var(--chart-3)";
  if (score >= 60) return "var(--chart-1)";
  if (score >= 40) return "var(--chart-2)";
  return "var(--destructive)";
}

function shortName(name: string): string {
  return name.length > 15 ? `${name.slice(0, 14)}…` : name;
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
    <section data-testid="field-diagram" className="rounded-lg border border-border bg-card p-3">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="font-semibold text-foreground">Best Defensive Alignment</h2>
          <p className="text-xs text-muted-foreground">Optimal eight-player fit · ! marks a player away from their personal-best spot</p>
        </div>
        <span className="rounded-full bg-secondary px-2 py-1 text-xs text-secondary-foreground">
          Total fit {Math.round(recommendation.totalFit)}
        </span>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_13rem]">
        <svg
          viewBox="0 0 400 360"
          role="img"
          aria-labelledby="field-title field-description"
          className="h-auto w-full min-h-[20rem] rounded-md bg-secondary/40"
        >
          <title id="field-title">Recommended defensive field alignment</title>
          <desc id="field-description">Eight fielding positions with assigned player names and fit percentages.</desc>
          <path d="M200 338 L42 180 Q200 -28 358 180 Z" fill="var(--muted)" stroke="var(--border)" strokeWidth="2" />
          <path d="M200 315 L108 223 L200 132 L292 223 Z" fill="var(--card)" stroke="var(--border)" strokeWidth="2" />
          <path d="M200 315 L108 223 M200 315 L292 223" fill="none" stroke="var(--border)" strokeWidth="1.5" />
          <circle cx="200" cy="224" r="5" fill="var(--foreground)" opacity="0.45" />

          {recommendation.fielders.map((assignment) => {
            const coords = FIELD_COORDS[assignment.assignedPosition] ?? { x: 200, y: 180 };
            const score = assignment.fitScore;
            return (
              <g
                key={assignment.assignedPosition}
                data-testid="fielder-node"
                data-position={assignment.assignedPosition}
                transform={`translate(${coords.x} ${coords.y})`}
              >
                <title>
                  {assignment.player.name}: {assignment.assignedPosition}, {score == null ? "N/A" : `${Math.round(score)}% fit`}
                  {!assignment.isPersonalBest ? `; personal best is ${assignment.personalBestPosition}` : ""}
                </title>
                <circle r="28" fill={fitColor(score)} stroke="var(--background)" strokeWidth="3" />
                <text y="-10" textAnchor="middle" fill="var(--primary-foreground)" fontSize="10" fontWeight="700">
                  {assignment.assignedPosition}{assignment.isPersonalBest ? "" : " !"}
                </text>
                <text y="3" textAnchor="middle" fill="var(--primary-foreground)" fontSize="8.5">
                  {shortName(assignment.player.name)}
                </text>
                <text y="16" textAnchor="middle" fill="var(--primary-foreground)" fontSize="9" fontWeight="600">
                  {score == null ? "N/A" : `${Math.round(score)}%`}
                </text>
              </g>
            );
          })}
        </svg>

        <div className="space-y-3">
          <div>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Off field</h3>
            <div className="flex flex-wrap gap-1.5 lg:flex-col">
              {recommendation.designatedHitter && (
                <span className="rounded-md border border-border bg-secondary px-2 py-1.5 text-xs">
                  <strong className="text-foreground">DH</strong>{" "}{recommendation.designatedHitter.player.name}
                </span>
              )}
              {recommendation.pitchers.map((player) => (
                <span key={player.mmolbPlayerId} className="rounded-md border border-border bg-secondary px-2 py-1.5 text-xs text-muted-foreground">
                  <strong className="text-foreground">P</strong>{" "}{player.name}
                </span>
              ))}
            </div>
          </div>
          {recommendation.bench.length > 0 && (
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bench bats</h3>
              <div className="flex flex-wrap gap-1.5 lg:flex-col">
                {recommendation.bench.map((assignment) => (
                  <span key={assignment.player.mmolbPlayerId} className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">
                    {assignment.player.name} · best {assignment.personalBestPosition}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
