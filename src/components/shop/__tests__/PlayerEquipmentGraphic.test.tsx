// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PlayerEquipmentGraphic } from "../PlayerEquipmentGraphic";
import type { SlotRecommendation, StatNeed } from "@/lib/item-advisor";

const recommendation: SlotRecommendation = {
  slot: "head",
  label: "Helmet",
  emoji: "🪖",
  priority: 1,
  offensivePicks: [{ stat: "intimidation", score: 10, reason: "test", category: "archetype" }],
  defensivePicks: [{ stat: "awareness", score: 8, reason: "test", category: "defense" }],
  allOffensive: ["intimidation"],
  allDefensive: ["awareness"],
};

const statNeeds: StatNeed[] = [
  {
    stat: "intimidation",
    currentValue: 20,
    archetypeGap: 80,
    defenseGap: 0,
    archetypeWeight: 1,
    defenseWeight: 0,
    boonMultiplier: 1,
    combinedScore: 80,
    category: "archetype",
    reason: "test",
  },
];

describe("PlayerEquipmentGraphic mobile layout", () => {
  it("gives the shopping list its own row and uses readable compact stat labels", () => {
    render(
      <PlayerEquipmentGraphic
        recommendations={[recommendation]}
        flatMax={13}
        pctMax={6}
        statNeeds={statNeeds}
      />,
    );

    expect(screen.getByTestId("player-equipment-grid").className).toContain("grid-cols-2");
    expect(screen.getByTestId("shop-summary-row").className).toContain("col-span-2");
    expect(screen.getByLabelText("intimidation").textContent).toBe("Intim");
    expect(screen.getByLabelText("awareness").textContent).toBe("Aware");
  });
});
