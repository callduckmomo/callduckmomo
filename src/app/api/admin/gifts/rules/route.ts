import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireSuperAdmin } from "@/lib/auth/server";
import {
  createGiftOption,
  deleteGiftOption,
  listAllGiftOptions,
  setGiftOptionActive,
} from "@/lib/gifts/repository";
import { fetchAllProducts } from "@/lib/products/repository";
import { sendAdminAuditWebhook } from "@/lib/discord/admin-audit";

const createSchema = z.object({
  baseTypeId: z.string().min(1),
  giftTypeId: z.string().min(1),
});

const toggleSchema = z.object({
  id: z.string(),
  isActive: z.boolean(),
});

export async function GET() {
  await requireSuperAdmin();

  const [rules, products] = await Promise.all([listAllGiftOptions(), fetchAllProducts()]);
  const productMap = new Map(products.map((p) => [p.typeId, p]));

  return NextResponse.json({
    rules: rules.map((r) => ({
      ...r,
      baseProductName: productMap.get(r.baseProductTypeId)?.name ?? r.baseProductTypeId,
      giftProductName: productMap.get(r.giftProductTypeId)?.name ?? r.giftProductTypeId,
      giftProductStock: productMap.get(r.giftProductTypeId)?.stock ?? null,
      giftIsExternal: Boolean(productMap.get(r.giftProductTypeId)?.apiProviderId),
    })),
    products: products.map((p) => ({
      typeId: p.typeId,
      name: p.name,
      stock: p.stock,
      apiProviderId: p.apiProviderId,
    })),
  });
}

export async function POST(request: NextRequest) {
  await requireSuperAdmin();

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 422 });
  }

  const created = await createGiftOption(parsed.data.baseTypeId, parsed.data.giftTypeId);

  await sendAdminAuditWebhook({
    action: "เพิ่มของแถม",
    target: `Base: ${created.baseProductTypeId} -> Gift: ${created.giftProductTypeId}`,
  });

  return NextResponse.json({ rule: created }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  await requireSuperAdmin();

  const body = await request.json().catch(() => null);
  const parsed = toggleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 422 });
  }

  await setGiftOptionActive(parsed.data.id, parsed.data.isActive);

  await sendAdminAuditWebhook({
    action: "อัปเดตสถานะของแถม",
    target: `Rule ID: ${parsed.data.id}`,
    details: `ตั้งค่า is_active = ${String(parsed.data.isActive)}`,
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  await requireSuperAdmin();

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ message: "กรุณาระบุ id" }, { status: 422 });
  }

  await deleteGiftOption(id);

  await sendAdminAuditWebhook({
    action: "ลบของแถม",
    target: `Rule ID: ${id}`,
  });

  return NextResponse.json({ success: true });
}


