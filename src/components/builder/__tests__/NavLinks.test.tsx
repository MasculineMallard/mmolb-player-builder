// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NavLinks } from "../NavLinks";

vi.mock("next/navigation", () => ({
  usePathname: () => "/preseason",
}));

afterEach(cleanup);

const EXPECTED_ORDER = [
  "Perfunctory Preseason Plotter",
  "Mulch-o-Meter",
  "Perfect Pitcher Planner",
  "Better Batter Builder",
  "Super Slugger Sartoria",
  "Heroic Hurler Haberdashery",
];

describe("NavLinks", () => {
  it("keeps Plotter and Mulch first in both navigation surfaces", () => {
    render(<NavLinks />);

    expect(screen.getAllByRole("link").map((link) => link.textContent)).toEqual(EXPECTED_ORDER);

    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    const allLabels = screen.getAllByRole("link").map((link) => link.textContent);
    expect(allLabels.slice(0, 6)).toEqual(EXPECTED_ORDER);
    expect(allLabels.slice(6)).toEqual(EXPECTED_ORDER);
  });
});
