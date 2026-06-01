"use client";

import { useState } from "react";

interface ShopGlossaryButtonProps {
  toolName?: string;
  isPitcher?: boolean;
}

export function ShopGlossaryButton({ toolName = "Super Slugger Sartoria", isPitcher = false }: ShopGlossaryButtonProps) {
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
              <h2 className="text-sm font-bold uppercase tracking-wide">{toolName} Guide</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <div className="px-4 py-3 space-y-4 text-sm text-muted-foreground">
              <section>
                <h3 className="text-foreground font-semibold mb-1">What This Does</h3>
                <p>Recommends the ideal item affixes for each equipment slot based on your player&apos;s current stats, archetype targets, defense needs, and boon synergies. Shows whether flat (+X) or percent (+X%) affixes are better for each stat at the selected tier.</p>
              </section>

              <section>
                <h3 className="text-foreground font-semibold mb-1">Item Tiers</h3>
                <p className="mb-1">Items come in 7 tiers. Each affix rolls within a range; the tool uses the max for each tier.</p>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-foreground">
                      <th className="pb-1">Tier</th>
                      <th className="pb-1">Max Flat</th>
                      <th className="pb-1">Max %</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td>T1</td><td>+5</td><td>4%</td></tr>
                    <tr><td>T2</td><td>+10</td><td>8%</td></tr>
                    <tr><td>T3</td><td>+15</td><td>12%</td></tr>
                    <tr><td>T4</td><td>+20</td><td>16%</td></tr>
                    <tr><td>T5</td><td>+25</td><td>20%</td></tr>
                    <tr><td>T6</td><td>+30</td><td>24%</td></tr>
                    <tr><td>T7</td><td>+35</td><td>28%</td></tr>
                  </tbody>
                </table>
              </section>

              <section>
                <h3 className="text-foreground font-semibold mb-1">Flat vs. Percent</h3>
                <p>Flat bonuses add a fixed amount (amplified by boons). Percent bonuses multiply your current stat value. At low stats, flat is better. At high stats, percent is better. The crossover depends on the tier and your boon multiplier.</p>
                <div className="mt-1 space-y-0.5 ml-2">
                  <div><span className="text-sky-200">Light blue text/bar</span> = flat bonus projection</div>
                  <div><span className="text-blue-400">Blue text/bar</span> = percent bonus projection</div>
                </div>
              </section>

              <section>
                <h3 className="text-foreground font-semibold mb-1">Shopping List</h3>
                <p>Shows your most needed stats ranked by priority. For each stat: the gap from target, whether to buy flat or percent, and which equipment slots can roll that stat.</p>
              </section>

              <section>
                <h3 className="text-foreground font-semibold mb-1">Item Cards</h3>
                <p>Each card shows the recommended affixes for one equipment slot with four columns: stat name, what your current item has, the ideal value, and the difference.</p>
                <p className="mt-1">White stats are offensive, <span className="text-yellow-400">yellow stats</span> are defensive. Items roll 3 offensive + 2 defensive attributes. The same stat can appear twice on one item (once flat, once percent).</p>
              </section>

              <section>
                <h3 className="text-foreground font-semibold mb-1">Star Indicators</h3>
                <div className="space-y-1 ml-2">
                  <div><span className="text-blue-400">★ Blue star</span> = stat target priority. The two slots with the most impactful archetype stats.</div>
                  <div><span className="text-yellow-400">★ Yellow star</span> = shop priority. The two slots where your current item is furthest from ideal. These are where to spend coins first.</div>
                </div>
              </section>

              <section>
                <h3 className="text-foreground font-semibold mb-1">Current Equipment</h3>
                <p>The &quot;has&quot; column shows what your equipped item gives for each recommended stat. A dash means the item doesn&apos;t cover that stat at all. The &quot;diff&quot; column shows the gap: <span className="text-green-400">green</span> means your item meets or exceeds ideal, <span className="text-red-400">red</span> means there&apos;s a gap to close.</p>
              </section>

              <section>
                <h3 className="text-foreground font-semibold mb-1">Projected Build</h3>
                <p>Shows what your stats would look like if all 5 items targeted the recommended stats. The bars show current (grey), flat projection (light blue), and percent projection (blue). The white line marks your archetype target.</p>
              </section>

              <section>
                <h3 className="text-foreground font-semibold mb-1">Boon Interaction</h3>
                <p>Boons that boost a stat make flat items more effective for that stat (+50% boon = flat items give 1.5x value). This is factored into the flat vs. percent recommendation and the stat priority scoring.</p>
              </section>

              {!isPitcher && (
                <section>
                  <h3 className="text-foreground font-semibold mb-1">Position Override</h3>
                  <p>Change the position dropdown to model defense needs for a different position. Useful for evaluating position switches.</p>
                </section>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
