// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "../page";

describe("POP splash page", () => {
  it("matches the primary navigation order", () => {
    render(<Home />);

    expect(screen.getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual([
      "/preseason",
      "/mulch",
      "/pitcher",
      "/batter",
      "/shop",
      "/pitcher-shop",
    ]);
  });
});
