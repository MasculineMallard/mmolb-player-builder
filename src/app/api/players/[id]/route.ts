import { NextRequest, NextResponse } from "next/server";
import { getPlayer } from "@/lib/player-data";
import { NoStatsError } from "@/lib/errors";
import { validateId } from "@/lib/validation";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const invalid = validateId(id);
  if (invalid) return invalid;

  const fresh = request.nextUrl.searchParams.get("fresh") === "1";

  try {
    const player = await getPlayer(id, fresh);
    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }
    return NextResponse.json(player, {
      headers: { "Cache-Control": "no-cache" },
    });
  } catch (error) {
    if (error instanceof NoStatsError) {
      return NextResponse.json({ error: "Player exists but has no stats yet" }, { status: 422 });
    }
    console.error("Get player error:", error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: "Failed to fetch player" },
      { status: 500 }
    );
  }
}
