// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { GlossaryButton } from "../MulchGlossary";

afterEach(cleanup);

describe("MulchGlossary", () => {
  it("presents the full methodology in a structured accessible dialog", () => {
    render(<GlossaryButton />);
    const trigger = screen.getByRole("button", { name: "How It Works" });
    trigger.focus();
    fireEvent.click(trigger);

    expect(screen.getByRole("dialog", { name: "How Mulch-o-Meter Ratings Work" })).toBeTruthy();
    for (const heading of [
      "Rating Tiers",
      "Composite Score",
      "Weight Distribution",
      "Attribute Tiers",
      "Position Defense",
      "Warning Flags",
      "Safeguards & Data Freshness",
    ]) {
      expect(screen.getByText(heading)).toBeTruthy();
    }
    expect(screen.getByText(/Fit % = Σ\(weight × min\(base stat ÷ target, 1\)\) ÷ Σ\(weights\) × 100/)).toBeTruthy();

    const close = screen.getByRole("button", { name: "Close methodology" });
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(close, { key: "Tab" });
    expect(document.activeElement).toBe(close);
    fireEvent.click(close);
    expect(document.activeElement).toBe(trigger);
  });
});
