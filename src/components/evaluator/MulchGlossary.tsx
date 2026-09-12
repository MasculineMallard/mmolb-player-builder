"use client";

import { useEffect, useRef, useState } from "react";
import { MULCH_MIN_PA, MULCH_MIN_IP } from "@/lib/constants";

const RATING_TIERS = [
  { name: "STAR", range: "65+", summary: "Top ~8%. Elite build and production.", className: "border-blue-500/45 bg-blue-500/10 text-blue-400" },
  { name: "STRONG", range: "55–64", summary: "Above-average, solid contributor.", className: "border-sky-400/35 bg-sky-400/10 text-sky-300" },
  { name: "ROSTER", range: "42–54", summary: "Playable; does the job.", className: "border-slate-400/30 bg-slate-400/10 text-slate-300" },
  { name: "FRINGE", range: "35–41", summary: "On the replacement bubble.", className: "border-orange-400/40 bg-orange-400/10 text-orange-300" },
  { name: "MULCH", range: "<35", summary: "Weak build; recompose candidate.", className: "border-red-500/45 bg-red-500/10 text-red-400" },
] as const;

const POSITION_ROWS = [
  ["C", "Awareness"],
  ["1B", "Reaction · Composure · Awareness"],
  ["2B", "Reaction · Awareness · Composure"],
  ["3B", "Reaction · Composure · Awareness"],
  ["SS", "Reaction · Composure · Awareness · Arm"],
  ["LF", "Acrobatics · Agility · Arm · Dexterity"],
  ["CF", "Acrobatics · Agility · Arm"],
  ["RF", "Acrobatics · Arm · Agility · Dexterity"],
  ["P / DH", "Not scored"],
] as const;

function SectionTitle({ number, title, tone = "blue" }: { number: string; title: string; tone?: "blue" | "yellow" | "red" }) {
  const color = tone === "yellow"
    ? "bg-yellow-500/15 text-yellow-400"
    : tone === "red"
      ? "bg-red-500/15 text-red-400"
      : "bg-primary/15 text-primary";
  return (
    <div className="mb-3 flex items-center gap-3">
      <span className={`rounded-md px-2 py-1 font-mono text-xs font-black ${color}`}>{number}</span>
      <h3 className="font-bold text-foreground">{title}</h3>
    </div>
  );
}

export function GlossaryButton() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const dialog = dialogRef.current;
    const focusableSelector = "button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector));
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    dialog?.querySelector<HTMLElement>(focusableSelector)?.focus();
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      trigger?.focus();
    };
  }, [open]);

  return (
    <>
      <button ref={triggerRef} type="button" onClick={() => setOpen(true)} className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-foreground">
        How It Works
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setOpen(false)} role="presentation">
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="mulch-methodology-title" className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-border bg-card shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-4 py-3">
              <div>
                <h2 id="mulch-methodology-title" className="font-bold text-foreground">How Mulch-o-Meter Ratings Work</h2>
                <p className="text-xs text-muted-foreground">Rating bands, score pillars, weights, and safeguards</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close methodology" className="rounded-md px-2 py-1 text-xl leading-none text-muted-foreground hover:bg-secondary hover:text-foreground">&times;</button>
            </div>

            <div className="grid gap-3 px-4 py-4 text-sm text-muted-foreground">
              <section className="rounded-lg border border-border bg-background/45 p-4">
                <SectionTitle number="01" title="Rating Tiers" />
                <div className="grid gap-2 sm:grid-cols-5">
                  {RATING_TIERS.map((tier) => (
                    <div key={tier.name} className={`rounded-lg border p-2.5 ${tier.className}`}>
                      <div className="flex items-baseline justify-between gap-1"><strong className="text-xs tracking-wide">{tier.name}</strong><span className="font-mono text-xs font-black">{tier.range}</span></div>
                      <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{tier.summary}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-lg border border-primary/25 bg-primary/5 p-4">
                <SectionTitle number="02" title="Composite Score" tone="yellow" />
                <div className="mb-3 rounded-md bg-background/70 px-3 py-2 font-mono text-xs text-primary">Rating = Σ(active pillar score × active weight)</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg border border-border bg-background/55 p-3"><h4 className="font-bold text-foreground">Attributes</h4><p className="mt-1 text-xs leading-relaxed">The share of stat points in useful stats: T1 counts fully, T2 counts half, and T3 counts zero. That level-neutral ratio is scored against live league percentiles.</p></div>
                  <div className="rounded-lg border border-border bg-background/55 p-3"><h4 className="font-bold text-foreground">Game Stats</h4><p className="mt-1 text-xs leading-relaxed"><strong className="text-foreground">Batters:</strong> OBP 30%, SLG 30%, K% 13%, BB% 13%, SB% 14%.</p><p className="mt-1 text-xs leading-relaxed"><strong className="text-foreground">Pitchers:</strong> ERA 20%, WHIP 25%, K/9 25%, BB/9 15%, HR/9 15%.</p></div>
                  <div className="rounded-lg border border-border bg-background/55 p-3"><h4 className="font-bold text-foreground">Position Fit</h4><p className="mt-1 text-xs leading-relaxed">Weighted defensive attributes measured against fixed targets: primary 140, secondary 80, and catcher Awareness 200.</p></div>
                  <div className="rounded-lg border border-border bg-background/55 p-3"><h4 className="font-bold text-foreground">Growth</h4><p className="mt-1 text-xs leading-relaxed">Remaining stat points and boon slots. A level 1 player has roughly 100 growth; level 30 has zero. Growth is capped at 25% of the final rating.</p></div>
                </div>
              </section>

              <section className="rounded-lg border border-border bg-background/45 p-4">
                <SectionTitle number="03" title="Weight Distribution" />
                <p className="mb-3 text-xs">Missing pillars drop out and their weight is redistributed. Batters emphasize production; pitchers are balanced evenly when all pillars exist.</p>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full min-w-[560px] text-xs">
                    <thead className="bg-secondary text-left text-foreground"><tr><th className="px-3 py-2">Scenario</th><th>Attr</th><th>Stats</th><th>Fit</th><th>Growth</th></tr></thead>
                    <tbody>
                      <tr className="border-t border-border bg-primary/5"><td colSpan={5} className="px-3 py-1.5 font-bold text-primary">Batters</td></tr>
                      <tr className="border-t border-border/40"><td className="px-3 py-1.5">All available</td><td>20%</td><td>40%</td><td>20%</td><td>20%</td></tr>
                      <tr><td className="px-3 py-1.5">No fit (DH)</td><td>25%</td><td>50%</td><td>—</td><td>25%</td></tr>
                      <tr><td className="px-3 py-1.5">No game stats</td><td>43%</td><td>—</td><td>32%</td><td>25%</td></tr>
                      <tr><td className="px-3 py-1.5">No stats + no fit</td><td>75%</td><td>—</td><td>—</td><td>25%</td></tr>
                      <tr className="border-t border-border bg-yellow-500/5"><td colSpan={5} className="px-3 py-1.5 font-bold text-yellow-400">Pitchers</td></tr>
                      <tr className="border-t border-border/40"><td className="px-3 py-1.5">All available</td><td>25%</td><td>25%</td><td>25%</td><td>25%</td></tr>
                      <tr><td className="px-3 py-1.5">No fit</td><td>40%</td><td>40%</td><td>—</td><td>20%</td></tr>
                      <tr><td className="px-3 py-1.5">No game stats</td><td>43%</td><td>—</td><td>32%</td><td>25%</td></tr>
                      <tr><td className="px-3 py-1.5">No stats + no fit</td><td>75%</td><td>—</td><td>—</td><td>25%</td></tr>
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs italic">Growth stays capped at 25%; excess weight is redistributed across the other active pillars.</p>
              </section>

              <section className="rounded-lg border border-border bg-background/45 p-4">
                <SectionTitle number="04" title="Attribute Tiers" tone="yellow" />
                <p className="mb-3 text-xs">Batter tiers use the S15 regression; pitcher tiers use Bagyilisk&apos;s S10/S11 analyses.</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg bg-secondary/55 p-3"><h4 className="mb-2 font-bold text-foreground">Batting</h4><p className="text-xs"><strong className="text-primary">T1 · full:</strong> Contact, Performance, Aiming, Discipline, Insight, Muscle</p><p className="mt-1.5 text-xs"><strong className="text-yellow-400">T2 · half:</strong> Vision, Lift, Speed, Intimidation, Determination</p><p className="mt-1.5 text-xs"><strong className="text-red-400">T3 · zero:</strong> Cunning, Selflessness, Wisdom</p></div>
                  <div className="rounded-lg bg-secondary/55 p-3"><h4 className="mb-2 font-bold text-foreground">Pitching</h4><p className="text-xs"><strong className="text-primary">T1 · full:</strong> Velocity, Control, Rotation, Stuff, Presence</p><p className="mt-1.5 text-xs"><strong className="text-yellow-400">T2 · half:</strong> Accuracy, Deception, Persuasion, Guts, Stamina</p><p className="mt-1.5 text-xs"><strong className="text-red-400">T3 · zero:</strong> Intuition, Defiance</p></div>
                </div>
              </section>

              <section className="rounded-lg border border-primary/25 bg-primary/5 p-4">
                <SectionTitle number="05" title="Position Defense" />
                <p className="text-xs">Defense weights blend the community defense model with fielding-value regression.</p>
                <div className="my-3 rounded-md bg-background/70 px-3 py-2 font-mono text-[11px] text-primary">Fit % = Σ(weight × min(base stat ÷ target, 1)) ÷ Σ(weights) × 100</div>
                <div className="grid gap-1.5 sm:grid-cols-3">
                  {POSITION_ROWS.map(([position, stats]) => <div key={position} className="rounded-md border border-border bg-background/55 px-2.5 py-2"><strong className="text-primary">{position}</strong><span className="ml-2 text-[11px]">{stats}</span></div>)}
                </div>
              </section>

              <section className="rounded-lg border border-red-500/25 bg-red-500/5 p-4">
                <SectionTitle number="06" title="Warning Flags" tone="red" />
                <p className="mb-3 text-xs">Flags are context only. They never override the composite rating.</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-md border border-red-500/25 bg-background/60 p-2.5 text-xs"><strong className="text-red-400">T1_VOID_LATE</strong><span className="mt-0.5 block">Level 20+ with a T1 stat at zero.</span></div>
                  <div className="rounded-md border border-orange-400/25 bg-background/60 p-2.5 text-xs"><strong className="text-orange-300">BOON_CONFLICT</strong><span className="mt-0.5 block">A boon penalizes an archetype priority stat.</span></div>
                  <div className="rounded-md border border-red-500/25 bg-background/60 p-2.5 text-xs"><strong className="text-red-400">DEFENSE_LOCKED</strong><span className="mt-0.5 block">Position-critical defense is zero after level 15.</span></div>
                  <div className="rounded-md border border-orange-400/25 bg-background/60 p-2.5 text-xs"><strong className="text-orange-300">MAXED_BOTTOM_QUARTILE</strong><span className="mt-0.5 block">Level 30 with bottom-quartile production.</span></div>
                  <div className="rounded-md border border-yellow-500/25 bg-background/60 p-2.5 text-xs sm:col-span-2"><strong className="text-yellow-400">CUNNING_OBP_TRAP</strong><span className="mt-0.5 block">High Cunning with low Discipline + Contact—an OBP mirage.</span></div>
                </div>
              </section>

              <section className="rounded-lg border border-border bg-background/45 p-4">
                <SectionTitle number="07" title="Safeguards & Data Freshness" tone="yellow" />
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="rounded-lg bg-secondary/55 p-3"><h4 className="font-bold text-foreground">Minimum sample</h4><p className="mt-1 text-xs leading-relaxed">Stats count at {MULCH_MIN_PA} PA for batters or {MULCH_MIN_IP} IP for pitchers. Below that, Stats is N/A and its weight drops out.</p></div>
                  <div className="rounded-lg bg-secondary/55 p-3"><h4 className="font-bold text-foreground">Recomposed players</h4><p className="mt-1 text-xs leading-relaxed">Mid-season recomps suppress production inherited from the previous incarnation and score on attributes, fit, and growth.</p></div>
                  <div className="rounded-lg bg-secondary/55 p-3"><h4 className="font-bold text-foreground">League percentiles</h4><p className="mt-1 text-xs leading-relaxed">Production is scored against a live league sample refreshed daily from MMOLB.</p></div>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
