import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/auth/server";
import { listGiftOptionsByBaseProduct } from "@/lib/gifts/repository";
import { findProductByTypeId } from "@/lib/products/repository";

const querySchema = z.object({
  typeId: z.string().min(1),
});

export async function GET(request: NextRequest) {
  await requireUser();

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    typeId: searchParams.get("typeId") ?? "",
  });

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid query" }, { status: 422 });
  }

  const options = await listGiftOptionsByBaseProduct(parsed.data.typeId);
  if (options.length === 0) {
    return NextResponse.json({ gifts: [] });
  }

  // Enrich with product meta for UI
  const gifts = await Promise.all(
    options.map(async (opt) => {
      const p = await findProductByTypeId(opt.giftProductTypeId);
      return {
        giftTypeId: opt.giftProductTypeId,
        name: p?.name ?? opt.giftProductTypeId,
        stock: p?.stock ?? null,
        imageUrl: p?.imageUrl ?? null,
      };
    })
  );

  // Filter out missing products
  return NextResponse.json({
    gifts: gifts.filter((g) => Boolean(g.name)),
  });
}


