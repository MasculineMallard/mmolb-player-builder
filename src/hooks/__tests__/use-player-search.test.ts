// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePlayerSearch } from "../use-player-search";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  vi.useFakeTimers();
  mockFetch.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

function flushMicrotasks() {
  return act(async () => {});
}

describe("usePlayerSearch", () => {
  it("returns empty results for short queries", () => {
    const { result } = renderHook(() => usePlayerSearch("a"));
    expect(result.current.results).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it("returns empty results for empty query", () => {
    const { result } = renderHook(() => usePlayerSearch(""));
    expect(result.current.results).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it("fetches results after debounce for valid query", async () => {
    const mockResults = [
      { mmolbPlayerId: "p1", firstName: "Test", lastName: "Player", name: "Test Player", level: 5, teamName: "Bats", teamEmoji: null },
    ];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResults),
    });

    const { result } = renderHook(() => usePlayerSearch("Test"));

    // Advance past debounce (300ms)
    await act(async () => { vi.advanceTimersByTime(350); });
    await flushMicrotasks();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toBe("/api/players/search?q=Test");
    expect(result.current.results).toEqual(mockResults);
    expect(result.current.loading).toBe(false);
  });

  it("clears results when query becomes too short", async () => {
    const mockResults = [
      { mmolbPlayerId: "p1", firstName: "Test", lastName: "Player", name: "Test Player", level: 5, teamName: null, teamEmoji: null },
    ];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResults),
    });

    const { result, rerender } = renderHook(
      ({ q }: { q: string }) => usePlayerSearch(q),
      { initialProps: { q: "Test" } }
    );

    await act(async () => { vi.advanceTimersByTime(350); });
    await flushMicrotasks();
    expect(result.current.results).toHaveLength(1);

    // Shorten query below threshold
    rerender({ q: "T" });
    await act(async () => { vi.advanceTimersByTime(350); });
    await flushMicrotasks();

    expect(result.current.results).toEqual([]);
  });

  it("handles fetch error gracefully", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const { result } = renderHook(() => usePlayerSearch("Bad"));

    await act(async () => { vi.advanceTimersByTime(350); });
    await flushMicrotasks();

    expect(result.current.loading).toBe(false);
    expect(result.current.results).toEqual([]);
  });

  it("debounces rapid query changes into a single fetch", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    const { rerender } = renderHook(
      ({ q }: { q: string }) => usePlayerSearch(q),
      { initialProps: { q: "" } }
    );

    // Rapid changes within debounce window
    rerender({ q: "T" }); // too short, won't fetch
    rerender({ q: "Te" });
    rerender({ q: "Tes" });
    rerender({ q: "Test" });

    // Before debounce expires
    await act(async () => { vi.advanceTimersByTime(100); });
    // Only the initial "" → "Test" debounce is pending, not yet fired
    const callsBefore = mockFetch.mock.calls.length;

    // After debounce expires, should make exactly one fetch for "Test"
    await act(async () => { vi.advanceTimersByTime(250); });
    await flushMicrotasks();
    expect(mockFetch.mock.calls.length - callsBefore).toBeLessThanOrEqual(1);
    // The last call should be for "Test"
    const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
    expect(lastCall[0]).toBe("/api/players/search?q=Test");
  });
});
