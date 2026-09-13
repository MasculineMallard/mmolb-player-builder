// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { getModifierLookupMock } = vi.hoisted(() => ({
  getModifierLookupMock: vi.fn(),
}));

vi.mock("@/lib/evaluator-data", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/evaluator-data")>();
  return { ...actual, getModifierLookup: getModifierLookupMock };
});

import { modifierRefreshDelay, useModifierLookup } from "../use-modifier-lookup";

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe("useModifierLookup", () => {
  it("refreshes a long-lived client immediately after the next validity boundary", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-31T23:59:58Z"));
    getModifierLookupMock.mockResolvedValue({
      lookup: new Map(),
      boonList: [],
      sourceStatus: "canonical",
      nextTransition: "2026-04-01T00:00:00.000Z",
    });

    const { unmount } = renderHook(() => useModifierLookup());
    await act(async () => { await Promise.resolve(); });
    expect(getModifierLookupMock).toHaveBeenCalledTimes(1);

    await act(async () => { await vi.advanceTimersByTimeAsync(3_000); });
    expect(getModifierLookupMock).toHaveBeenCalledTimes(2);
    unmount();
  });

  it("uses a bounded retry delay when canonical modifier data is unavailable", () => {
    expect(modifierRefreshDelay(null, "unavailable", Date.parse("2026-01-01T00:00:00Z"))).toBe(300_000);
    expect(modifierRefreshDelay(null, "canonical", Date.parse("2026-01-01T00:00:00Z"))).toBe(21_600_000);
  });
});
