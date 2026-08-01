import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { getAllSupportCases, getAllSupportCasesPaginated, updateSupportCase } from "@/lib/support/repository";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["pending", "resolved"]).optional(),
  adminNote: z.string().nullable().optional(),
  adminResponse: z.string().nullable().optional(),
});

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    // If requesting single case by ID, return with attachments
    if (id) {
      const { findSupportCaseById } = await import("@/lib/support/repository");
      let caseData = await findSupportCaseById(id);
      if (!caseData) {
        return NextResponse.json({ ok: false, message: "ไม่พบเคส" }, { status: 404 });
      }

      // Try to fetch latest status from Master API if configured
      try {
        const { getSettingValue } = await import("@/lib/settings/repository");
        const masterUrl = await getSettingValue("MASTER_DOMAIN_URL");
        const masterApiKey = await getSettingValue("MASTER_API_KEY");

        if (masterUrl && masterApiKey) {
          const cleanUrl = masterUrl.endsWith("/") ? masterUrl.slice(0, -1) : masterUrl;
          const res = await fetch(`${cleanUrl}/api/v1/support-cases/${caseData.caseCode}`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": masterApiKey,
            },
            cache: "no-store",
          });

          if (res.ok) {
            const masterData = await res.json();
            if (masterData && masterData.case) {
              caseData = {
                ...caseData,
                status: masterData.case.status || caseData.status,
                adminResponse: masterData.case.adminResponse || caseData.adminResponse,
                updatedAt: masterData.case.updatedAt || caseData.updatedAt,
              };
              
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

      return NextResponse.json({ ok: true, case: caseData });
    }

    const status = searchParams.get("status");
    const productTypeId = searchParams.get("productTypeId");
    const caseType = searchParams.get("caseType");
    const searchEmail = searchParams.get("searchEmail");
    const searchCaseCode = searchParams.get("searchCaseCode");
    const pagination = searchParams.get("pagination");
    const page = searchParams.get("page");
    const limit = searchParams.get("limit");

    // Use pagination if requested
    if (pagination === "true") {
      const pageNum = page ? parseInt(page, 10) : 1;
      const limitNum = limit ? parseInt(limit, 10) : 50;

      const { getSettingValue } = await import("@/lib/settings/repository");
      const masterUrl = await getSettingValue("MASTER_DOMAIN_URL");
      const masterApiKey = await getSettingValue("MASTER_API_KEY");
      const isCentralized = !!(masterUrl && masterApiKey);

      if (isCentralized) {
        try {
          const cleanUrl = masterUrl.endsWith("/") ? masterUrl.slice(0, -1) : masterUrl;
          
          // Reconstruct search params for master API
          const masterParams = new URLSearchParams();
          masterParams.set("pagination", "true");
          masterParams.set("page", String(pageNum));
          masterParams.set("limit", String(limitNum));
          if (status) masterParams.set("status", status);
          if (productTypeId) masterParams.set("productTypeId", productTypeId);
          if (caseType) masterParams.set("caseType", caseType);
          if (searchEmail) masterParams.set("searchEmail", searchEmail);
          if (searchCaseCode) masterParams.set("searchCaseCode", searchCaseCode);

          const res = await fetch(`${cleanUrl}/api/v1/support-cases?${masterParams.toString()}`, {
            method: "GET",
            headers: {
              "x-api-key": masterApiKey,
            },
            cache: "no-store",
          });

          if (res.ok) {
            const masterData = await res.json();
            return NextResponse.json({
              ...masterData,
              isCentralized,
            });
          }
        } catch (error) {
          console.error("Error fetching cases from Master API:", error);
          // Fallback to local DB if Master API fails
        }
      }

      // Local DB fetch (used if not centralized, or if Master API fails)
      const result = await getAllSupportCasesPaginated(
        {
          status: status || undefined,
          productTypeId: productTypeId || undefined,
          caseType: caseType || undefined,
          searchEmail: searchEmail || undefined,
          searchCaseCode: searchCaseCode || undefined,
        },
        {
          page: pageNum,
          limit: limitNum,
          includeAttachments: false,
        }
      );

      return NextResponse.json({
        ok: true,
        cases: result.cases,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        isCentralized,
      });
    }

    const { getSettingValue } = await import("@/lib/settings/repository");
    const masterUrl = await getSettingValue("MASTER_DOMAIN_URL");
    const masterApiKey = await getSettingValue("MASTER_API_KEY");
    const isCentralized = !!(masterUrl && masterApiKey);

    if (isCentralized) {
      try {
        const cleanUrl = masterUrl.endsWith("/") ? masterUrl.slice(0, -1) : masterUrl;
        
        const masterParams = new URLSearchParams();
        if (status) masterParams.set("status", status);
        if (productTypeId) masterParams.set("productTypeId", productTypeId);
        if (caseType) masterParams.set("caseType", caseType);
        if (searchEmail) masterParams.set("searchEmail", searchEmail);
        if (searchCaseCode) masterParams.set("searchCaseCode", searchCaseCode);

        const res = await fetch(`${cleanUrl}/api/v1/support-cases?${masterParams.toString()}`, {
          method: "GET",
          headers: {
            "x-api-key": masterApiKey,
          },
          cache: "no-store",
        });

        if (res.ok) {
          const masterData = await res.json();
          return NextResponse.json({
            ok: true,
            cases: masterData.cases || [],
            isCentralized,
          });
        }
      } catch (error) {
        console.error("Error fetching cases from Master API:", error);
      }
    }

    // Fallback to local DB fetch
    const cases = await getAllSupportCases({
      status: status || undefined,
      productTypeId: productTypeId || undefined,
      caseType: caseType || undefined,
      searchEmail: searchEmail || undefined,
      searchCaseCode: searchCaseCode || undefined,
    });

    return NextResponse.json({ ok: true, cases, isCentralized });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ไม่สามารถดึงข้อมูลเคสได้";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { id, caseCode, ...updates } = body;

    if (!id && !caseCode) {
      return NextResponse.json(
        { ok: false, message: "กรุณาระบุ ID หรือ CaseCode ของเคส" },
        { status: 400 }
      );
    }

    const validated = updateSchema.parse(updates);

    // Try to sync update to Master API first if configured
    let updatedCase = null;
    let isMasterUpdated = false;
    
    try {
      const { getSettingValue } = await import("@/lib/settings/repository");
      const masterUrl = await getSettingValue("MASTER_DOMAIN_URL");
      const masterApiKey = await getSettingValue("MASTER_API_KEY");

      if (masterUrl && masterApiKey) {
        const cleanUrl = masterUrl.endsWith("/") ? masterUrl.slice(0, -1) : masterUrl;
        
        // We need caseCode to sync with Master API. If we don't have it in body, we might need to look it up, 
        // but frontend should send it.
        const codeToSync = caseCode || id; 

        const res = await fetch(`${cleanUrl}/api/v1/support-cases/${codeToSync}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": masterApiKey,
          },
          body: JSON.stringify(validated),
        });

        if (res.ok) {
          const masterData = await res.json();
          updatedCase = masterData.case;
          isMasterUpdated = true;
        } else {
          console.warn("Failed to sync support case update to Master API:", await res.text());
          throw new Error("Master API ปฏิเสธการอัปเดต");
        }
      }
    } catch (syncError) {
      console.error("Error syncing update to Master API:", syncError);
      if (syncError instanceof Error && syncError.message.includes("Master API")) {
         throw syncError; // Rethrow if it's explicitly from master
      }
    }

    // If we are in Centralized mode (Master API updated successfully), we skip local DB update
    // because the local DB might not have this ID (it uses Master DB's ID).
    if (!isMasterUpdated && id) {
      // Fallback to local DB if not centralized
      updatedCase = await updateSupportCase(id, validated);
    }

    if (!updatedCase) {
       throw new Error("ไม่สามารถอัปเดตเคสได้ (Master API ไม่ตอบสนอง และไม่ได้อยู่ในโหมด Local)");
    }

    return NextResponse.json({
      ok: true,
      message: "อัปเดตเคสสำเร็จ",
      case: updatedCase,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, message: error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const message = error instanceof Error ? error.message : "ไม่สามารถอัปเดตเคสได้";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

