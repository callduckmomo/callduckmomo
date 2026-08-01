import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/server";
import {
  getAllCategoriesIncludingInactive,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryById,
} from "@/lib/categories/repository";
import { sendAdminAuditWebhook } from "@/lib/discord/admin-audit";
import { getSiteId } from "@/lib/site";

function revalidateCategoryViews() {
  revalidateTag("categories", { expire: 0 });
  revalidateTag("products", { expire: 0 });
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/api/products");
}

const createSchema = z.object({
  name: z.string().min(1, "ชื่อหมวดหมู่ต้องไม่ว่าง"),
  description: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  displayOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  displayOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

function getCategoryScope() {
  const siteId = getSiteId();
  return {
    siteId,
    isLocal: siteId !== "main",
  };
}

export async function GET() {
  const me = await getCurrentUser();
  const isAdmin = me?.role === 'superadmin' || me?.role === 'admin' || me?.isAdmin;
  if (!me || !isAdmin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const categories = await getAllCategoriesIncludingInactive(getCategoryScope());
    return NextResponse.json(
      { categories },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "ไม่สามารถโหลดหมวดหมู่ได้";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const me = await getCurrentUser();
  const isAdmin = me?.role === 'superadmin' || me?.role === 'admin' || me?.isAdmin;
  if (!me || !isAdmin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "ข้อมูลไม่ถูกต้อง", errors: parsed.error.issues },
        { status: 422 }
      );
    }

    const scope = getCategoryScope();
    const category = await createCategory(
      parsed.data.name,
      parsed.data.description ?? null,
      parsed.data.imageUrl ?? null,
      parsed.data.displayOrder ?? 0,
      parsed.data.isActive ?? true,
      scope.isLocal ? scope.siteId : null,
      scope.isLocal
    );

    // Send audit webhook
    await sendAdminAuditWebhook({
      action: "สร้างหมวดหมู่",
      target: `Category: ${category.name}`,
      details: `สร้างหมวดหมู่ "${category.name}" สำเร็จ`,
    });

    revalidateCategoryViews();

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ไม่สามารถสร้างหมวดหมู่ได้";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const me = await getCurrentUser();
  const isAdmin = me?.role === 'superadmin' || me?.role === 'admin' || me?.isAdmin;
  if (!me || !isAdmin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json({ message: "กรุณาระบุ ID ของหมวดหมู่" }, { status: 422 });
    }

    const parsed = updateSchema.safeParse(updates);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "ข้อมูลไม่ถูกต้อง", errors: parsed.error.issues },
        { status: 422 }
      );
    }

    // Get current category for audit
    const scope = getCategoryScope();
    const currentCategory = await getCategoryById(id, scope);
    if (!currentCategory) {
      return NextResponse.json({ message: "ไม่พบหมวดหมู่" }, { status: 404 });
    }

    const updatePayload: {
      name?: string;
      description?: string | null;
      imageUrl?: string | null;
      displayOrder?: number;
      isActive?: boolean;
    } = {};

    if (parsed.data.name !== undefined) updatePayload.name = parsed.data.name;
    if (parsed.data.description !== undefined) updatePayload.description = parsed.data.description;
    if (parsed.data.imageUrl !== undefined) updatePayload.imageUrl = parsed.data.imageUrl;
    if (parsed.data.displayOrder !== undefined) updatePayload.displayOrder = parsed.data.displayOrder;
    if (parsed.data.isActive !== undefined) updatePayload.isActive = parsed.data.isActive;

    const category = await updateCategory(id, updatePayload, scope);

    // Send audit webhook
    const changes: Record<string, { old: string | number | null; new: string | number | null }> = {};
    if (parsed.data.name !== undefined && parsed.data.name !== currentCategory.name) {
      changes["name"] = { old: currentCategory.name, new: parsed.data.name };
    }
    if (parsed.data.isActive !== undefined && parsed.data.isActive !== currentCategory.isActive) {
      changes["isActive"] = { 
        old: currentCategory.isActive ? "true" : "false", 
        new: parsed.data.isActive ? "true" : "false" 
      };
    }

    await sendAdminAuditWebhook({
      action: "อัปเดตหมวดหมู่",
      target: `Category: ${category.name}`,
      changes: Object.keys(changes).length > 0 ? changes : undefined,
    });

    revalidateCategoryViews();

    return NextResponse.json({ category });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ไม่สามารถอัปเดตหมวดหมู่ได้";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const me = await getCurrentUser();
  const isAdmin = me?.role === 'superadmin' || me?.role === 'admin' || me?.isAdmin;
  if (!me || !isAdmin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ message: "กรุณาระบุ ID ของหมวดหมู่" }, { status: 422 });
    }

    // Get category for audit
    const scope = getCategoryScope();
    const category = await getCategoryById(id, scope);
    if (!category) {
      return NextResponse.json({ message: "ไม่พบหมวดหมู่" }, { status: 404 });
    }

    await deleteCategory(id, scope);

    // Send audit webhook
    await sendAdminAuditWebhook({
      action: "ลบหมวดหมู่",
      target: `Category: ${category.name}`,
      details: `ลบหมวดหมู่ "${category.name}" สำเร็จ`,
    });

    revalidateCategoryViews();

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ไม่สามารถลบหมวดหมู่ได้";
    return NextResponse.json({ message }, { status: 500 });
  }
}

