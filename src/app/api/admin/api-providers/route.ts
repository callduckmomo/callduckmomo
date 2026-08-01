import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/auth/server";
import {
  getAllApiProviders,
  createApiProvider,
  updateApiProvider,
  deleteApiProvider,
  getApiProviderById,
} from "@/lib/api-providers/repository";
import type { CreateApiProviderInput, UpdateApiProviderInput } from "@/lib/api-providers/types";
import { sendAdminAuditWebhook } from "@/lib/discord/admin-audit";

const createSchema = z.object({
  name: z.string().min(1, "กรุณาระบุชื่อ API provider"),
  displayName: z.string().min(1, "กรุณาระบุชื่อแสดง"),
  apiKey: z.string().nullable().optional(),
  apiEndpoint: z.string().url("กรุณาระบุ API endpoint ที่ถูกต้อง"),
  productEndpoint: z.string().url("กรุณาระบุ product endpoint ที่ถูกต้อง").nullable().optional(),
  buyEndpoint: z.string().url("กรุณาระบุ buy endpoint ที่ถูกต้อง").nullable().optional(),
  historyEndpoint: z.string().url("กรุณาระบุ history endpoint ที่ถูกต้อง").nullable().optional(),
  isActive: z.boolean().optional(),
});

const updateSchema = z.object({
  displayName: z.string().min(1).optional(),
  apiKey: z.string().optional(), // Optional, but if provided it should be a string
  apiEndpoint: z.string().url().optional(),
  productEndpoint: z.string().url().nullable().optional(),
  buyEndpoint: z.string().url().nullable().optional(),
  historyEndpoint: z.string().url().nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  try {
    await requireSuperAdmin();
    const providers = await getAllApiProviders();
    return NextResponse.json({ providers });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "ไม่สามารถดึงข้อมูล API providers ได้";
    return NextResponse.json({ message }, { status: 500 });
  }
}

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
    const parsed = createSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "ข้อมูลไม่ถูกต้อง",
          errors: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const provider = await createApiProvider(parsed.data as CreateApiProviderInput);
    
    // Send audit webhook
    await sendAdminAuditWebhook({
      action: "สร้าง API Provider",
      target: `Provider: ${provider.displayName || provider.name} (ID: ${provider.id})`,
      details: `Endpoint: ${provider.apiEndpoint}`,
    });

    return NextResponse.json({ provider }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "ไม่สามารถสร้าง API provider ได้";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
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
    const { id, ...updateData } = rawBody;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { message: "กรุณาระบุ ID ของ API provider" },
        { status: 400 }
      );
    }

    const parsed = updateSchema.safeParse(updateData);
    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "ข้อมูลไม่ถูกต้อง",
          errors: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    // Get current provider data for audit log
    const currentProvider = await getApiProviderById(id);
    
    const provider = await updateApiProvider(id, parsed.data as UpdateApiProviderInput);
    
    // Build changes object
    const changes: Record<string, { old: string | number | null; new: string | number | null }> = {};
    if (currentProvider) {
      if (parsed.data.displayName !== undefined) {
        changes["display_name"] = { old: currentProvider.displayName, new: parsed.data.displayName };
      }
      if (parsed.data.isActive !== undefined) {
        changes["is_active"] = { old: String(currentProvider.isActive), new: String(parsed.data.isActive) };
      }
      if (parsed.data.apiEndpoint !== undefined) {
        changes["api_endpoint"] = { old: currentProvider.apiEndpoint, new: parsed.data.apiEndpoint };
      }
    }

    // Send audit webhook
    await sendAdminAuditWebhook({
      action: "อัปเดต API Provider",
      target: `Provider ID: ${id}${currentProvider?.displayName ? ` (${currentProvider.displayName})` : ""}`,
      changes: Object.keys(changes).length > 0 ? changes : undefined,
    });

    return NextResponse.json({ provider });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "ไม่สามารถอัปเดต API provider ได้";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireSuperAdmin();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { message: "กรุณาระบุ ID ของ API provider" },
        { status: 400 }
      );
    }

    // Get provider data before deletion for audit log
    const provider = await getApiProviderById(id);
    
    await deleteApiProvider(id);
    
    // Send audit webhook
    await sendAdminAuditWebhook({
      action: "ลบ API Provider",
      target: `Provider ID: ${id}${provider?.displayName ? ` (${provider.displayName})` : ""}`,
    });

    return NextResponse.json({ message: "ลบ API provider สำเร็จ" });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "ไม่สามารถลบ API provider ได้";
    return NextResponse.json({ message }, { status: 500 });
  }
}

