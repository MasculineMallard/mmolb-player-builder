import { NextResponse } from "next/server";
import { getCachedPercentiles } from "@/lib/percentile-builder";

export async function GET() {
  const data = getCachedPercentiles();
  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-cache" },
  });
}
