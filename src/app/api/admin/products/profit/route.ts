import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath, revalidateTag } from "next/cache";

import { getCurrentUser } from "@/lib/auth/server";
import { applyGlobalProfit } from "@/lib/products/repository";

const profitSchema = z.object({
  mode: z.enum(["amount", "percent"]),
  value: z.number().nonnegative("มูลค่าต้องไม่ติดลบ"),
});

export async function POST(request: Request) {
  const me = await getCurrentUser();
  if (!me || !me.isAdmin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = profitSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "ข้อมูลไม่ถูกต้อง",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 422 }
    );
  }

  const { mode, value } = parsed.data;

  try {
    const products = await applyGlobalProfit(mode, value);
    revalidatePath("/");
    revalidatePath("/api/products");
    (revalidateTag as any)("products");
    return NextResponse.json({ products, count: products.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ไม่สามารถตั้งกำไรได้";
    return NextResponse.json({ message }, { status: 500 });
  }
}

