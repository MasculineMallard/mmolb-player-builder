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
    const fielders = positions.map((position, index) => ({
      player: makePlayer(String(index + 1)),
      assignedPosition: position,
      personalBestPosition: position,
      fitScore: 75,
      isPersonalBest: true,
      isLocked: false,
      keyStats: [
        { stat: "awareness", value: 123, weight: 0.12 },
        { stat: "reaction", value: 100, weight: 0.1 },
      ],
      positionOptions: [],
    }));
    const recommendation: PositionAssignmentRec = {
      fielders,
      designatedHitter: { ...fielders[0], player: makePlayer("dh") },
      bench: [{ ...fielders[1], player: makePlayer("bench") }],
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
    const renderedFielders = screen.getAllByTestId("fielder-node");
    expect(renderedFielders).toHaveLength(8);
    renderedFielders.forEach((fielder) => {
      expect(within(fielder).getByText("Aware")).toBeTruthy();
      within(fielder).getAllByTestId("fit-stat-label").forEach((label) => {
        expect(label.className).not.toContain("truncate");
        expect(label.className).toContain("text-[12px]");
      });
      expect(within(fielder).getByText("123").className).toContain("text-[14px]");
      expect(within(fielder).getByTestId("fielder-menu-cue").className).toContain("bg-primary/20");
      expect(within(fielder).getByTestId("fielder-card-header").textContent).toContain("Player");
      expect(fielder.getAttribute("aria-label")).toContain("Awareness 123");
      expect(fielder.getAttribute("aria-label")).toContain("best position for this player");
    });
    expect(screen.getAllByTestId("defensive-field")).toHaveLength(1);
    expect(renderedFielders[0].className).toContain("w-[180px]");
    expect(within(renderedFielders[0]).getByTestId("fielder-card-header").className).toContain("grid-cols-[24px_minmax(0,1fr)_auto]");
    expect(screen.getByTestId("defensive-field").getAttribute("style")).toContain("/images/field-options-ai/field-ai-02.png");
    expect(screen.getByTestId("defensive-field").className).toContain("min-w-[700px]");
    expect(screen.getByText("Average position fit 75%")).toBeTruthy();
    expect(screen.getByText("Items + player modifiers included")).toBeTruthy();
    expect(screen.getByText(/Fit % = Σ\(weight × min\(current-effect stat ÷ target, 1\)\) ÷ Σ\(weights\) × 100/)).toBeTruthy();
    expect(screen.queryByText("9/9 best bats locked")).toBeNull();
    expect(screen.queryByText(/!/)).toBeNull();
    expect(screen.getAllByText("Player 2").length).toBeGreaterThan(0);
    expect(screen.getAllByText("React").length).toBeGreaterThan(0);
    const reserveGrid = screen.getByTestId("reserve-bats-grid");
    expect(reserveGrid.className).toContain("lg:grid-cols-5");
    expect(within(reserveGrid).getByTestId("designated-hitter-card").textContent).toContain("Player dh");
    expect(within(reserveGrid).getByText("Player bench")).toBeTruthy();
    expect(within(reserveGrid).getByTestId("dh-menu-cue")).toBeTruthy();

    const catcherSelect = screen.getByLabelText("Player assignment for C; current player Player 1");
    const catcherOptions = within(catcherSelect).getAllByRole("option");
    expect(catcherOptions[0].textContent).toBe("Auto · Player 1");
    expect(catcherOptions[1].textContent).toBe("Lock · Player 1 · Field");
    expect(catcherOptions.some((option) => option.textContent === "Lock · Player dh · DH")).toBe(true);
    expect(catcherOptions.some((option) => option.textContent === "Lock · Player bench · Bench")).toBe(true);

    fireEvent.change(catcherSelect, { target: { value: "1" } });
    expect(onLockPosition).toHaveBeenCalledWith("C", "1");
    fireEvent.change(catcherSelect, { target: { value: "" } });
    expect(onLockPosition).toHaveBeenCalledWith("C", null);
    fireEvent.change(catcherSelect, { target: { value: "2" } });
    expect(onLockPosition).toHaveBeenCalledWith("C", "2");
    fireEvent.change(catcherSelect, { target: { value: "dh" } });
    expect(onLockPosition).toHaveBeenCalledWith("C", "dh");
    fireEvent.change(catcherSelect, { target: { value: "bench" } });
    expect(onLockPosition).toHaveBeenCalledWith("C", "bench");
    const dhSelect = screen.getByLabelText("Player assignment for DH; current player Player dh");
    expect(within(dhSelect).getAllByRole("option").some((option) => option.textContent === "Lock · Player bench · Bench")).toBe(true);
    fireEvent.change(dhSelect, { target: { value: "bench" } });
    expect(onLockPosition).toHaveBeenCalledWith("DH", "bench");
    fireEvent.change(dhSelect, { target: { value: "" } });
    expect(onLockPosition).toHaveBeenCalledWith("DH", null);
    expect(screen.getByText("Next").parentElement?.className).toContain("w-[84%]");
  });
});
