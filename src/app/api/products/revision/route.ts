import { NextResponse } from "next/server";
import { getPublishedProductsRevision } from "@/lib/products/repository";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const revision = await getPublishedProductsRevision();

  return NextResponse.json(
    { revision },
    {
      headers: {
        // This endpoint is intentionally tiny, but must reflect DB changes.
        "Cache-Control": "private, no-store",
      },
    }
  );
}
