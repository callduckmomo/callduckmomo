import { NextRequest, NextResponse } from "next/server";
import {
  fetchPublishedProductsPaginated,
  fetchPublishedProductsPaginatedLive,
  getAllCategories,
  getAllCategoriesCached,
} from "@/lib/products/repository";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "12", 10);
    const category = searchParams.get("category") || undefined;
    const search = searchParams.get("search") || undefined;
    const live = searchParams.get("live") === "1";
    const isLive = live || !!search;

    const offset = Math.max(0, (page - 1) * limit);

    const [{ products, total }, categories] = await Promise.all([
      isLive
        ? fetchPublishedProductsPaginatedLive(limit, offset, category, search)
        : fetchPublishedProductsPaginated(limit, offset, category, search),
      isLive ? getAllCategories(false) : getAllCategoriesCached(false),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return NextResponse.json(
      {
        products,
        total,
        page,
        limit,
        totalPages,
        categories,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("Error in GET /api/products:", error);
    return NextResponse.json(
      { message: "ไม่สามารถดึงข้อมูลสินค้าได้" },
      { status: 500 }
    );
  }
}
