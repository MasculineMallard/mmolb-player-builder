import { NextRequest, NextResponse } from "next/server";
import { triggerRefresh } from "@/lib/percentile-builder";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const limited = checkRateLimit(request.headers.get("x-forwarded-for") ?? "unknown");
  if (limited) return limited;

  const result = triggerRefresh();
  return NextResponse.json(
    { message: result.message },
    { status: result.status }
  );
}
