// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PreseasonPlayerData } from "@/lib/preseason-data";
import { PreseasonView } from "../PreseasonView";

vi.mock("@/hooks/use-team-search", () => ({
  useTeamSearch: () => ({
    results: [{ mmolbTeamId: "fixture", location: "Fixture", name: "Foxes", emoji: "🦊" }],
    loading: false,
    error: null,
  }),
}));

vi.mock("@/lib/evaluator-data", async () => {
  const actual = await vi.importActual<typeof import("@/lib/evaluator-data")>("@/lib/evaluator-data");
  return {
    ...actual,
    loadPositionDefense: vi.fn().mockResolvedValue({
      C: { stat_weights: { awareness: 1 }, primary_stats: ["awareness"], secondary_stats: [] },
      "1B": { stat_weights: { reaction: 1 }, primary_stats: ["reaction"], secondary_stats: [] },
      "2B": { stat_weights: { reaction: 1 }, primary_stats: ["reaction"], secondary_stats: [] },
      "3B": { stat_weights: { reaction: 1 }, primary_stats: ["reaction"], secondary_stats: [] },
      SS: { stat_weights: { reaction: 1 }, primary_stats: ["reaction"], secondary_stats: [] },
      LF: { stat_weights: { acrobatics: 1 }, primary_stats: ["acrobatics"], secondary_stats: [] },
      CF: { stat_weights: { acrobatics: 1 }, primary_stats: ["acrobatics"], secondary_stats: [] },
      RF: { stat_weights: { acrobatics: 1 }, primary_stats: ["acrobatics"], secondary_stats: [] },
    }),
  };
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function pitcher(id: string, index: number): PreseasonPlayerData {
  const outs = id === "tiny" ? 0 : 30;
  return {
    name: id,
    firstName: id,
    lastName: "Player",
    level: 20,
    teamName: "Fixture Foxes",
    teamEmoji: "🦊",
    position: "SP",
    durability: 5,
    stats: { velocity: 200 - index },
    lesserBoons: [],
    greaterBoons: [],
    mmolbPlayerId: id,
    pitches: [],
    isBench: false,
    preseasonBatting: null,
    preseasonPitching: {
      outs,
      IP: outs / 3,
      earnedRuns: index,
      hitsAllowed: index,
      walks: 0,
      strikeouts: 10,
      ERA: outs ? index : null,
      WHIP: outs ? 1 + (index / 10) : null,
      K9: outs ? 9 : null,
    },
    sampleSize: { PA: 0, outs },
    dataWarnings: [],
  };
}

describe("PreseasonView tabs", () => {
  it("supports arrow navigation and preserves a forced starter across tabs", async () => {
    const players = [
      ...Array.from({ length: 9 }, (_, index) => pitcher(`p${index + 1}`, index)),
      pitcher("tiny", 10),
    ];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => players,
      headers: { get: () => "Offseason" },
    }));

    render(<PreseasonView />);
    fireEvent.click(screen.getByRole("button", { name: /Fixture Foxes/ }));
    await waitFor(() => expect(screen.getByTestId("pitching-staff-card")).toBeTruthy());

    const tiny = screen.getByTestId("pitcher-tile-tiny");
    fireEvent.click(within(tiny).getByRole("button", { name: "Force as SP" }));

    const pitchingTab = screen.getByRole("tab", { name: /Pitching Staff/ });
    const battingTab = screen.getByRole("tab", { name: /Batting Order/ });
    pitchingTab.focus();
    fireEvent.keyDown(pitchingTab, { key: "ArrowRight" });
    expect(battingTab.getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(battingTab);

    fireEvent.click(pitchingTab);
    expect(within(screen.getByTestId("pitcher-tile-tiny")).getByRole("button", { pressed: true })).toBeTruthy();
  });
});
