// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { BatterBaseStatsNote } from "../BatterBaseStatsNote";

afterEach(cleanup);

describe("BatterBaseStatsNote (PR-F)", () => {
  it("renders the base-values note on the batter path", () => {
    render(<BatterBaseStatsNote isPitcher={false} />);
    expect(screen.getByText(/base values only \(no boons or items\)/i)).toBeTruthy();
    expect(screen.getByText(/see fit and\s+level-up targets/i)).toBeTruthy();
  });

  it("renders nothing on the pitcher path", () => {
    const { container } = render(<BatterBaseStatsNote isPitcher={true} />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByText(/base values only/i)).toBeNull();
  });
});
