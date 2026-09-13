// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { STAT_CATEGORIES } from "@/lib/constants";
import { ResponsiveStatLabel, STAT_SHORT_LABELS } from "../ResponsiveStatLabel";

describe("ResponsiveStatLabel", () => {
  it("defines one mobile abbreviation for every displayed stat", () => {
    const displayedStats = Object.values(STAT_CATEGORIES).flat().sort();
    expect(Object.keys(STAT_SHORT_LABELS).sort()).toEqual(displayedStats);
  });

  it("renders the short mobile and full desktop forms together", () => {
    render(<ResponsiveStatLabel stat="intimidation" />);

    const label = screen.getByLabelText("intimidation");
    expect(label.textContent).toBe("Intimintimidation");
    expect(label.firstElementChild?.className).toContain("sm:hidden");
    expect(label.lastElementChild?.className).toContain("sm:inline");
  });
});
