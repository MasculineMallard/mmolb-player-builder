import { NextResponse } from "next/server";

const ID_PATTERN = /^[\w-]+$/;

export function validateId(id: string): NextResponse | null {
  if (!id || id.length > 100 || !ID_PATTERN.test(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }
  return null;
}

export function clampLimit(raw: string | null, defaultVal: number): number {
  const parsed = parseInt(raw || String(defaultVal));
  return Math.min(Math.max(Number.isNaN(parsed) ? defaultVal : parsed, 1), 50);
}
