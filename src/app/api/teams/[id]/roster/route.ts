import { NextRequest, NextResponse } from "next/server";
import { getTeamRoster } from "@/lib/queries";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const roster = await getTeamRoster(id);
    return NextResponse.json(roster);
  } catch (error) {
    console.error("Get roster error:", error);
    return NextResponse.json(
      { error: "Failed to fetch roster" },
      { status: 500 }
    );
  }
}
