import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock the queries module
vi.mock("@/lib/queries", () => ({
  searchPlayers: vi.fn(),
  getPlayerFull: vi.fn(),
  searchTeams: vi.fn(),
  getTeamRoster: vi.fn(),
}));

import { searchPlayers, getPlayerFull, searchTeams, getTeamRoster } from "@/lib/queries";
import { GET as playerSearchGET } from "../players/search/route";
import { GET as playerGetGET } from "../players/[id]/route";
import { GET as teamSearchGET } from "../teams/search/route";
import { GET as teamRosterGET } from "../teams/[id]/roster/route";

const mockSearchPlayers = vi.mocked(searchPlayers);
const mockGetPlayerFull = vi.mocked(getPlayerFull);
const mockSearchTeams = vi.mocked(searchTeams);
const mockGetTeamRoster = vi.mocked(getTeamRoster);

function makeRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"));
}

function makeParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------- Player Search ----------
describe("GET /api/players/search", () => {
  it("returns empty array for short query", async () => {
    const res = await playerSearchGET(makeRequest("/api/players/search?q=a"));
    const body = await res.json();
    expect(body).toEqual([]);
    expect(mockSearchPlayers).not.toHaveBeenCalled();
  });

  it("returns empty array for missing query", async () => {
    const res = await playerSearchGET(makeRequest("/api/players/search"));
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it("calls searchPlayers with query and default limit", async () => {
    mockSearchPlayers.mockResolvedValue([
      {
        mmolbPlayerId: "p1",
        firstName: "Test",
        lastName: "Player",
        name: "Test Player",
        level: 5,
        teamName: "Hawks",
        teamEmoji: null,
      },
    ]);

    const res = await playerSearchGET(makeRequest("/api/players/search?q=test"));
    const body = await res.json();
    expect(mockSearchPlayers).toHaveBeenCalledWith("test", 10);
    expect(body).toHaveLength(1);
    expect(body[0].firstName).toBe("Test");
  });

  it("respects custom limit clamped to 1-50", async () => {
    mockSearchPlayers.mockResolvedValue([]);

    await playerSearchGET(makeRequest("/api/players/search?q=test&limit=100"));
    expect(mockSearchPlayers).toHaveBeenCalledWith("test", 50);

    await playerSearchGET(makeRequest("/api/players/search?q=test&limit=0"));
    expect(mockSearchPlayers).toHaveBeenCalledWith("test", 1);
  });

  it("handles NaN limit gracefully", async () => {
    mockSearchPlayers.mockResolvedValue([]);
    await playerSearchGET(makeRequest("/api/players/search?q=test&limit=abc"));
    expect(mockSearchPlayers).toHaveBeenCalledWith("test", 10);
  });

  it("returns 500 on query error", async () => {
    mockSearchPlayers.mockRejectedValue(new Error("DB down"));
    const res = await playerSearchGET(makeRequest("/api/players/search?q=test"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to search players");
  });

  it("sets Cache-Control header", async () => {
    mockSearchPlayers.mockResolvedValue([]);
    const res = await playerSearchGET(makeRequest("/api/players/search?q=test"));
    expect(res.headers.get("Cache-Control")).toContain("max-age=60");
  });
});

// ---------- Player by ID ----------
describe("GET /api/players/[id]", () => {
  it("returns 400 for missing id", async () => {
    const res = await playerGetGET(makeRequest("/api/players/"), makeParams(""));
    expect(res.status).toBe(400);
  });

  it("returns 400 for id over 100 chars", async () => {
    const longId = "a".repeat(101);
    const res = await playerGetGET(makeRequest(`/api/players/${longId}`), makeParams(longId));
    expect(res.status).toBe(400);
  });

  it("returns 400 for id with invalid characters", async () => {
    const res = await playerGetGET(makeRequest("/api/players/foo bar"), makeParams("foo bar"));
    expect(res.status).toBe(400);
  });

  it("returns 404 when player not found", async () => {
    mockGetPlayerFull.mockResolvedValue(null);
    const res = await playerGetGET(makeRequest("/api/players/p1"), makeParams("p1"));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Player not found");
  });

  it("returns player data with Cache-Control", async () => {
    mockGetPlayerFull.mockResolvedValue({
      name: "Test Player",
      firstName: "Test",
      lastName: "Player",
      level: 10,
      teamName: "Hawks",
      teamEmoji: null,
      position: "SP",
      stats: { velocity: 300 },
      lesserBoons: [],
      greaterBoons: [],
      mmolbPlayerId: "p1",
      pitches: [],
    });

    const res = await playerGetGET(makeRequest("/api/players/p1"), makeParams("p1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Test Player");
    expect(res.headers.get("Cache-Control")).toContain("max-age=300");
  });

  it("returns 500 on query error", async () => {
    mockGetPlayerFull.mockRejectedValue(new Error("DB down"));
    const res = await playerGetGET(makeRequest("/api/players/p1"), makeParams("p1"));
    expect(res.status).toBe(500);
  });
});

// ---------- Team Search ----------
describe("GET /api/teams/search", () => {
  it("returns empty array for short query", async () => {
    const res = await teamSearchGET(makeRequest("/api/teams/search?q=a"));
    const body = await res.json();
    expect(body).toEqual([]);
    expect(mockSearchTeams).not.toHaveBeenCalled();
  });

  it("calls searchTeams with query and default limit", async () => {
    mockSearchTeams.mockResolvedValue([
      { mmolbTeamId: "t1", name: "Hawks", emoji: null, location: "Ohio" },
    ]);

    const res = await teamSearchGET(makeRequest("/api/teams/search?q=hawks"));
    const body = await res.json();
    expect(mockSearchTeams).toHaveBeenCalledWith("hawks", 20);
    expect(body).toHaveLength(1);
  });

  it("clamps limit to 1-50", async () => {
    mockSearchTeams.mockResolvedValue([]);
    await teamSearchGET(makeRequest("/api/teams/search?q=hawks&limit=999"));
    expect(mockSearchTeams).toHaveBeenCalledWith("hawks", 50);
  });

  it("returns 500 on query error", async () => {
    mockSearchTeams.mockRejectedValue(new Error("DB down"));
    const res = await teamSearchGET(makeRequest("/api/teams/search?q=hawks"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to search teams");
  });
});

// ---------- Team Roster ----------
describe("GET /api/teams/[id]/roster", () => {
  it("returns 400 for missing id", async () => {
    const res = await teamRosterGET(makeRequest("/api/teams//roster"), makeParams(""));
    expect(res.status).toBe(400);
  });

  it("returns 400 for id over 100 chars", async () => {
    const longId = "a".repeat(101);
    const res = await teamRosterGET(
      makeRequest(`/api/teams/${longId}/roster`),
      makeParams(longId)
    );
    expect(res.status).toBe(400);
  });

  it("returns roster data with Cache-Control", async () => {
    mockGetTeamRoster.mockResolvedValue([
      {
        mmolbPlayerId: "p1",
        firstName: "Test",
        lastName: "Player",
        name: "Test Player",
        level: 8,
        slot: "startingpitcher",
        position: "SP",
        isBench: false,
      },
    ]);

    const res = await teamRosterGET(makeRequest("/api/teams/t1/roster"), makeParams("t1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(res.headers.get("Cache-Control")).toContain("max-age=300");
  });

  it("returns 500 on query error", async () => {
    mockGetTeamRoster.mockRejectedValue(new Error("DB down"));
    const res = await teamRosterGET(makeRequest("/api/teams/t1/roster"), makeParams("t1"));
    expect(res.status).toBe(500);
  });
});
