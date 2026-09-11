// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
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
  it("renders exactly eight SVG fielder nodes for a full assignment", () => {
    const positions = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"];
    const recommendation: PositionAssignmentRec = {
      fielders: positions.map((position, index) => ({
        player: makePlayer(String(index + 1)),
        assignedPosition: position,
        personalBestPosition: position,
        fitScore: 75,
        isPersonalBest: true,
      })),
      designatedHitter: null,
      bench: [],
      pitchers: [],
      totalFit: 600,
    };

    render(<FieldDiagram recommendation={recommendation} />);
    expect(screen.getAllByTestId("fielder-node")).toHaveLength(8);
  });
});
