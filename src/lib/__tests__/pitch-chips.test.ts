import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { computePitchChips } from "../optimizer";
import type { PitchTypesMap } from "../types";

const pitchTypes = JSON.parse(
  readFileSync(join(process.cwd(), "public/data/pitch_types.json"), "utf-8"),
) as PitchTypesMap;

describe("computePitchChips (PR-E per-stat pitch chips)", () => {
  it("chips the differentiating (2nd) priority stat and excludes velocity", () => {
    // sl->control, fs(Splitter)->stuff, ch(Changeup)->rotation. velocity ([0], shared) excluded.
    const map = computePitchChips(["sl", "fs", "ch"], pitchTypes);
    expect(map).toEqual({ control: ["Slider"], stuff: ["Splitter"], rotation: ["Changeup"] });
    expect(map).not.toHaveProperty("velocity");
  });

  it("groups multiple pitches that share a differentiating stat", () => {
    // ch & fc both differentiate on rotation; sl on control. velocity is the only all-shared stat.
    const map = computePitchChips(["ch", "fc", "sl"], pitchTypes);
    expect(map.rotation).toEqual(expect.arrayContaining(["Changeup", "Cutter"]));
    expect(map.control).toEqual(["Slider"]);
    expect(map).not.toHaveProperty("velocity");
  });

  it("drops a stat shared by ALL thrown pitches (not differentiating)", () => {
    // si, fs, kc all differentiate on stuff -> stuff is shared by all -> no chips (velocity too).
    expect(computePitchChips(["si", "fs", "kc"], pitchTypes)).toEqual({});
  });

  it("returns empty for no pitches", () => {
    expect(computePitchChips([], pitchTypes)).toEqual({});
  });
});
