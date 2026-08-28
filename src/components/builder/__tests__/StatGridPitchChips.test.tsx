// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { StatGridInteractive } from "../StatGridInteractive";

afterEach(cleanup);

describe("StatGridInteractive pitch chips (PR-E)", () => {
  it("renders a pitch chip on a mapped stat and not on unmapped ones", () => {
    render(
      <StatGridInteractive
        stats={{ velocity: 200, control: 150, stuff: 120 }}
        level={20}
        isPitcher={true}
        pitchChips={{ control: ["Slider"] }}
      />,
    );
    expect(screen.getByText("Slider")).toBeTruthy();
    expect(screen.queryByText("Sinker")).toBeNull();
  });

  it("renders no chips when the map is empty", () => {
    render(
      <StatGridInteractive
        stats={{ velocity: 200, control: 150 }}
        level={20}
        isPitcher={true}
        pitchChips={{}}
      />,
    );
    expect(screen.queryByText("Slider")).toBeNull();
  });
});
