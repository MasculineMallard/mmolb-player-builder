// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSearch } from "../use-search";

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

interface MockItem {
  id: string;
  name: string;
}

describe("useSearch", () => {
  it("returns empty results for short queries", () => {
    const { result } = renderHook(() => useSearch<MockItem>("/api/test", "a"));
    expect(result.current.results).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it("fetches results after debounce", async () => {
    const mockResults: MockItem[] = [{ id: "1", name: "Test" }];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResults),
    });

    const { result } = renderHook(() => useSearch<MockItem>("/api/test", "Test"));

    await act(async () => { vi.advanceTimersByTime(350); });
    await flushMicrotasks();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toBe("/api/test?q=Test");
    expect(result.current.results).toEqual(mockResults);
    expect(result.current.loading).toBe(false);
  });

  it("handles non-array response gracefully", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ not: "an array" }),
    });

    const { result } = renderHook(() => useSearch<MockItem>("/api/test", "Bad"));

    await act(async () => { vi.advanceTimersByTime(350); });
    await flushMicrotasks();

    expect(result.current.results).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it("clears results when query becomes too short", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([{ id: "1", name: "Test" }]),
    });

    const { result, rerender } = renderHook(
      ({ q }: { q: string }) => useSearch<MockItem>("/api/test", q),
      { initialProps: { q: "Test" } }
    );

    await act(async () => { vi.advanceTimersByTime(350); });
    await flushMicrotasks();
    expect(result.current.results).toHaveLength(1);

    rerender({ q: "T" });
    await act(async () => { vi.advanceTimersByTime(350); });
    await flushMicrotasks();

    expect(result.current.results).toEqual([]);
  });

  it("handles fetch error gracefully", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const { result } = renderHook(() => useSearch<MockItem>("/api/test", "Err"));

    await act(async () => { vi.advanceTimersByTime(350); });
    await flushMicrotasks();

    expect(result.current.loading).toBe(false);
    expect(result.current.results).toEqual([]);
  });
});
