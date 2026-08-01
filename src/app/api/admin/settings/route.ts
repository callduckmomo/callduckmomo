import { NextRequest, NextResponse } from "next/server";
import { revalidateTag, revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/server";
import { updateSetting, getAllSettingsForAdmin } from "@/lib/settings/repository";
import { sendAdminAuditWebhook } from "@/lib/discord/admin-audit";

const updateSettingsSchema = z.object({
  settings: z.record(z.string(), z.string().nullable()),
});

export async function GET() {
  try {
    await requireAdmin();

    // ใช้ uncached version เพื่อให้ admin panel เห็นข้อมูลล่าสุดจาก DB เสมอ
    const settings = await getAllSettingsForAdmin();

    return NextResponse.json({ settings });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "ไม่สามารถอ่านการตั้งค่าได้";

    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();

    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        { message: "รูปแบบข้อมูลไม่ถูกต้อง" },
        { status: 415 }
      );
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json(
        { message: "ไม่สามารถอ่านข้อมูลจากคำขอได้" },
        { status: 400 }
      );
    }

    const parsed = updateSettingsSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "ข้อมูลไม่ถูกต้อง",
          errors: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const { settings } = parsed.data;
    const updated: Array<{ key: string; value: string | null }> = [];
    const failed: Array<{ key: string; message: string }> = [];
    const changes: Record<string, { old: string | number | null; new: string | number | null }> = {};

    // ดึงค่าเก่าทั้งหมดในครั้งเดียว (1 batch read) แทน N+1 sequential reads
    const keys = Object.keys(settings);
    const { getSettingValues } = await import("@/lib/settings/repository");
    const currentValues = await getSettingValues(keys);

    for (const [key, value] of Object.entries(settings)) {
      try {
        const oldValue = currentValues[key] ?? null;
        
        await updateSetting(key, value);
        updated.push({ key, value });
        
        // Track changes (only for non-sensitive settings)
        if (!key.includes("secret") && !key.includes("api_key") && !key.includes("client_secret")) {
          changes[key] = { old: oldValue, new: value };
        }
      } catch (error) {
        console.error(`Failed to update setting ${key}:`, error);
        failed.push({
          key,
          message: error instanceof Error ? error.message : "Unknown storage error",
        });
      }
    }

    // ล้างแคชที่ฝั่ง Server เพื่อให้อัปเดตทันที
    if (updated.length > 0) {
      revalidateTag("settings", { expire: 0 });
      revalidatePath("/", "layout");
    }

    if (failed.length > 0) {
      return NextResponse.json(
        {
          success: false,
          updated,
          failed,
          message: `บันทึกไม่สำเร็จ ${failed.length} รายการ กรุณาลองใหม่อีกครั้ง`,
        },
        { status: 500 }
      );
    }

    // Send audit webhook
    if (updated.length > 0) {
      await sendAdminAuditWebhook({
        action: "อัปเดตการตั้งค่า",
        details: `อัปเดต ${updated.length} รายการ`,
        changes: Object.keys(changes).length > 0 ? changes : undefined,
      });
    }

    return NextResponse.json({
      success: true,
      updated,
      message: `อัปเดตการตั้งค่า ${updated.length} รายการเรียบร้อย`,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "ไม่สามารถอัปเดตการตั้งค่าได้";

    return NextResponse.json({ message }, { status: 500 });
  }
}

