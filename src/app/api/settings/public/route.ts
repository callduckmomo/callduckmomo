import { NextRequest, NextResponse } from "next/server";
import { getSettingValue, getSettingValues } from "@/lib/settings/repository";



export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keys = searchParams.get("keys");

    if (keys) {
      const keyList = keys.split(",").map((k) => k.trim()).filter(Boolean);
      const result = await getSettingValues(keyList);
      return NextResponse.json(result);
    }

    const [bankAccountNumber, bankAccountName, bankName, minimumAmount] = await Promise.all([
      getSettingValue("bank_account_no"),
      getSettingValue("bank_account_name"),
      getSettingValue("bank_name"),
      getSettingValue("minimum_topup"),
    ]);

    return NextResponse.json({
      bankAccount: {
        number: bankAccountNumber || null,
        name: bankAccountName || null,
        bank: bankName || null,
      },
      minimumAmount: minimumAmount ? parseFloat(minimumAmount) : 49,
    });
  } catch (error) {
    console.error("Error fetching public settings:", error);
    const { searchParams } = new URL(request.url);
    const keys = searchParams.get("keys");
    if (keys) {
      const keyList = keys.split(",").map((k) => k.trim());
      const result: Record<string, string | null> = {};
      for (const key of keyList) {
        result[key] = null;
      }
      return NextResponse.json(result, { status: 200 });
    }
    return NextResponse.json(
      {
        bankAccount: {
          number: null,
          name: null,
          bank: null,
        },
        minimumAmount: 49,
      },
      { status: 200 }
    );
  }
}

