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

            <div className="space-y-5 px-4 py-4 text-sm text-muted-foreground">
              <section>
                <h3 className="mb-1 font-semibold text-foreground">Data Window</h3>
                <p>Only the first player record matching both the live SeasonID and <strong className="text-foreground">Offseason</strong> status is used. Missing counters inside that record count as zero; a missing matching record means no sample.</p>
              </section>

              <section>
                <h3 className="mb-1 font-semibold text-foreground">Pitching Staff</h3>
                <p>Qualified pitchers need {MIN_OUTS_STAFF / 3} IP. Their team-relative ERA, WHIP, and K/9 ranks are combined at 34% / 33% / 33%, then blended with underlying pitcher attributes at 75% performance / 25% attributes. Ties use their occupied mid-rank.</p>
                <p className="mt-1">When at least nine pitchers are available, the roster is filled as <strong className="text-foreground">5 SP, 3 RP, and 1 closer</strong>. With fewer than nine, the selected closer is assigned first; remaining arms fill SP slots, then RP slots, and open RP slots remain visible. Qualified arms rank first, while below-floor arms fill remaining slots by attribute score. “Force as SP” locks up to five pitchers into the rotation even below the IP floor and recalculates the other roles. The closer selector chooses by displayed staff rank and skips forced starters.</p>
                <p className="mt-1 text-xs">Pitchers below {LOW_SAMPLE_OUTS / 3} IP are marked low sample.</p>
              </section>

              <section>
                <h3 className="mb-1 font-semibold text-foreground">Batting Order</h3>
                <p>Batters need {MIN_PA_LINEUP} PA. The default order greedily selects the best remaining OBP for slots 1–2, SLG for 3–4, and OPS for 5–9, removing each selected batter before the next slot. Attribute score and player ID break ties.</p>
                <p className="mt-1">The sort menu can instead show descending OBP, OPS, or SLG, or ascending SO%. These are alternate views; they do not change the defensive tab’s default starting nine.</p>
                <p className="mt-1 text-xs">Batters below {LOW_SAMPLE_PA} PA are marked low sample. SO% is strikeouts divided by plate appearances.</p>
              </section>

              <section>
                <h3 className="mb-1 font-semibold text-foreground">Position Fit</h3>
                <p>The default batting-order nine are selected first. An exact optimizer then maximizes the combined fit of eight of those nine across C, 1B, 2B, 3B, SS, LF, CF, and RF; the ninth hitter becomes DH. This guarantees the defense graphic does not substitute a weaker bat solely for glove fit.</p>
                <p className="mt-1">Position fit reuses POP’s defense model: primary-stat target 140, secondary-stat target 80, and catcher Awareness target 200. Each field card shows the two highest-weighted defensive attributes available for that position and the player’s raw values. Its attached “Next fit” box shows the strongest alternative at that spot. The summary is the average fit percentage across the displayed fielding assignments.</p>
                <p className="mt-1">Choosing a player on a position card locks that starter to that spot. The optimizer immediately rearranges every unlocked starter for the best remaining combined fit; choosing “Auto” releases the lock. A player can only be locked at one position. Every bench bat still shows their three highest-fit playable positions.</p>
                <p className="mt-1 text-xs">When fewer than nine batters clear the PA floor, missing starting spots are provisionally filled by OPS and then batting attributes; the tab says so explicitly.</p>
              </section>

              <section>
                <h3 className="mb-1 font-semibold text-foreground">Rate Formulas</h3>
                <div className="grid gap-1 text-xs sm:grid-cols-2">
                  <div><strong className="text-foreground">OBP</strong> = (H + BB + HBP) / (AB + BB + HBP + SF)</div>
                  <div><strong className="text-foreground">SLG</strong> = total bases / AB</div>
                  <div><strong className="text-foreground">OPS</strong> = OBP + SLG</div>
                  <div><strong className="text-foreground">SO%</strong> = strikeouts / PA</div>
                  <div><strong className="text-foreground">ERA</strong> = 9 × ER / IP</div>
                  <div><strong className="text-foreground">WHIP</strong> = (BB + H) / IP</div>
                  <div><strong className="text-foreground">K/9</strong> = 9 × K / IP</div>
                  <div><strong className="text-foreground">IP</strong> = recorded outs / 3</div>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
