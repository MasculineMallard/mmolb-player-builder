import type { EvaluatedPlayer, Recommendation } from "./evaluator-types";
import { RECOMMENDATION_ORDER } from "./evaluator-types";
import type { TeamSearchResult } from "./types";

/** Verdicts best → worst, derived from the shared verdict ordering. */
const VERDICTS_BEST_FIRST = (Object.keys(RECOMMENDATION_ORDER) as Recommendation[])
  .sort((a, b) => RECOMMENDATION_ORDER[a] - RECOMMENDATION_ORDER[b]);

/**
 * Build a markdown roster-evaluation report grouped by verdict (best → worst).
 * Pure formatting — shared by the Mulch-o-Meter "Copy Report" action.
 */
export function buildRosterReport(team: TeamSearchResult, evaluated: EvaluatedPlayer[]): string {
  const groups: Record<Recommendation, EvaluatedPlayer[]> = {
    STAR: [], STRONG: [], ROSTER: [], FRINGE: [], MULCH: [],
  };
  for (const ev of evaluated) groups[ev.recommendation]?.push(ev);

  let report = `## ${team.emoji ?? ""} ${team.name} - Roster Evaluation\n\n`;
  for (const verdict of VERDICTS_BEST_FIRST) {
    const list = groups[verdict];
    if (!list || list.length === 0) continue;
    report += `### ${verdict} (${list.length})\n`;
    for (const ev of list) {
      const p = ev.player;
      report += `- **${p.name}** (${p.position}, Lv ${p.level})`;
      report += ` - Attr: ${ev.attributeScore}, Fit: ${ev.positionFitScore ?? "N/A"}, Stats: ${ev.statsScore ?? "N/A"}, Growth: ${ev.growthScore}`;
      report += `. ${ev.reasoning.attributes.lines[0] ?? ""}\n`;
    }
    report += "\n";
  }
  return report;
}
