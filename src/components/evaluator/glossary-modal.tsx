"use client";

import { useState } from "react";

export function GlossaryButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md border border-border transition-colors"
      >
        How It Works
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-card border border-border rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border sticky top-0 bg-card z-10">
              <h2 className="text-sm font-bold uppercase tracking-wide">How Ratings Work</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <div className="px-4 py-3 space-y-4 text-sm text-muted-foreground">
              {/* Rating tiers */}
              <section>
                <h3 className="text-foreground font-semibold mb-1">Rating Tiers</h3>
                <div className="space-y-1">
                  <div><span style={{ color: "#3B82F6" }} className="font-bold">STAR</span> (65+) : Top ~8%. Elite build with strong attributes and production.</div>
                  <div><span style={{ color: "#60A5FA" }} className="font-bold">STRONG</span> (55-64) : Above average. Solid contributor.</div>
                  <div><span style={{ color: "#8B949E" }} className="font-bold">ROSTER</span> (42-54) : Playable. Does the job, nothing special.</div>
                  <div><span style={{ color: "#EAB308" }} className="font-bold">FRINGE</span> (35-41) : On the bubble. Candidate for replacement.</div>
                  <div><span style={{ color: "#F85149" }} className="font-bold">MULCH</span> (&lt;35) : Bottom 10%. Recompose.</div>
                </div>
              </section>

              {/* Composite score */}
              <section>
                <h3 className="text-foreground font-semibold mb-1">Composite Score (0-100)</h3>
                <p>Four pillars, each scored 0-100, combined by weight:</p>
                <div className="mt-2 space-y-2 ml-2">
                  <div>
                    <span className="text-foreground font-medium">Attributes</span>
                    <p className="mt-0.5">What fraction of your stat points are in good stats? T1 stats count full, T2 count half, T3 count zero. This gives a ratio (typically 0.47 to 0.75 across the league). Your ratio is scored against a percentile table built from a 20% sample of all players. Because the ratio already normalizes for level (it&apos;s a proportion, not a total), a well-built level 5 and a well-built level 30 score the same.</p>
                  </div>
                  <div>
                    <span className="text-foreground font-medium">Game Stats</span>
                    <p className="mt-0.5">OBP, SLG, K%, BB%, SB% for batters. ERA, WHIP, K/9, BB/9, HR/9 for pitchers. Each stat scored against live league percentiles (updated daily from every team via the MMOLB API), then combined by weight.</p>
                  </div>
                  <div>
                    <span className="text-foreground font-medium">Position Fit</span>
                    <p className="mt-0.5">How well your defense stats match the position. Each position has 1-3 key defense stats with fixed targets (primary: 140, secondary: 80, catcher: 200 awareness only). Total budget: 300.</p>
                  </div>
                  <div>
                    <span className="text-foreground font-medium">Growth</span>
                    <p className="mt-0.5">Remaining stat points and boon slots. A level 1 player has ~100 growth; level 30 has 0. This ensures young players with good foundations aren&apos;t penalized for low totals.</p>
                  </div>
                </div>
              </section>

              {/* Weight table */}
              <section>
                <h3 className="text-foreground font-semibold mb-1">Weight Distribution</h3>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-foreground">
                      <th className="pb-1">Scenario</th>
                      <th className="pb-1">Attr</th>
                      <th className="pb-1">Stats</th>
                      <th className="pb-1">Fit</th>
                      <th className="pb-1">Growth</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td>All available</td><td>25%</td><td>25%</td><td>25%</td><td>25%</td></tr>
                    <tr><td>No fit (pitcher/DH)</td><td>40%</td><td>40%</td><td>-</td><td>20%</td></tr>
                    <tr><td>No game stats</td><td>40%</td><td>-</td><td>30%</td><td>30%</td></tr>
                    <tr><td>No stats + no fit</td><td>50%</td><td>-</td><td>-</td><td>50%</td></tr>
                  </tbody>
                </table>
              </section>

              {/* Stat tiers */}
              <section>
                <h3 className="text-foreground font-semibold mb-1">Attribute Tiers</h3>
                <p className="mb-1">Based on Bagyilisk&apos;s regression analysis with S11 adjustments. Which stats actually move outcomes.</p>
                <div className="space-y-1">
                  <div><span className="text-foreground">Batting T1:</span> Contact, Muscle, Intimidation, Aiming, Performance</div>
                  <div><span className="text-foreground">Batting T2:</span> Discipline, Lift, Vision, Determination, Insight, Speed, Cunning</div>
                  <div><span className="text-foreground">Pitching T1:</span> Velocity, Control, Rotation, Stuff, Presence</div>
                  <div><span className="text-foreground">Pitching T2:</span> Deception, Guts, Persuasion, Stamina, Accuracy</div>
                </div>
              </section>

              {/* Defense */}
              <section>
                <h3 className="text-foreground font-semibold mb-1">Position Defense</h3>
                <p className="mb-1">From the fix-my-team Discord defense graphic. Target: 300 total budget, capped at 200 per stat.</p>
                <div className="space-y-0.5 ml-2 text-xs">
                  <div><span className="text-foreground">C:</span> Awareness</div>
                  <div><span className="text-foreground">1B:</span> Reaction, Awareness, Composure</div>
                  <div><span className="text-foreground">2B:</span> Reaction, Awareness, Composure</div>
                  <div><span className="text-foreground">SS:</span> Reaction, Awareness, Composure</div>
                  <div><span className="text-foreground">3B:</span> Reaction, Awareness, Composure</div>
                  <div><span className="text-foreground">OF:</span> Acrobatics, Agility, Arm</div>
                  <div><span className="text-foreground">P/DH:</span> Not scored</div>
                </div>
              </section>

              {/* Flags */}
              <section>
                <h3 className="text-foreground font-semibold mb-1">Warning Flags</h3>
                <p className="mb-1">Informational only. These don&apos;t override the rating; the composite score decides.</p>
                <div className="space-y-0.5 ml-2">
                  <div><span className="text-foreground">T1_VOID_LATE:</span> Level 20+ with any T1 stat at 0.</div>
                  <div><span className="text-foreground">BOON_CONFLICT:</span> Boon penalizes an archetype priority stat.</div>
                  <div><span className="text-foreground">DEFENSE_LOCKED:</span> Position-critical defense stat at 0, level &gt; 15.</div>
                  <div><span className="text-foreground">MAXED_BOTTOM_QUARTILE:</span> Level 30 with game stats in bottom 25%.</div>
                </div>
              </section>

              {/* Recomps */}
              <section>
                <h3 className="text-foreground font-semibold mb-1">Recomposed Players</h3>
                <p>Mid-season recomps (Birthday &gt; Day 1) have their game stats suppressed because the Stats field contains data from the previous incarnation. They&apos;re scored on attributes, fit, and growth only.</p>
              </section>

              {/* Percentiles */}
              <section>
                <h3 className="text-foreground font-semibold mb-1">Live Percentiles</h3>
                <p>Game stats are scored against live percentile tables computed from every team in the league via the MMOLB API. Updated on demand.</p>
              </section>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
