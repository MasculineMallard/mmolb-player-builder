import { NextRequest, NextResponse } from "next/server";
import { fetchPlayer, fetchPlayerRecord, fetchState } from "@/lib/mmolb-api";
import { getTeamRoster } from "@/lib/player-data";
import { buildPreseasonPlayerData, type PreseasonPlayerData } from "@/lib/preseason-data";
import { validateId } from "@/lib/validation";

const FETCH_CONCURRENCY = 8;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const invalid = validateId(id);
  if (invalid) return invalid;

  try {
    const [roster, state] = await Promise.all([getTeamRoster(id), fetchState()]);
    const players: PreseasonPlayerData[] = [];

    for (let index = 0; index < roster.length; index += FETCH_CONCURRENCY) {
      const chunk = roster.slice(index, index + FETCH_CONCURRENCY);
      const loaded = await Promise.all(chunk.map(async (rosterPlayer) => {
        const [playerResult, recordResult] = await Promise.allSettled([
          fetchPlayer(rosterPlayer.mmolbPlayerId),
          fetchPlayerRecord(rosterPlayer.mmolbPlayerId),
        ]);
        const warnings: string[] = [];

        if (playerResult.status === "rejected") warnings.push("attributes unavailable");
        if (recordResult.status === "rejected") warnings.push("Offseason record unavailable");

        return buildPreseasonPlayerData(
          rosterPlayer,
          playerResult.status === "fulfilled" ? playerResult.value : null,
          recordResult.status === "fulfilled" ? recordResult.value.records : null,
          state.SeasonID,
          id,
          warnings,
        );
      }));
      players.push(...loaded);
    }

    return NextResponse.json(players, {
      headers: {
        "Cache-Control": "no-cache",
        "X-MMOLB-Season-Status": state.SeasonStatus,
      },
    });
  } catch (error) {
    console.error("Get preseason roster error:", error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: "Failed to fetch preseason roster" },
      { status: 500 },
    );
  }
}
