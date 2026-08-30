// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ArsenalArchetypes } from "../ArsenalArchetypes";

const archetypesData = JSON.parse(
  readFileSync(join(process.cwd(), "public/data/archetypes/pitcher_archetypes.json"), "utf-8"),
);

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => archetypesData })));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("ArsenalArchetypes (PR-D)", () => {
  it("renders the arsenal-first rationale + picks, and a click drives onSelect(key, arch)", async () => {
    const onSelect = vi.fn();
    render(
      <ArsenalArchetypes
        playerStats={{ velocity: 300, control: 250, presence: 240 }}
        playerPitches={["sl", "fs", "ch"]}
        pitchTypes={{}}
        level={30}
        selectedKey={null}
        onSelect={onSelect}
      />,
    );
    await waitFor(() => expect(screen.getByText(/rank by arsenal first/i)).toBeTruthy());
    const buttons = await screen.findAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
    // each pick shows both a pitch% and a stat% (review #11)
    expect(screen.getAllByText(/% stat/).length).toBeGreaterThan(0);

    fireEvent.click(buttons[0]);
    expect(onSelect).toHaveBeenCalledTimes(1);
    const [key, arch] = onSelect.mock.calls[0];
    expect(typeof key).toBe("string");
    expect(arch).toHaveProperty("name");
  });

  it("renders nothing when the player has no pitches", async () => {
    const { container } = render(
      <ArsenalArchetypes
        playerStats={{ velocity: 300 }}
        playerPitches={[]}
        pitchTypes={{}}
        level={30}
        selectedKey={null}
        onSelect={vi.fn()}
      />,
    );
    // no arsenal -> nothing to rank
    await waitFor(() => expect(container.querySelector("button")).toBeNull());
  });
});
