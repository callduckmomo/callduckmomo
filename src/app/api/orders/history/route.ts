import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/auth/server";
import { fetchExternalOrderHistory } from "@/lib/products/external";
import { getApiProviderByName } from "@/lib/api-providers/repository";

const querySchema = z.object({
  username: z.string().optional(),
  limit: z
    .string()
    .optional()
    .transform((value) => (value === undefined ? undefined : value.toLowerCase()))
    .refine(
      (value) =>
        value === undefined ||
        value === "all" ||
        (!Number.isNaN(Number(value)) && Number(value) > 0),
      {
        message: "ค่าจำกัดจำนวนต้องเป็นตัวเลขมากกว่า 0 หรือ all",
      }
    ),
});

export async function GET(request: NextRequest) {
  await requireUser();

  const { searchParams } = new URL(request.url);
  const rawParams = {
    username: searchParams.get("username") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  };

  const parsed = querySchema.safeParse(rawParams);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "พารามิเตอร์ไม่ถูกต้อง",
        errors: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const { username, limit } = parsed.data;

  try {
    // Use default API provider (gafiwshop) for now
    // In the future, this could be configurable or based on user's order history
    const provider = await getApiProviderByName("gafiwshop");
    if (!provider || !provider.isActive) {
      return NextResponse.json(
        {
          ok: false,
          message: "API provider ไม่พร้อมใช้งาน",
        },
        { status: 503 }
      );
    }

    const history = await fetchExternalOrderHistory({
      usernameBuy: username,
      limit: limit === "all" ? "all" : limit ? Number(limit) : undefined,
      provider,
    });

    return NextResponse.json({
      ok: true,
      history,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "ไม่สามารถดึงประวัติคำสั่งซื้อได้";

    return NextResponse.json(
      {
        ok: false,
        message,
      },
      { status: 502 }
    );
  }
}


