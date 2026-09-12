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
      expect(within(fielder).getByTestId("fit-stat-label").className).not.toContain("truncate");
      expect(within(fielder).getByText("123").className).toContain("text-[9px]");
      expect(within(fielder).getByTestId("fielder-card-header").textContent).toContain("Player");
      expect(fielder.getAttribute("aria-label")).toContain("best position for this player");
    });
    expect(screen.getAllByTestId("defensive-field")).toHaveLength(1);
    expect(screen.getByTestId("defensive-field").getAttribute("style")).toContain("/images/field-options-ai/field-ai-02.png");
    expect(screen.getByText("Average position fit 75%")).toBeTruthy();
    expect(screen.getByText("Equipped items included")).toBeTruthy();
    expect(screen.getByText(/Fit % = Σ\(weight × min\(item-adjusted stat ÷ target, 1\)\) ÷ Σ\(weights\) × 100/)).toBeTruthy();
    expect(screen.queryByText("9/9 best bats locked")).toBeNull();
    expect(screen.queryByText(/!/)).toBeNull();
    expect(screen.getAllByText("Player 2").length).toBeGreaterThan(0);

    const catcherSelect = screen.getByLabelText("Player assignment for C; current player Player 1");
    const catcherOptions = within(catcherSelect).getAllByRole("option");
    expect(catcherOptions[0].textContent).toBe("Auto · Player 1");
    expect(catcherOptions[1].textContent).toBe("Lock · Player 1");

    fireEvent.change(catcherSelect, { target: { value: "1" } });
    expect(onLockPosition).toHaveBeenCalledWith("C", "1");
    fireEvent.change(catcherSelect, { target: { value: "" } });
    expect(onLockPosition).toHaveBeenCalledWith("C", null);
    fireEvent.change(catcherSelect, { target: { value: "2" } });
    expect(onLockPosition).toHaveBeenCalledWith("C", "2");
    expect(screen.getByText("Next").parentElement?.className).toContain("w-[84%]");
  });
});
