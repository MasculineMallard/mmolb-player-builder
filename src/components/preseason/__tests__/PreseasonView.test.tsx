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
      homeRunsAllowed: index,
      ERA: outs ? index : null,
      WHIP: outs ? 1 + (index / 10) : null,
      K9: outs ? 9 : null,
      HR9: outs ? index * 0.9 : null,
    },
    sampleSize: { PA: 0, outs },
    dataWarnings: [],
  };
}

function batter(id: string, index: number): PreseasonPlayerData {
  const PA = 40;
  return {
    name: id,
    firstName: id,
    lastName: "Player",
    level: 20,
    teamName: "Fixture Foxes",
    teamEmoji: "🦊",
    position: index === 0 ? "C" : "CF",
    durability: 5,
    stats: {
      awareness: 200 - index,
      reaction: 140 + index,
      acrobatics: 130 + index,
    },
    lesserBoons: [],
    greaterBoons: [],
    mmolbPlayerId: id,
    pitches: [],
    isBench: false,
    preseasonBatting: {
      PA,
      AB: PA,
      H: 10,
      singles: 10,
      doubles: 0,
      triples: 0,
      homeRuns: 0,
      walks: 2,
      hitByPitch: 0,
      sacrificeFlies: 0,
      strikeouts: 5,
      totalBases: 10,
      OBP: 0.4 - (index * 0.01),
      SLG: 0.5 - (index * 0.01),
      OPS: 0.9 - (index * 0.02),
      SO_PCT: 0.125,
    },
    preseasonPitching: null,
    sampleSize: { PA, outs: 0 },
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

  it("locks a starter to a field position and exposes a reset control", async () => {
    const players = Array.from({ length: 9 }, (_, index) => batter(`b${index + 1}`, index));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => players,
      headers: { get: () => "Offseason" },
    }));

    render(<PreseasonView />);
    fireEvent.click(screen.getByRole("button", { name: /Fixture Foxes/ }));
    await waitFor(() => expect(screen.getByTestId("pitching-staff-card")).toBeTruthy());
    fireEvent.click(screen.getByRole("tab", { name: /Position Fit/ }));

    fireEvent.change(screen.getAllByLabelText(/^Player assignment for CF;/)[0], { target: { value: "b1" } });
    await waitFor(() => {
      const centerField = screen.getAllByTestId("fielder-node")
        .find((node) => node.getAttribute("data-position") === "CF");
      expect(centerField?.getAttribute("data-locked")).toBe("true");
      expect((within(centerField!).getByLabelText(/^Player assignment for CF;/) as HTMLSelectElement).value).toBe("b1");
    });

    const rightField = screen.getAllByTestId("fielder-node")
      .find((node) => node.getAttribute("data-position") === "RF");
    fireEvent.change(within(rightField!).getByLabelText(/^Player assignment for RF;/), { target: { value: "b1" } });
    await waitFor(() => {
      const fielders = screen.getAllByTestId("fielder-node");
      expect(fielders.find((node) => node.getAttribute("data-position") === "CF")?.getAttribute("data-locked")).toBe("false");
      expect(fielders.find((node) => node.getAttribute("data-position") === "RF")?.getAttribute("data-locked")).toBe("true");
    });

    const lockedRightField = screen.getAllByTestId("fielder-node")
      .find((node) => node.getAttribute("data-position") === "RF");
    fireEvent.change(within(lockedRightField!).getByLabelText(/^Player assignment for RF;/), { target: { value: "" } });
    await waitFor(() => expect(screen.queryByRole("button", { name: /Reset 1 lock/ })).toBeNull());

    fireEvent.change(screen.getAllByLabelText(/^Player assignment for CF;/)[0], { target: { value: "b1" } });
    const reset = await screen.findByRole("button", { name: "Reset 1 lock" });
    fireEvent.click(reset);
    await waitFor(() => {
      expect(screen.getAllByTestId("fielder-node").every((node) => node.getAttribute("data-locked") === "false")).toBe(true);
      expect(screen.queryByRole("button", { name: /Reset 1 lock/ })).toBeNull();
    });
  });
});
