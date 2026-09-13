// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { PreseasonPlayerData } from "@/lib/preseason-data";
import { recommendBattingOrder } from "@/lib/preseason-recommend";
import { BattingLineupCard } from "../BattingLineupCard";
import { PitchingStaffCard } from "../PitchingStaffCard";
import { PreseasonGlossaryButton } from "../PreseasonGlossary";

afterEach(cleanup);

function makePlayer(id: string, position: "C" | "SP", index = 0): PreseasonPlayerData {
  const pitcher = position === "SP";
  const PA = pitcher ? 0 : 30;
  const outs = pitcher ? (id === "tiny" ? 0 : 30) : 0;
  return {
    name: id,
    firstName: id,
    lastName: "Player",
    level: 20,
    teamName: "Test",
    teamEmoji: null,
    position,
    durability: 5,
    stats: pitcher ? { velocity: 200 - index } : { contact: 200 - index },
    lesserBoons: [],
    greaterBoons: [],
    mmolbPlayerId: id,
    pitches: [],
    isBench: false,
    preseasonBatting: pitcher ? null : {
      PA,
      AB: PA,
      H: 0,
      singles: 0,
      doubles: 0,
      triples: 0,
      homeRuns: 0,
      walks: 0,
      hitByPitch: 0,
      sacrificeFlies: 0,
      strikeouts: index + 1,
      totalBases: 0,
      OBP: 0.5 - (index * 0.02),
      SLG: 0.3 + (index * 0.05),
      OPS: 0.8 + (index * 0.03),
      SO_PCT: (index + 1) / PA,
    },
    preseasonPitching: pitcher ? {
      outs,
      IP: outs / 3,
      earnedRuns: index,
      hitsAllowed: index + 1,
      walks: index,
      strikeouts: 10 - index,
      homeRunsAllowed: index,
      ERA: outs ? index : null,
      WHIP: outs ? 1 + (index * 0.1) : null,
      K9: outs ? 10 - index : null,
      HR9: outs ? index * 0.9 : null,
    } : null,
    sampleSize: { PA, outs },
    dataWarnings: [],
  };
}

describe("preseason controls", () => {
  it("renders three relief pitchers and lets a below-floor arm be forced to SP", () => {
    const pitchers = [
      ...Array.from({ length: 9 }, (_, index) => makePlayer(`p${index + 1}`, "SP", index)),
      makePlayer("tiny", "SP", 10),
    ];
    pitchers[0].preseasonPitching!.outs = 31;
    pitchers[0].preseasonPitching!.IP = 31 / 3;
    pitchers[0].sampleSize.outs = 31;
    render(<PitchingStaffCard pitchers={pitchers} />);

    expect(screen.getAllByText("RP")).toHaveLength(3);
    expect(screen.getByText("Choose your closer")).toBeTruthy();
    expect(screen.getByTestId("relief-grid").firstElementChild).toBe(screen.getByTestId("closer-selector"));
    expect(screen.getByTestId("closer-selector").className).toContain("border-primary");
    expect(screen.getByTestId("pitcher-tile-p1").textContent).toMatch(/\d+\.\d score/);
    expect(screen.getByTestId("pitcher-tile-p1").textContent).toMatch(/\d+\.\d score · 10\.1 IP/);
    expect(screen.getAllByText("HR/9").length).toBeGreaterThan(0);
    const closerId = (screen.getByLabelText("Closer rank") as HTMLSelectElement).selectedOptions[0].textContent?.match(/—\s(.+)$/)?.[1];
    const closer = screen.getByTestId(`pitcher-tile-${closerId}`);
    expect(within(closer).queryByRole("button", { name: "Force as SP" })).toBeNull();
    const tiny = screen.getByTestId("pitcher-tile-tiny");
    fireEvent.click(within(tiny).getByRole("button", { name: "Force as SP" }));
    const forcedTiny = screen.getByTestId("pitcher-tile-tiny");
    expect(within(forcedTiny).getByText("SP")).toBeTruthy();
    expect(within(forcedTiny).getByRole("button", { pressed: true })).toBeTruthy();
    expect(screen.getAllByText("RP")).toHaveLength(3);
  });

  it("keeps the default order and supports a lowest-SO% view", () => {
    const batters = Array.from({ length: 9 }, (_, index) => makePlayer(`b${index + 1}`, "C", index));
    render(<BattingLineupCard recommendation={recommendBattingOrder(batters)} />);

    const defaultRows = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(defaultRows[0].textContent).toContain("SO%");
    expect(defaultRows[0].textContent).toContain("3.3%");

    fireEvent.change(screen.getByLabelText("Batting order sort"), { target: { value: "SO%" } });
    const rows = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(rows[0].textContent).toContain("b1");
    expect(rows[0].textContent).toContain("SO%");
    expect(rows[0].textContent).toContain("3.3%");
    expect(rows[8].textContent).toContain("b9");
    expect(screen.getByText(/defensive tab keeps the default recommended starting nine/i)).toBeTruthy();
  });

  it("caps OPS bars at 1.000 and applies metric-specific yellow-glow thresholds", () => {
    const batters = Array.from({ length: 9 }, (_, index) => makePlayer(`b${index + 1}`, "C", index));
    batters[3].preseasonBatting!.OBP = 0.45;
    batters[6].preseasonBatting!.OPS = 1;
    render(<BattingLineupCard recommendation={recommendBattingOrder(batters)} />);
    const sort = screen.getByLabelText("Batting order sort");

    fireEvent.change(sort, { target: { value: "OPS" } });
    expect(screen.getByTestId("batting-bar-b9").getAttribute("style")).toContain("width: 100%");
    expect(screen.getByTestId("batting-row-b9").getAttribute("data-glowing")).toBe("true");
    expect(screen.getByTestId("batting-row-b9").className).toContain("batting-yellow-glow");
    expect(screen.getByTestId("batting-bar-b9").className).toContain("batting-yellow-glow-bar");
    expect(screen.getByTestId("batting-row-b9").textContent).toContain("1.040");
    expect(screen.getByTestId("batting-bar-b7").getAttribute("style")).toContain("width: 100%");
    expect(screen.getByTestId("batting-row-b7").getAttribute("data-glowing")).toBe("false");

    fireEvent.change(sort, { target: { value: "OBP" } });
    expect(screen.getByTestId("batting-row-b4").getAttribute("data-glowing")).toBe("true");
    expect(screen.getByTestId("batting-row-b5").getAttribute("data-glowing")).toBe("false");

    fireEvent.change(sort, { target: { value: "SLG" } });
    expect(screen.getByTestId("batting-row-b9").getAttribute("data-glowing")).toBe("true");

    fireEvent.change(sort, { target: { value: "SO%" } });
    expect(screen.getByTestId("batting-row-b3").getAttribute("data-glowing")).toBe("true");
    expect(screen.getByTestId("batting-row-b4").getAttribute("data-glowing")).toBe("false");
  });

  it("opens the full methodology dialog", () => {
    render(<PreseasonGlossaryButton />);
    const trigger = screen.getByRole("button", { name: "How It Works" });
    trigger.focus();
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog", { name: "How the Plotter Works" })).toBeTruthy();
    expect(screen.getByText("Position Fit")).toBeTruthy();
    expect(screen.getByText("Rate Formulas")).toBeTruthy();
    expect(screen.getByText(/Σ\(weight × min\(item-adjusted stat ÷ target, 1\)\) ÷ Σ\(weights\) × 100/)).toBeTruthy();
    expect(screen.getByText(/Score = \(WHIP rank × 0.50\) \+ \(ERA rank × 0.25\) \+ \(K\/9 rank × 0.25\)/)).toBeTruthy();
    expect(screen.getByText(/OPS > 1.000, OBP ≥ .450, SLG ≥ .700, or SO% ≤ 10.0%/)).toBeTruthy();
    expect(screen.getByText("HR/9").parentElement?.textContent).toContain("display only");
    const close = screen.getByRole("button", { name: "Close methodology" });
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(close, { key: "Tab" });
    expect(document.activeElement).toBe(close);
    fireEvent.click(close);
    expect(document.activeElement).toBe(trigger);
  });
});
