import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/mmolb-api", () => ({
  fetchPlayer: vi.fn(),
  fetchPlayerRecord: vi.fn(),
  fetchState: vi.fn(),
}));
vi.mock("@/lib/player-data", () => ({
  getTeamRoster: vi.fn(),
}));

import { fetchPlayer, fetchPlayerRecord, fetchState } from "@/lib/mmolb-api";
import { getTeamRoster } from "@/lib/player-data";
import { GET } from "@/app/api/teams/[id]/preseason/route";

const mockFetchPlayer = vi.mocked(fetchPlayer);
const mockFetchPlayerRecord = vi.mocked(fetchPlayerRecord);
const mockFetchState = vi.mocked(fetchState);
const mockGetTeamRoster = vi.mocked(getTeamRoster);

beforeEach(() => {
  vi.clearAllMocks();
  mockFetchState.mockResolvedValue({ SeasonID: "season-16", Day: 313, SeasonStatus: "Offseason" });
  mockGetTeamRoster.mockResolvedValue([{
    mmolbPlayerId: "player-1",
    firstName: "Test",
    lastName: "Batter",
    name: "Test Batter",
    level: 20,
    slot: "C",
    position: "C",
    isBench: false,
  }]);
});

describe("GET /api/teams/[id]/preseason", () => {
  it("keeps a flagged roster row when attributes fail instead of silently thinning", async () => {
    mockFetchPlayer.mockRejectedValue(new Error("player endpoint down"));
    mockFetchPlayerRecord.mockResolvedValue({ records: [{
      FirstName: "Test",
      LastName: "Batter",
      PlayerID: "player-1",
      Season: 16,
      SeasonID: "season-16",
      SeasonStatus: "Offseason",
      Stats: { "team-1": { plate_appearances: 12, at_bats: 10, singles: 3, walked: 2 } },
      _id: "record-1",
    }] });

    const response = await GET(
      new NextRequest("http://localhost/pop/api/teams/team-1/preseason"),
      { params: Promise.resolve({ id: "team-1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("X-MMOLB-Season-Status")).toBe("Offseason");
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({
      mmolbPlayerId: "player-1",
      stats: {},
      sampleSize: { PA: 12, outs: 0 },
      dataWarnings: ["attributes unavailable"],
    });
  });
});
