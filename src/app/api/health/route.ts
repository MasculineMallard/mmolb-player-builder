import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    const client = await pool.connect();
    try {
      await client.query("SELECT 1");
    } finally {
      client.release();
    }
    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("Health check failed:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ status: "error", db: "unreachable" }, { status: 503 });
  }
}
