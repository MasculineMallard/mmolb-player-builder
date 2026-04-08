import { NextRequest, NextResponse } from "next/server";
import { searchTeams } from "@/lib/queries";
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
    const limit = clampLimit(request.nextUrl.searchParams.get("limit"), 20);
    const results = await searchTeams(q, limit);
    return NextResponse.json(results, {
      headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error("Team search error:", error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: "Failed to search teams" },
      { status: 500 }
    );
  }
}
