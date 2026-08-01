import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/server";
import pool from "@/lib/mysql";
import { getSiteId } from "@/lib/site";

const querySchema = z.object({
  timeframe: z.enum(["daily", "monthly", "yearly"]).default("daily"),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  q: z.string().optional(),
  targetSiteId: z.string().optional(),
});

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
      timeframe: searchParams.get("timeframe") || "daily",
      startDate: toIsoOrUndefined(searchParams.get("startDate")),
      endDate: toIsoOrUndefined(searchParams.get("endDate")),
      q: searchParams.get("q") ?? undefined,
      targetSiteId: searchParams.get("targetSiteId") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid query", errors: parsed.error }, { status: 422 });
    }

    const { timeframe, startDate, endDate, q, targetSiteId } = parsed.data;

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
    // We intentionally removed q from here as per user request to not filter chart by q
    // Wait! Actually, the user asked not to filter the *chart*, but what about the new summary table? 
    // They said "เป็นตารางคล้ายๆกับ สรุปยอดเติมเงินแยกตามตัวแทน แต่เราจะทำเป็น รายวัน รายเดือน รายปี สามารถดูได้ด้วย"
    // Usually a timeline summary doesn't filter by name, but if they want it, we could. The plan said we removed it. I'll keep it removed.

    let dateFormat = "'%Y-%m-%d'"; // daily
    if (timeframe === "monthly") {
      dateFormat = "'%Y-%m'";
    } else if (timeframe === "yearly") {
      dateFormat = "'%Y'";
    }

    const query = `
      SELECT 
        DATE_FORMAT(CONVERT_TZ(s.created_at, '+00:00', '+07:00'), ${dateFormat}) AS date_label,
        SUM(s.amount) AS total_amount,
        COUNT(s.id) AS topup_count,
        COUNT(DISTINCT s.user_id) AS unique_users
      FROM slip_history s
      INNER JOIN users u ON s.user_id = u.id
      WHERE ${slipWhere}
      GROUP BY date_label
      ORDER BY date_label ASC
    `;

    const [rows] = await pool.execute(query, slipParams);

    const chartData = (rows as any[]).map((r) => ({
      date: r.date_label,
      amount: Number(r.total_amount) || 0,
      count: Number(r.topup_count) || 0,
      users: Number(r.unique_users) || 0,
    }));

    // Fill missing dates with 0
    let filledData = chartData;
    if (chartData.length > 0 && startDate && endDate) {
      filledData = [];
      const start = new Date(startDate);
      const end = new Date(endDate);
      let current = new Date(start);

      current.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      const dataMap = new Map(chartData.map((d) => [d.date, d]));

      while (current <= end) {
        let label = "";
        if (timeframe === "daily") {
          label = current.toLocaleDateString("en-CA"); // YYYY-MM-DD
          const existing = dataMap.get(label);
          filledData.push(existing || { date: label, amount: 0, count: 0, users: 0 });
          current.setDate(current.getDate() + 1);
        } else if (timeframe === "monthly") {
          const year = current.getFullYear();
          const month = String(current.getMonth() + 1).padStart(2, "0");
          label = `${year}-${month}`;
          if (!filledData.some((d) => d.date === label)) {
            const existing = dataMap.get(label);
            filledData.push(existing || { date: label, amount: 0, count: 0, users: 0 });
          }
          current.setMonth(current.getMonth() + 1);
        } else if (timeframe === "yearly") {
          label = String(current.getFullYear());
          if (!filledData.some((d) => d.date === label)) {
            const existing = dataMap.get(label);
            filledData.push(existing || { date: label, amount: 0, count: 0, users: 0 });
          }
          current.setFullYear(current.getFullYear() + 1);
        }
      }
    }

    return NextResponse.json({ data: filledData.length > 0 ? filledData : chartData });
  } catch (error) {
    console.error("Error in topups chart API:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
