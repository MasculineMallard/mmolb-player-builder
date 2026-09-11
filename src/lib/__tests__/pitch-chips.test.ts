import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { computePitchChips } from "../optimizer";
import type { PitchTypesMap } from "../types";

const pitchTypes = JSON.parse(
  readFileSync(join(process.cwd(), "public/data/pitch_types.json"), "utf-8"),
) as PitchTypesMap;

describe("computePitchChips (PR-E per-stat pitch chips)", () => {
  it("chips every pitch on its primary non-velocity priority stat", () => {
    // sl->control, fs(Splitter)->stuff, ch(Changeup)->rotation. velocity ([0], shared) excluded.
    const map = computePitchChips(["sl", "fs", "ch"], pitchTypes);
    expect(map).toEqual({ control: ["Slider"], stuff: ["Splitter"], rotation: ["Changeup"] });
    expect(map).not.toHaveProperty("velocity");
  });

  it("groups multiple pitches that share a primary non-velocity stat", () => {
    // ch & fc both use rotation; sl uses control. velocity remains excluded.
    const map = computePitchChips(["ch", "fc", "sl"], pitchTypes);
    expect(map.rotation).toEqual(expect.arrayContaining(["Changeup", "Cutter"]));
    expect(map.control).toEqual(["Slider"]);
    expect(map).not.toHaveProperty("velocity");
  });

  it("keeps chips when every pitch shares the same non-velocity stat", () => {
    // si, fs, kc all use stuff, so the Stuff row receives all three chips.
    expect(computePitchChips(["si", "fs", "kc"], pitchTypes)).toEqual({
      stuff: ["Sinker", "Splitter", "Knuckle Curve"],
    });
  });

  it("chips a one-pitch arsenal", () => {
    expect(computePitchChips(["ff"], pitchTypes)).toEqual({ presence: ["Fastball"] });
  });

  it("represents every configured pitch, including pitches that share a stat", () => {
    const pitchKeys = Object.keys(pitchTypes);
    const chips = computePitchChips(pitchKeys, pitchTypes);
    const chippedPitches = new Set(Object.values(chips).flat());

    for (const [key, pitch] of Object.entries(pitchTypes)) {
      expect(chippedPitches).toContain(pitch.name ?? key.toUpperCase());
    }
  });

  it("returns empty for no pitches", () => {
    expect(computePitchChips([], pitchTypes)).toEqual({});
  });
});
