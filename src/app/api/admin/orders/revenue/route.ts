import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { getRevenueStatistics } from "@/lib/orders/repository";
import pool from "@/lib/mysql";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const apiProviderId = searchParams.get("apiProviderId") || undefined;
    const isLocalParam = searchParams.get("isLocal");
    const isLocal = isLocalParam === "true" ? true : isLocalParam === "false" ? false : null;
    const targetSiteId = searchParams.get("targetSiteId") || undefined;

    const stats = await getRevenueStatistics(startDate, endDate, apiProviderId || null, targetSiteId || null, isLocal);

    // ดึงรายชื่อเว็บที่มีทั้งหมดจากฐานข้อมูลอย่างไดนามิก
    const [siteRows] = await pool.execute("SELECT DISTINCT site_id FROM users");
    const siteIds = (siteRows as any[]).map((r) => r.site_id);

    const [settingRows] = await pool.execute("SELECT site_id, value FROM settings WHERE `key` = 'site_name'");
    const siteNamesMap = (settingRows as any[]).reduce((acc, row) => {
      acc[row.site_id] = row.value;
      return acc;
    }, {} as Record<string, string>);

    const sites = siteIds.map((id) => {
      let name = siteNamesMap[id];
      if (!name) {
        if (id === "main") name = "Appbymari";
        else if (id === "child1") name = "PremiumBySom";
        else if (id === "child2") name = "JaoBam";
        else name = id;
      }
      return { id, name };
    });

    return NextResponse.json({ stats, sites });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "ไม่สามารถดึงข้อมูลสรุปยอดได้";

    return NextResponse.json({ message }, { status: 500 });
  }
}

