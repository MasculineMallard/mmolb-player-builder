import { NextRequest, NextResponse } from "next/server";
import { searchPlayers } from "@/lib/queries";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  if (!q || q.trim().length < 2) {
    return NextResponse.json([]);
  }

  try {
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "10");
    const results = await searchPlayers(q, Math.min(limit, 50));
    return NextResponse.json(results);
  } catch (error) {
    console.error("Player search error:", error);
    return NextResponse.json(
      { error: "Failed to search players" },
      { status: 500 }
    );
  }
}
