// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PreseasonPlayerData } from "@/lib/preseason-data";
import type { PositionAssignmentRec } from "@/lib/preseason-recommend";
import { FieldDiagram } from "../FieldDiagram";

afterEach(cleanup);

function makePlayer(id: string): PreseasonPlayerData {
  return {
    name: `Player ${id}`,
    firstName: "Player",
    lastName: id,
    level: 20,
    teamName: "Test",
    teamEmoji: null,
    position: "C",
    durability: 5,
    stats: {},
    lesserBoons: [],
    greaterBoons: [],
    mmolbPlayerId: id,
    pitches: [],
    isBench: false,
    preseasonBatting: null,
    preseasonPitching: null,
    sampleSize: { PA: 30, outs: 0 },
    dataWarnings: [],
  };
}

describe("FieldDiagram", () => {
  it("renders exactly eight designed fielder cards for a full assignment", () => {
    const positions = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"];
    const onLockPosition = vi.fn();
    const recommendation: PositionAssignmentRec = {
      fielders: positions.map((position, index) => ({
        player: makePlayer(String(index + 1)),
        assignedPosition: position,
        personalBestPosition: position,
        fitScore: 75,
        isPersonalBest: true,
        isLocked: false,
        keyStats: [{ stat: "awareness", value: 123, weight: 0.12 }],
        positionOptions: [],
      })),
      designatedHitter: null,
      bench: [],
      pitchers: [],
      alternatives: [{
        position: "C",
        player: makePlayer("2"),
        fitScore: 70,
        keyStats: [{ stat: "awareness", value: 111, weight: 0.12 }],
        isStarter: true,
      }],
      startingBatterIds: positions.map((_, index) => String(index + 1)),
      battingOrderLocked: false,
      totalFit: 600,
    };

    render(<FieldDiagram recommendation={recommendation} onLockPosition={onLockPosition} />);
    const fielders = screen.getAllByTestId("fielder-node");
    expect(fielders).toHaveLength(8);
    fielders.forEach((fielder) => {
      expect(within(fielder).getByText("Awareness")).toBeTruthy();
      expect(within(fielder).getByText("123").className).toContain("text-base");
    });
    expect(screen.getByText("Average position fit 75%")).toBeTruthy();
    expect(screen.getByText("Equipped items included")).toBeTruthy();
    expect(screen.getByText(/Fit % = Σ\(weight × min\(item-adjusted stat ÷ target, 1\)\) ÷ Σ\(weights\) × 100/)).toBeTruthy();
    expect(screen.queryByText("9/9 best bats locked")).toBeNull();
    expect(screen.queryByText(/!/)).toBeNull();
    expect(screen.getAllByText("Player 2").length).toBeGreaterThan(0);

    fireEvent.change(screen.getAllByLabelText("Player assignment for C")[0], { target: { value: "2" } });
    expect(onLockPosition).toHaveBeenCalledWith("C", "2");
  });
});
