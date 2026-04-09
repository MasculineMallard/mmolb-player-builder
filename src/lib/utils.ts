import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { SLOT_TO_POSITION } from "./constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Display cap for offense/pitching stat bars in the builder UI. */
export const STAT_DISPLAY_MAX = 500;

/** Display cap for defense stat bars in the builder UI. */
export const DEFENSE_DISPLAY_MAX = 300;

/** Color thresholds for stat values. Yellow→Blue gradient. */
export function getStatColor(value: number): string {
  if (value >= 500) return "var(--scale-great)";
  if (value >= 350) return "var(--scale-good)";
  if (value >= 200) return "var(--scale-mid)";
  if (value >= 80) return "var(--scale-poor)";
  return "var(--scale-bad)";
}

/**
 * Continuous orange→blue gradient for stat bar fills.
 * Returns a CSS color string that smoothly transitions from orange (0) to blue (STAT_DISPLAY_MAX).
 */
export function getStatBarColor(value: number): string {
  const t = Math.min(value / STAT_DISPLAY_MAX, 1);
  // Orange (#E8A735) → Amber (#D4A843) → Gray (#8B949E) → Blue (#60A5FA) → Bright Blue (#3B82F6)
  if (t < 0.2) {
    return "#E8A735";
  } else if (t < 0.35) {
    const p = (t - 0.2) / 0.15;
    return lerpColor(0xE8, 0xA7, 0x35, 0xD4, 0xA8, 0x43, p);
  } else if (t < 0.5) {
    const p = (t - 0.35) / 0.15;
    return lerpColor(0xD4, 0xA8, 0x43, 0x8B, 0x94, 0x9E, p);
  } else if (t < 0.7) {
    const p = (t - 0.5) / 0.2;
    return lerpColor(0x8B, 0x94, 0x9E, 0x60, 0xA5, 0xFA, p);
  } else {
    const p = (t - 0.7) / 0.3;
    return lerpColor(0x60, 0xA5, 0xFA, 0x3B, 0x82, 0xF6, p);
  }
}

function lerpColor(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number, t: number): string {
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${b})`;
}

/** Check if an error is an AbortError (from AbortController). */
export function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}

/** Convert a slot name to a display position string. */
export function slotToPosition(slot: string | null): string | null {
  if (!slot) return null;
  const key = slot.toLowerCase();
  return SLOT_TO_POSITION[key] ?? key.toUpperCase();
}
