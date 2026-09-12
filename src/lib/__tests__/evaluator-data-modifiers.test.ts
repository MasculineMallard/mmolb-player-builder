import { afterEach, describe, expect, it, vi } from "vitest";
import { loadBoons } from "../evaluator-data";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("dynamic modifier loader", () => {
  it("does not memoize effect responses across calls", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ lesser_boons: [], modifier_effects: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ lesser_boons: [], modifier_effects: [{ name: "New", multipliers: {}, flats: {} }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    expect((await loadBoons()).modifier_effects).toEqual([]);
    expect((await loadBoons()).modifier_effects?.[0]?.name).toBe("New");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenLastCalledWith(expect.stringContaining("/api/modifiers"), expect.objectContaining({ cache: "no-store" }));
  });
});
