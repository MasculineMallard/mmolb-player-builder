// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatBarPanel } from "../StatBarPanel";
import type { SlotRecommendation } from "@/lib/item-advisor";
import type { Archetype } from "@/lib/types";

const recommendation: SlotRecommendation = {
  slot: "head",
  label: "Helmet",
  emoji: "helmet",
  priority: 1,
  offensivePicks: [{ stat: "velocity", score: 10, reason: "test", category: "archetype" }],
  defensivePicks: [],
  allOffensive: ["velocity"],
  allDefensive: [],
};

const archetype: Archetype = {
  name: "Test Pitcher",
  description: "Test",
  priority_stats: ["velocity", "control", "stuff"],
  secondary_stats: ["accuracy", "presence", "stamina"],
  stat_weights: {},
};

describe("StatBarPanel responsive layout", () => {
  it("keeps the projection bounded and presents stats as one vertical sequence", () => {
    render(
      <StatBarPanel
        recommendations={[recommendation]}
        effectBaseStats={{}}
        playerStats={{}}
        boonMultipliers={{}}
        flatMax={13}
        pctMax={6}
        archetype={archetype}
        playerType="pitcher"
      />,
    );

    const rows = screen.getByTestId("projected-build-primary-rows");
    expect(screen.getByTestId("projected-build-panel").className).toContain("max-w-[680px]");
    expect(rows.className).toContain("space-y-0.5");
    expect(rows.className).not.toContain("grid-cols");
    expect(screen.getByTestId("projected-column-headings").textContent).toBe("NowGoalFlatPct");
    expect(screen.getByTestId("projected-column-headings").className).toContain("grid-cols-4");
    expect(screen.getByTestId("projected-column-headings").className).toContain("text-left");
    expect(screen.getAllByTestId("projected-values").every((values) => values.className.includes("grid-cols-4"))).toBe(true);
    expect(screen.getAllByTestId("projected-values").every((values) => values.className.includes("text-left"))).toBe(true);
  });
});
