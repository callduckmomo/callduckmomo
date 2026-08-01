import { NextRequest, NextResponse } from "next/server";
import { findSupportCaseByCode } from "@/lib/support/repository";
import { z } from "zod";

const checkSchema = z.object({
  caseCode: z.string().min(1, "กรุณาระบุรหัสเคส"),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const caseCode = searchParams.get("caseCode");

    if (!caseCode) {
      return NextResponse.json(
        { ok: false, message: "กรุณาระบุรหัสเคส" },
        { status: 400 }
      );
    }

    let caseData = await findSupportCaseByCode(caseCode);

    if (!caseData) {
      return NextResponse.json(
        { ok: false, message: "ไม่พบเคสที่ระบุ" },
        { status: 404 }
      );
    }

    // Try to fetch latest status from Master API if configured
    try {
      const { getSettingValue } = await import("@/lib/settings/repository");
      const masterUrl = await getSettingValue("MASTER_DOMAIN_URL");
      const masterApiKey = await getSettingValue("MASTER_API_KEY");

      if (masterUrl && masterApiKey) {
        const cleanUrl = masterUrl.endsWith("/") ? masterUrl.slice(0, -1) : masterUrl;
        const res = await fetch(`${cleanUrl}/api/v1/support-cases/${caseCode}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": masterApiKey,
          },
          cache: "no-store", // Always fetch fresh
        });

        if (res.ok) {
          const masterData = await res.json();
          if (masterData && masterData.case) {
            // Override local data with master data
            caseData = {
              ...caseData,
              status: masterData.case.status || caseData.status,
              adminResponse: masterData.case.adminResponse || caseData.adminResponse,
              updatedAt: masterData.case.updatedAt || caseData.updatedAt,
            };
            
            // Optionally: Update local DB in background to keep list views somewhat fresh
            const { updateSupportCase } = await import("@/lib/support/repository");
            updateSupportCase(caseData.id, {
              status: caseData.status,
              adminResponse: caseData.adminResponse,
            }).catch(e => console.error("Failed to background sync case:", e));
          }
        }
      }
    } catch (syncError) {
      console.error("Error fetching latest from Master API:", syncError);
    }

    return NextResponse.json({
      ok: true,
      case: {
        caseCode: caseData.caseCode,
        status: caseData.status,
        adminResponse: caseData.adminResponse,
        createdAt: caseData.createdAt,
        updatedAt: caseData.updatedAt,
        productName: caseData.productName,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ไม่สามารถตรวจสอบเคสได้";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

