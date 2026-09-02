import { NextRequest, NextResponse } from "next/server";
import {
  fetchPublishedProductsPaginated,
  fetchPublishedProductsPaginatedLive,
  getAllCategories,
  getAllCategoriesCached,
  getPublishedProductsRevision,
} from "@/lib/products/repository";
import { toPublicProduct } from "@/lib/products/public";

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

    const [{ products, total }, categories, revision] = await Promise.all([
      isLive
        ? fetchPublishedProductsPaginatedLive(limit, offset, category, search)
        : fetchPublishedProductsPaginated(limit, offset, category, search),
      isLive ? getAllCategories(false) : getAllCategoriesCached(false),
      getPublishedProductsRevision(),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return NextResponse.json(
      {
        products: products.map(toPublicProduct),
        total,
        page,
        limit,
        totalPages,
        categories,
        revision,
      },
      {
        headers: isLive
          ? { "Cache-Control": "private, no-store" }
          : {
              "Cache-Control":
                "public, s-maxage=15, stale-while-revalidate=60",
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
