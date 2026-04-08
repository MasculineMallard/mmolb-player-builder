// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Must import AFTER stubbing fetch so the module-level createJsonCache picks it up
let usePitchTypes: typeof import("../use-pitch-types").usePitchTypes;

beforeEach(async () => {
  vi.resetModules();
  mockFetch.mockReset();
  const mod = await import("../use-pitch-types");
  usePitchTypes = mod.usePitchTypes;
});

afterEach(() => {
  vi.restoreAllMocks();
});

function flushMicrotasks() {
  return act(async () => {});
}

describe("usePitchTypes", () => {
  it("does not fetch when disabled", async () => {
    renderHook(() => usePitchTypes(false));
    await flushMicrotasks();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("fetches and returns pitch types when enabled", async () => {
    const mockData = {
      fastball: { name: "Fastball", priority_stats: ["velocity"] },
      curve: { name: "Curveball", priority_stats: ["spin"] },
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const { result } = renderHook(() => usePitchTypes(true));
    await flushMicrotasks();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toBe("/data/pitch_types.json");
    expect(result.current.pitchTypes).toEqual(mockData);
    expect(result.current.pitchTypesError).toBe(false);
  });

  it("sets error state on fetch failure", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const { result } = renderHook(() => usePitchTypes(true));
    await flushMicrotasks();

    expect(result.current.pitchTypesError).toBe(true);
  });

  it("sets error state on invalid (array) response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([1, 2, 3]),
    });

    const { result } = renderHook(() => usePitchTypes(true));
    await flushMicrotasks();

    expect(result.current.pitchTypesError).toBe(true);
  });
});
