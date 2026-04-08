// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";

// Must mock zustand persist before importing the store
vi.mock("zustand/middleware", async () => {
  const actual = await vi.importActual<typeof import("zustand/middleware")>("zustand/middleware");
  return {
    ...actual,
    persist: (config: unknown) => config, // bypass persist (no localStorage in test)
  };
});

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Import after mocks are set up
const { usePlayerStore } = await import("../player-store");

beforeEach(() => {
  mockFetch.mockReset();
  // Reset store state
  act(() => {
    usePlayerStore.setState({
      player: null,
      loading: false,
      error: null,
      archetypeId: null,
      lastTeam: null,
      lastRoster: [],
    });
  });
});

const mockPlayer = {
  name: "Test Player",
  firstName: "Test",
  lastName: "Player",
  level: 10,
  teamName: "Bats",
  teamEmoji: null,
  position: "pitcher",
  stats: { velocity: 200, control: 150 },
  lesserBoons: [],
  greaterBoons: [],
  mmolbPlayerId: "p1",
  pitches: [],
};

describe("player-store", () => {
  it("initializes with null player and no loading/error", () => {
    const state = usePlayerStore.getState();
    expect(state.player).toBeNull();
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.archetypeId).toBeNull();
  });

  it("setPlayer updates player and clears error", () => {
    act(() => {
      usePlayerStore.getState().setError("old error");
      usePlayerStore.getState().setPlayer(mockPlayer);
    });
    const state = usePlayerStore.getState();
    expect(state.player).toEqual(mockPlayer);
    expect(state.error).toBeNull();
  });

  it("setPlayer(null) clears player", () => {
    act(() => {
      usePlayerStore.getState().setPlayer(mockPlayer);
      usePlayerStore.getState().setPlayer(null);
    });
    expect(usePlayerStore.getState().player).toBeNull();
  });

  it("setLoading updates loading state", () => {
    act(() => { usePlayerStore.getState().setLoading(true); });
    expect(usePlayerStore.getState().loading).toBe(true);
    act(() => { usePlayerStore.getState().setLoading(false); });
    expect(usePlayerStore.getState().loading).toBe(false);
  });

  it("setError updates error and clears loading", () => {
    act(() => {
      usePlayerStore.getState().setLoading(true);
      usePlayerStore.getState().setError("something broke");
    });
    const state = usePlayerStore.getState();
    expect(state.error).toBe("something broke");
    expect(state.loading).toBe(false);
  });

  it("setArchetypeId updates archetypeId", () => {
    act(() => { usePlayerStore.getState().setArchetypeId("power_pitcher"); });
    expect(usePlayerStore.getState().archetypeId).toBe("power_pitcher");
    act(() => { usePlayerStore.getState().setArchetypeId(null); });
    expect(usePlayerStore.getState().archetypeId).toBeNull();
  });

  it("setLastTeam stores team and roster", () => {
    const team = { mmolbTeamId: "t1", name: "Bats", emoji: null, location: "Austin" };
    const roster = [
      { mmolbPlayerId: "p1", firstName: "Test", lastName: "Player", name: "Test Player", level: 5, slot: null, position: "pitcher", isBench: false },
    ];
    act(() => { usePlayerStore.getState().setLastTeam(team, roster); });
    const state = usePlayerStore.getState();
    expect(state.lastTeam).toEqual(team);
    expect(state.lastRoster).toEqual(roster);
  });
});

describe("importPlayer", () => {
  it("fetches player and sets state on success", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockPlayer),
    });

    await act(async () => {
      await usePlayerStore.getState().importPlayer("p1");
    });

    const state = usePlayerStore.getState();
    expect(state.player).toEqual(mockPlayer);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
    expect(mockFetch.mock.calls[0][0]).toBe("/api/players/p1");
  });

  it("sets error on 404", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

    await act(async () => {
      await usePlayerStore.getState().importPlayer("missing");
    });

    const state = usePlayerStore.getState();
    expect(state.player).toBeNull();
    expect(state.error).toBe("Player not found");
    expect(state.loading).toBe(false);
  });

  it("sets generic error on 500", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    await act(async () => {
      await usePlayerStore.getState().importPlayer("p1");
    });

    expect(usePlayerStore.getState().error).toBe("Server error (500)");
  });

  it("handles invalid JSON response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.reject(new SyntaxError("Unexpected token")),
    });

    await act(async () => {
      await usePlayerStore.getState().importPlayer("p1");
    });

    expect(usePlayerStore.getState().error).toBe("Invalid response from server");
  });

  it("sets loading to true during fetch", async () => {
    let resolveFetch: (v: unknown) => void;
    mockFetch.mockReturnValueOnce(new Promise((r) => { resolveFetch = r; }));

    const importPromise = act(async () => {
      usePlayerStore.getState().importPlayer("p1");
    });

    // loading should be true while fetch is pending
    expect(usePlayerStore.getState().loading).toBe(true);

    resolveFetch!({ ok: true, json: () => Promise.resolve(mockPlayer) });
    await importPromise;
  });

  it("aborts previous import when a new one starts", async () => {
    let resolveFirst: (v: unknown) => void;
    mockFetch.mockReturnValueOnce(new Promise((r) => { resolveFirst = r; }));
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ ...mockPlayer, name: "Second Player", firstName: "Second" }),
    });

    // Start first import (will be aborted)
    const firstImport = act(async () => {
      usePlayerStore.getState().importPlayer("p1");
    });

    // Start second import (aborts first)
    await act(async () => {
      await usePlayerStore.getState().importPlayer("p2");
    });

    // Resolve the first fetch after abort
    resolveFirst!({ ok: true, json: () => Promise.resolve(mockPlayer) });
    await firstImport;

    // Second player should win
    const state = usePlayerStore.getState();
    expect(state.loading).toBe(false);
    expect(state.player?.firstName).toBe("Second");
  });

  it("clears loading on abort error", async () => {
    const abortError = new DOMException("The operation was aborted", "AbortError");
    mockFetch.mockRejectedValueOnce(abortError);

    await act(async () => {
      await usePlayerStore.getState().importPlayer("p1");
    });

    const state = usePlayerStore.getState();
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it("shows friendly message for 422 NO_STATS", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 422 });

    await act(async () => {
      await usePlayerStore.getState().importPlayer("p1");
    });

    expect(usePlayerStore.getState().error).toBe("Player exists but has no stats yet");
  });
});
