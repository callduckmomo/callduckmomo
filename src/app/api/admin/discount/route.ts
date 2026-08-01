import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/server";
import { getSetting, updateSetting } from "@/lib/settings/repository";
import { sendAdminAuditWebhook } from "@/lib/discord/admin-audit";

const updateDiscountSchema = z.object({
  discount_percentage: z.string().nullable().optional(),
});

export async function GET() {
  try {
    await requireAdmin();

    const discountSetting = await getSetting("discount_percentage");

    return NextResponse.json({
      ok: true,
      setting: discountSetting
        ? {
            key: discountSetting.key,
            value: discountSetting.value,
            description: discountSetting.description,
          }
        : null,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "ไม่สามารถอ่านการตั้งค่าส่วนลดได้";

    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();

    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        { ok: false, message: "รูปแบบข้อมูลไม่ถูกต้อง" },
        { status: 415 }
      );
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json(
        { ok: false, message: "ไม่สามารถอ่านข้อมูลจากคำขอได้" },
        { status: 400 }
      );
    }

    const parsed = updateDiscountSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          message: "ข้อมูลไม่ถูกต้อง",
          errors: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    // Get current setting value for audit log
    const currentSetting = await getSetting("discount_percentage");
    const oldValue = currentSetting?.value ?? null;
    const newValue = parsed.data.discount_percentage?.trim() || null;

    await updateSetting("discount_percentage", newValue);

    // Send audit webhook
    await sendAdminAuditWebhook({
      action: "อัปเดตส่วนลด",
      target: "discount_percentage",
      changes: {
        discount_percentage: { old: oldValue, new: newValue },
      },
    });

    return NextResponse.json({
      ok: true,
      message: "อัปเดตส่วนลดเรียบร้อย",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "ไม่สามารถอัปเดตส่วนลดได้";

    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

