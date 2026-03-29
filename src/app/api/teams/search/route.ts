import { NextRequest, NextResponse } from "next/server";
import { searchTeams } from "@/lib/queries";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  if (!q || q.trim().length < 2) {
    return NextResponse.json([]);
  }

  try {
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "20");
    const results = await searchTeams(q, Math.min(limit, 50));
    return NextResponse.json(results);
  } catch (error) {
    console.error("Team search error:", error);
    return NextResponse.json(
      { error: "Failed to search teams" },
      { status: 500 }
    );
  }
}
