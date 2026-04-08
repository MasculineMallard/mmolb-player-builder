import { NextRequest, NextResponse } from "next/server";
import { searchPlayers } from "@/lib/queries";
import { clampLimit } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const limited = checkRateLimit(request.headers.get("x-forwarded-for") ?? "unknown");
  if (limited) return limited;

  const q = request.nextUrl.searchParams.get("q");
  if (!q || q.trim().length < 2 || q.length > 200) {
    return NextResponse.json([]);
  }

  try {
    const limit = clampLimit(request.nextUrl.searchParams.get("limit"), 10);
    const results = await searchPlayers(q, limit);
    return NextResponse.json(results, {
      headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=30" },
    });
  } catch (error) {
    console.error("Player search error:", error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: "Failed to search players" },
      { status: 500 }
    );
  }
}
