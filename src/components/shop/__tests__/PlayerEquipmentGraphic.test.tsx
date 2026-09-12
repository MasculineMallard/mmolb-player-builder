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

describe("PlayerEquipmentGraphic responsive layout", () => {
  it("separates the shopping list from the slot grid and uses shared labels", () => {
    render(
      <PlayerEquipmentGraphic
        recommendations={[recommendation]}
        flatMax={13}
        pctMax={6}
        statNeeds={statNeeds}
      />,
    );

    expect(screen.getByTestId("player-equipment-grid").className).toContain("grid-cols-2");
    expect(screen.getByTestId("player-equipment-grid").className).toContain("items-start");
    expect(screen.getByTestId("player-equipment-grid").className).toContain("lg:grid-cols-3");
    expect(screen.getByTestId("shop-summary-row").className).toContain("lg:max-w-[341px]");
    expect(screen.getAllByLabelText("intimidation").every((label) => label.textContent === "Intimintimidation")).toBe(true);
    expect(screen.getByLabelText("awareness").textContent).toBe("Awareawareness");
  });
});
