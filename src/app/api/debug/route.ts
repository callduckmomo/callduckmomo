import { NextResponse } from "next/server";
import { getSiteId } from "@/lib/site";
import pool from "@/lib/mysql";

export async function GET() {
  const siteId = getSiteId();
  let dbStatus = "unknown";
  let userCount = 0;
  try {
    const [rows] = await pool.execute("SELECT COUNT(*) as count FROM users WHERE site_id = ?", [siteId]);
    userCount = (rows as any[])[0].count;
    dbStatus = "connected";
  } catch (e: any) {
    dbStatus = `error: ${e.message}`;
  }
  return NextResponse.json({
    siteId,
    dbStatus,
    userCount,
    env: {
      NEXT_PUBLIC_SITE_ID: process.env.NEXT_PUBLIC_SITE_ID,
      DB_HOST: process.env.DB_HOST,
      DB_NAME: process.env.DB_NAME,
    }
  });
}
