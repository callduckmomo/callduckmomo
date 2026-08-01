import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath, revalidateTag } from "next/cache";
import { fetchExternalProducts } from "@/lib/products/external";
import { upsertProductsFromExternal } from "@/lib/products/repository";
import { requireSuperAdmin } from "@/lib/auth/server";
import { getApiProviderById } from "@/lib/api-providers/repository";

const bodySchema = z.object({
  apiProviderId: z.string().min(1, "กรุณาระบุ API Provider"),
});

export async function POST(request: NextRequest) {
  try {
    await requireSuperAdmin();

    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        { message: "รูปแบบข้อมูลไม่ถูกต้อง" },
        { status: 415 }
      );
    }

    const rawBody = await request.json();
    const parsed = bodySchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "ข้อมูลไม่ถูกต้อง",
          errors: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const provider = await getApiProviderById(parsed.data.apiProviderId);
    if (!provider) {
      return NextResponse.json(
        { success: false, message: "ไม่พบ API Provider" },
        { status: 404 }
      );
    }

    if (!provider.isActive) {
      return NextResponse.json(
        { success: false, message: "API Provider นี้ไม่สามารถใช้งานได้" },
        { status: 400 }
      );
    }

    const externalProducts = await fetchExternalProducts(provider);
    await upsertProductsFromExternal(externalProducts, provider.id);
    revalidatePath("/");
    revalidatePath("/api/products");
    (revalidateTag as any)("products");
    return NextResponse.json({ success: true, count: externalProducts.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ไม่สามารถดึงข้อมูลสินค้าได้";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

