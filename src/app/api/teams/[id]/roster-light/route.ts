import { NextRequest, NextResponse } from "next/server";
import { getTeamRosterLight } from "@/lib/player-data";
import { validateId } from "@/lib/validation";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const invalid = validateId(id);
  if (invalid) return invalid;

  try {
    const roster = await getTeamRosterLight(id);
    return NextResponse.json(roster, {
      headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error("Get roster-light error:", error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: "Failed to fetch roster" },
      { status: 500 }
    );
  }
}
