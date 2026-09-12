// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
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
    const recommendation: PositionAssignmentRec = {
      fielders: positions.map((position, index) => ({
        player: makePlayer(String(index + 1)),
        assignedPosition: position,
        personalBestPosition: position,
        fitScore: 75,
        isPersonalBest: true,
        keyStats: [{ stat: "awareness", value: 123, weight: 0.12 }],
        positionOptions: [],
      })),
      designatedHitter: null,
      bench: [],
      pitchers: [],
      alternatives: [],
      startingBatterIds: positions.map((_, index) => String(index + 1)),
      battingOrderLocked: false,
      totalFit: 600,
    };

    render(<FieldDiagram recommendation={recommendation} />);
    const fielders = screen.getAllByTestId("fielder-node");
    expect(fielders).toHaveLength(8);
    fielders.forEach((fielder) => {
      expect(within(fielder).getByText("Awareness")).toBeTruthy();
      expect(within(fielder).getByText("123")).toBeTruthy();
    });
  });
});
