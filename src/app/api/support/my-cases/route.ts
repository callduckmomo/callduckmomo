import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { getUserSupportCases } from "@/lib/support/repository";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const cases = await getUserSupportCases(user.id);

    return NextResponse.json({
      ok: true,
      cases,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ไม่สามารถดึงข้อมูลเคสได้";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

