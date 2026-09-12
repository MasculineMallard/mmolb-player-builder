"use client";

import { useEffect, useRef, useState } from "react";
import {
  LOW_SAMPLE_OUTS,
  LOW_SAMPLE_PA,
  MIN_OUTS_STAFF,
  MIN_PA_LINEUP,
} from "@/lib/constants";

export function PreseasonGlossaryButton() {
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
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
      >
        How It Works
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="preseason-methodology-title"
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-card shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-4 py-3">
              <div>
                <h2 id="preseason-methodology-title" className="font-bold text-foreground">How the Plotter Works</h2>
                <p className="text-xs text-muted-foreground">Inputs, formulas, roster rules, and overrides</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close methodology"
                className="rounded-md px-2 py-1 text-xl leading-none text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                &times;
              </button>
            </div>

            <div className="grid gap-3 px-4 py-4 text-sm text-muted-foreground">
              <section className="rounded-lg border border-border bg-background/45 p-4">
                <div className="mb-3 flex items-center gap-3">
                  <span className="rounded-md bg-primary/15 px-2 py-1 font-mono text-xs font-black text-primary">01</span>
                  <h3 className="font-bold text-foreground">Data Window</h3>
                </div>
                <ul className="list-disc space-y-1.5 pl-5">
                  <li>Uses the <strong className="text-foreground">first record</strong> matching both the live SeasonID and <strong className="text-foreground">Offseason</strong> status.</li>
                  <li>Missing counters in a matching record count as zero. No matching record means no sample.</li>
                </ul>
              </section>

              <section className="rounded-lg border border-border bg-background/45 p-4">
                <div className="mb-3 flex items-center gap-3">
                  <span className="rounded-md bg-yellow-500/15 px-2 py-1 font-mono text-xs font-black text-yellow-400">02</span>
                  <h3 className="font-bold text-foreground">Pitching Staff</h3>
                </div>
                <ul className="list-disc space-y-1.5 pl-5">
                  <li><strong className="text-foreground">Scoring floor:</strong> {MIN_OUTS_STAFF / 3} IP. Pitchers below the floor are not assigned a pitching score.</li>
                  <li>
                    <strong className="text-foreground">Pitching score:</strong>
                    <span className="mt-1 block rounded-md bg-background/70 px-2.5 py-2 font-mono text-[11px] text-primary">Score = (WHIP rank × 0.50) + (ERA rank × 0.25) + (K/9 rank × 0.25)</span>
                  </li>
                  <li><strong className="text-foreground">Component ranks:</strong> Each rate becomes a 0–100 roster rank. Lower WHIP and ERA are better; higher K/9 is better. Tied rates share their occupied mid-rank; a lone pitcher or all-equal rate receives a neutral 50.</li>
                  <li><strong className="text-foreground">Deterministic ties:</strong> Equal scores resolve by WHIP rank, then ERA rank, then K/9 rank, then stable player ID. Attributes do not alter a qualified pitcher’s score.</li>
                  <li><strong className="text-foreground">Staff shape:</strong> 5 SP, 3 RP, and 1 closer when nine arms are available. Below-floor arms can fill vacancies by attribute score.</li>
                  <li><strong className="text-foreground">Overrides:</strong> “Force as SP” can lock up to five starters, even below the floor. The closer selection skips forced starters.</li>
                </ul>
                <div className="mt-3 rounded-md bg-yellow-500/10 px-3 py-2 text-xs text-yellow-500">Below {LOW_SAMPLE_OUTS / 3} IP is marked <strong>low sample</strong>.</div>
              </section>

              <section className="rounded-lg border border-border bg-background/45 p-4">
                <div className="mb-3 flex items-center gap-3">
                  <span className="rounded-md bg-primary/15 px-2 py-1 font-mono text-xs font-black text-primary">03</span>
                  <h3 className="font-bold text-foreground">Batting Order</h3>
                </div>
                <div className="mb-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-md bg-secondary p-2"><strong className="block text-primary">1–2</strong> best OBP</div>
                  <div className="rounded-md bg-secondary p-2"><strong className="block text-primary">3–4</strong> best SLG</div>
                  <div className="rounded-md bg-secondary p-2"><strong className="block text-primary">5–9</strong> best OPS</div>
                </div>
                <ul className="list-disc space-y-1.5 pl-5">
                  <li>Batters need <strong className="text-foreground">{MIN_PA_LINEUP} PA</strong>. Each selected batter is removed before the next slot; attributes and player ID break ties.</li>
                  <li>Every row shows SO%. The menu can also re-sort the view by OBP, OPS, SLG, or lowest SO%.</li>
                  <li>Alternate sorts <strong className="text-foreground">do not replace</strong> the default nine used by Position Fit.</li>
                  <li><strong className="text-foreground">Bars and yellow glow:</strong> OPS bars reach full width at 1.000 while the real value remains visible. The row glows yellow at OPS &gt; 1.000, OBP ≥ .450, SLG ≥ .700, or SO% ≤ 10.0%.</li>
                </ul>
                <div className="mt-3 rounded-md bg-yellow-500/10 px-3 py-2 text-xs text-yellow-500">Below {LOW_SAMPLE_PA} PA is marked <strong>low sample</strong>.</div>
              </section>

              <section className="rounded-lg border border-primary/25 bg-primary/5 p-4">
                <div className="mb-3 flex items-center gap-3">
                  <span className="rounded-md bg-yellow-500/15 px-2 py-1 font-mono text-xs font-black text-yellow-400">04</span>
                  <h3 className="font-bold text-foreground">Position Fit</h3>
                </div>
                <ul className="list-disc space-y-2 pl-5">
                  <li><strong className="text-foreground">The nine best bats come first.</strong> Eight field; the ninth becomes DH. Auto defense never swaps in a weaker bat just for glove fit, but a manual lock can promote the DH or any bench bat.</li>
                  <li><strong className="text-foreground">Items and current player modifiers count here.</strong> Fit uses base attributes plus equipped-item and available canonical modifier effects. Boons are not added. The cards show these adjusted values.</li>
                  <li><strong className="text-foreground">Modifier source:</strong> numeric effects use the active date window from the <a className="text-primary underline underline-offset-2" href="https://github.com/anodoze/mmolb-modifiers" target="_blank" rel="noreferrer">anodoze/mmolb-modifiers list</a>. If that source cannot be reached, Pop labels the field and leaves player-modifier effects out instead of guessing.</li>
                  <li>
                    <strong className="text-foreground">Fit equation:</strong>
                    <span className="mt-1 block rounded-md bg-background/70 px-2.5 py-2 font-mono text-[11px] text-primary">Σ(weight × min(item-adjusted stat ÷ target, 1)) ÷ Σ(weights) × 100</span>
                  </li>
                  <li><strong className="text-foreground">Position priorities:</strong> Catcher favors Awareness. Among the four infielders, equipped Reaction is ordered SS → 3B → 2B → 1B. Outfield placement emphasizes Acrobatics/Agility and sends the strongest outfield Arm to RF.</li>
                  <li><strong className="text-foreground">Fit targets:</strong> 140 for primary stats, 80 for secondary stats, and 200 for catcher Awareness. “Next fit” shows the strongest alternative.</li>
                  <li><strong className="text-foreground">Locks win.</strong> Choosing any field, DH, or bench batter fixes that player to the spot and recomputes the best valid arrangement everywhere else. “Auto” releases it.</li>
                  <li>Bench bats keep their three best playable positions. The summary is the average fit percentage across all eight fielders.</li>
                </ul>
                <div className="mt-3 rounded-md border border-border bg-background/60 px-3 py-2 text-xs italic">If fewer than nine batters clear the PA floor, OPS and then batting attributes provisionally fill the missing starters.</div>
              </section>

              <section className="rounded-lg border border-border bg-background/45 p-4">
                <div className="mb-3 flex items-center gap-3">
                  <span className="rounded-md bg-primary/15 px-2 py-1 font-mono text-xs font-black text-primary">05</span>
                  <h3 className="font-bold text-foreground">Rate Formulas</h3>
                </div>
                <div className="grid gap-2 text-xs sm:grid-cols-2">
                  <div className="rounded-md bg-secondary p-2"><strong className="text-foreground">OBP</strong><span className="block font-mono">(H + BB + HBP) / (AB + BB + HBP + SF)</span></div>
                  <div className="rounded-md bg-secondary p-2"><strong className="text-foreground">SLG</strong><span className="block font-mono">total bases / AB</span></div>
                  <div className="rounded-md bg-secondary p-2"><strong className="text-foreground">OPS</strong><span className="block font-mono">OBP + SLG</span></div>
                  <div className="rounded-md bg-secondary p-2"><strong className="text-foreground">SO%</strong><span className="block font-mono">strikeouts / PA</span></div>
                  <div className="rounded-md bg-secondary p-2"><strong className="text-foreground">ERA</strong><span className="block font-mono">9 × ER / IP</span></div>
                  <div className="rounded-md bg-secondary p-2"><strong className="text-foreground">WHIP</strong><span className="block font-mono">(BB + H) / IP</span></div>
                  <div className="rounded-md bg-secondary p-2"><strong className="text-foreground">K/9</strong><span className="block font-mono">9 × K / IP</span></div>
                  <div className="rounded-md bg-secondary p-2"><strong className="text-foreground">HR/9</strong><span className="block font-mono">9 × HR allowed / IP · display only</span></div>
                  <div className="rounded-md bg-secondary p-2"><strong className="text-foreground">IP</strong><span className="block font-mono">recorded outs / 3</span></div>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
