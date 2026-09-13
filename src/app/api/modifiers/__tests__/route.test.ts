import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "../route";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("GET /api/modifiers", () => {
  it("uses the validated canonical source for current effects", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      Cowardly: [{
        valid_from: "2025-11-25T08:00:00Z",
        valid_until: null,
        effects: { Contact: -0.5 },
        bonus_type: "Multiplier",
      }],
    }), { status: 200 })));

    const response = await GET();
    const body = await response.json();
    const cowardly = body.greater_boons.find((boon: { name: string }) => boon.name === "Cowardly");
    expect(cowardly.penalties).toEqual({ Contact: 50 });
    expect(body.modifier_source.status).toBe("canonical");
    expect(response.headers.get("X-Modifier-Source")).toBe("anodoze/mmolb-modifiers");
    expect(response.headers.get("X-Modifier-Repository")).toContain("anodoze/mmolb-modifiers");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ cache: "no-store" }));
  });

  it("falls back safely when the upstream schema is invalid", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 200 })));
    const response = await GET();
    const body = await response.json();
    expect(body.lesser_boons.length).toBeGreaterThan(100);
    expect(body.modifier_effects).toEqual([]);
    expect(body.modifier_source.status).toBe("unavailable");
    expect(response.headers.get("X-Modifier-Source")).toBe("local-fallback");
  });

  it("selects the new effect at an exact validity boundary without response caching", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-01T00:00:00Z"));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      Windowed: [
        {
          valid_from: "2026-01-01T00:00:00Z",
          valid_until: "2026-04-01T00:00:00Z",
          effects: { Accuracy: 0.5 },
          bonus_type: "Multiplier",
        },
        {
          valid_from: "2026-04-01T00:00:00Z",
          valid_until: null,
          effects: { Control: 0.25 },
          bonus_type: "Multiplier",
        },
      ],
    }), { status: 200 })));

    const response = await GET();
    const body = await response.json();
    expect(body.modifier_effects).toEqual([{ name: "Windowed", multipliers: { Control: 25 }, flats: {} }]);
    expect(body.modifier_source.next_transition).toBeNull();
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("rejects a declared oversized upstream payload", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", {
      status: 200,
      headers: { "content-length": String(300 * 1024) },
    })));
    const response = await GET();
    expect(response.headers.get("X-Modifier-Source")).toBe("local-fallback");
  });
});
