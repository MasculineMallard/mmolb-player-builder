import { NextResponse } from "next/server";
import { triggerRefresh } from "@/lib/percentile-builder";

export async function POST() {
  const result = triggerRefresh();
  return NextResponse.json(
    { message: result.message },
    { status: result.status }
  );
}
