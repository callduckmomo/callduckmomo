import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/server";
import pool from "@/lib/mysql";
import { getSiteId } from "@/lib/site";

const querySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  q: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  targetSiteId: z.string().optional(),
});

type TopupSummaryRow = {
  user_id: string;
  email: string;
  display_name: string | null;
  topup_count: number;
  total_amount: number;
  last_topup_at: string | null;
  site_id: string;
};

type TopupSummaryResponse = {
  rows: TopupSummaryRow[];
  meta: {
    total_users: number;
    grand_total_amount: number;
    grand_total_count: number;
    limit: number;
    offset: number;
  };
  sites?: { id: string; name: string }[];
};

function toIsoOrUndefined(value: string | null | undefined) {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const siteId = getSiteId();

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      startDate: toIsoOrUndefined(searchParams.get("startDate")),
      endDate: toIsoOrUndefined(searchParams.get("endDate")),
      q: searchParams.get("q") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      offset: searchParams.get("offset") ?? undefined,
      targetSiteId: searchParams.get("targetSiteId") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid query" }, { status: 422 });
    }

    const { startDate, endDate, q, limit, offset, targetSiteId } = parsed.data;

    const limitVal = limit ?? 50;
    const offsetVal = offset ?? 0;

    const slipParams: any[] = [];
    let slipWhere = "s.status = 'success'";
    
    if (siteId !== 'main') {
      slipWhere += " AND s.site_id = ?";
      slipParams.push(siteId);
    } else if (targetSiteId && targetSiteId !== 'all') {
      slipWhere += " AND s.site_id = ?";
      slipParams.push(targetSiteId);
    }
    if (startDate) {
      slipWhere += " AND s.created_at >= ?";
      slipParams.push(new Date(startDate));
    }
    if (endDate) {
      slipWhere += " AND s.created_at <= ?";
      slipParams.push(new Date(endDate));
    }
    if (q && q.trim().length > 0) {
      slipWhere += " AND (u.email LIKE ? OR u.display_name LIKE ?)";
      slipParams.push(`%${q.trim()}%`, `%${q.trim()}%`);
    }

    // Grand totals
    const [grandTotals] = await pool.execute(
      `SELECT COALESCE(SUM(s.amount), 0) AS grand_total_amount, COUNT(s.id) AS grand_total_count 
       FROM slip_history s
       INNER JOIN users u ON s.user_id = u.id
       WHERE ${slipWhere}`,
      slipParams
    );
    const gt = (grandTotals as any[])[0];
    const grandTotalAmount = Number(gt.grand_total_amount);
    const grandTotalCount = Number(gt.grand_total_count);

    // Total Users count (for pagination)
    const [totalUsersRows] = await pool.execute(
      `SELECT COUNT(DISTINCT s.user_id) AS total_users
       FROM slip_history s
       INNER JOIN users u ON s.user_id = u.id
       WHERE ${slipWhere}`,
      slipParams
    );
    const totalUsers = Number((totalUsersRows as any[])[0].total_users);

    // Fetch summary rows with pagination
    const summaryQuery = `
      SELECT 
        u.id AS user_id,
        u.email,
        u.display_name,
        u.site_id,
        COUNT(s.id) AS topup_count,
        SUM(s.amount) AS total_amount,
        MAX(s.created_at) AS last_topup_at
      FROM users u
      INNER JOIN slip_history s ON s.user_id = u.id
      WHERE ${slipWhere}
      GROUP BY u.id 
      ORDER BY total_amount DESC
      LIMIT ? OFFSET ?
    `;
    const queryParams = [...slipParams, limitVal, offsetVal];

    const [summaryRows] = await pool.execute(summaryQuery, queryParams);
    const rows = (summaryRows as any[]).map(r => ({
      user_id: r.user_id,
      email: r.email || "unknown@unknown.com",
      display_name: r.display_name ?? null,
      topup_count: Number(r.topup_count),
      total_amount: Number(r.total_amount),
      last_topup_at: r.last_topup_at ? new Date(r.last_topup_at).toISOString() : null,
      site_id: r.site_id,
    }));

    const result: TopupSummaryResponse = {
      rows: rows,
      meta: {
        total_users: totalUsers,
        grand_total_amount: grandTotalAmount,
        grand_total_count: grandTotalCount,
        limit: limitVal,
        offset: offsetVal,
      },
    };

    if (siteId === 'main') {
      const [siteRows] = await pool.execute("SELECT DISTINCT site_id FROM users");
      const siteIds = (siteRows as any[]).map((r) => r.site_id);

      const [settingRows] = await pool.execute("SELECT site_id, value FROM settings WHERE `key` = 'site_name'");
      const siteNamesMap = (settingRows as any[]).reduce((acc, row) => {
        acc[row.site_id] = row.value;
        return acc;
      }, {} as Record<string, string>);

      result.sites = siteIds.map((id) => {
        let name = siteNamesMap[id];
        if (!name) {
          if (id === "main") name = "Appbymari";
          else if (id === "child1") name = "PremiumBySom";
          else if (id === "child2") name = "JaoBam";
          else name = id;
        }
        return { id, name };
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in topups summary API:", error);
    const message =
      error instanceof Error ? error.message : "ไม่สามารถดึงข้อมูลรายงานเติมเงินได้";

    return NextResponse.json({ message }, { status: 500 });
  }
}
