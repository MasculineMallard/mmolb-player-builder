import { describe, it, expect } from "vitest";
import { sortArchetypeEntries } from "../ArchetypeSelect";
import type { Archetype } from "@/lib/types";

// sortArchetypeEntries produces the dropdown's dynamic <option> order (the static
// "Select an archetype..." is pinned first and "Custom Build..." last, outside this list).

const mk = (name: string): Archetype =>
  ({ name, emoji: "", description: "", priority_stats: [], secondary_stats: [], stat_weights: {} }) as Archetype;
const entries: [string, Archetype][] = [["a", mk("A")], ["b", mk("B")], ["c", mk("C")], ["d", mk("D")]];

describe("sortArchetypeEntries (PR-C dropdown ordering)", () => {
  it("batter: orders by stat-fit descending, key as stable tiebreak", () => {
    const stat = new Map([["a", 40], ["b", 90], ["c", 90], ["d", 10]]);
    const order = sortArchetypeEntries(entries, stat, new Map(), "batter").map(([k]) => k);
    expect(order).toEqual(["b", "c", "a", "d"]); // 90 (b<c by key), 40, 10
  });

  it("pitcher: pitch-fit first, stat-fit as tiebreak", () => {
    const stat = new Map([["a", 80], ["b", 20], ["c", 99], ["d", 50]]);
    const pitch = new Map<string, number | null>([["a", 70], ["b", 70], ["c", 30], ["d", null]]);
    const order = sortArchetypeEntries(entries, stat, pitch, "pitcher").map(([k]) => k);
    // pitch 70 (a,b) -> stat tiebreak a80>b20 -> a,b; then c(30); then d(null=-1)
    expect(order).toEqual(["a", "b", "c", "d"]);
  });

  it("pitcher with no pitch data falls back to stat-fit", () => {
    const stat = new Map([["a", 10], ["b", 55], ["c", 30], ["d", 90]]);
    const order = sortArchetypeEntries(entries, stat, new Map(), "pitcher").map(([k]) => k);
    expect(order).toEqual(["d", "b", "c", "a"]);
  });

  it("does not mutate the input array", () => {
    const before = entries.map(([k]) => k);
    sortArchetypeEntries(entries, new Map([["a", 1], ["b", 2], ["c", 3], ["d", 4]]), new Map(), "batter");
    expect(entries.map(([k]) => k)).toEqual(before);
  });
});
