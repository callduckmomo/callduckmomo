import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { createSupportCase } from "@/lib/support/repository";
import { z } from "zod";

const createSchema = z.object({
  orderId: z.string().nullable().optional(),
  productName: z.string().nullable().optional(),
  productTypeId: z.string().nullable().optional(),
  accountEmail: z.string().email().nullable().optional(),
  accountPassword: z.string().nullable().optional(),
  expirationDate: z.string().nullable().optional(),
  caseType: z.enum(["screen", "account"]),
  screenNumber: z.string().nullable().optional(),
  problemDescription: z.string().min(1, "กรุณาระบุปัญหาที่พบ"),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json();

    const validated = createSchema.parse(body);

    let masterCaseCode: string | undefined = undefined;

    // Try to get case code and sync with Master API first if configured
    try {
      const { getSettingValue } = await import("@/lib/settings/repository");
      const masterUrl = await getSettingValue("MASTER_DOMAIN_URL");
      const masterApiKey = await getSettingValue("MASTER_API_KEY");
      const shopName = await getSettingValue("site_name") || "ไม่ระบุชื่อร้าน";

      if (masterUrl && masterApiKey) {
        const cleanUrl = masterUrl.endsWith("/") ? masterUrl.slice(0, -1) : masterUrl;
        
        const payload = {
          ...validated,
          customerName: user.displayName || user.email,
          shopName: shopName,
        };

        const res = await fetch(`${cleanUrl}/api/v1/support-cases`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": masterApiKey,
          },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const masterData = await res.json();
          if (masterData && masterData.case && masterData.case.caseCode) {
            masterCaseCode = masterData.case.caseCode;
          }
        } else {
          console.warn("Failed to sync support case to Master API:", await res.text());
        }
      }
    } catch (syncError) {
      console.error("Error syncing with Master API:", syncError);
    }

    // Now create the local case, using the master's case code if we got it
    const caseData = await createSupportCase({
      ...validated,
      caseCode: masterCaseCode,
      orderId: validated.orderId ?? null,
      productName: validated.productName ?? null,
      productTypeId: validated.productTypeId ?? null,
      accountEmail: validated.accountEmail ?? null,
      accountPassword: validated.accountPassword ?? null,
      expirationDate: validated.expirationDate ?? null,
      screenNumber: validated.screenNumber ?? null,
    }, user.id);

    return NextResponse.json({
      ok: true,
      message: "ระบบได้รับข้อมูลแล้ว ตัวแทนจะตรวจสอบให้เร็วที่สุดค่ะ",
      case: {
        id: caseData.id,
        caseCode: caseData.caseCode,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, message: error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const message = error instanceof Error ? error.message : "ไม่สามารถสร้างเคสได้";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

