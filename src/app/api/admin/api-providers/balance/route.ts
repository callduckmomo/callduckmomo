import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/server";
import { getApiProviderById } from "@/lib/api-providers/repository";
import { createBasicAuthHeader } from "@/lib/api-providers/utils";
import { logger } from "@/lib/utils/logger";
import axios from "axios";
import qs from "qs";

type PeamSub24hrBalanceResponse = {
  statusCode: number;
  data?: {
    balance: string;
    username?: string;
    rank?: number;
  };
  error?: string;
  message?: string;
};

type GafiwShopBalanceResponse = {
  // Format 1: { ok: boolean, balance?: string }
  ok?: boolean;
  balance?: string;
  owner?: string;
  error?: string;
  // Format 2: { status: string, msg?: string }
  status?: string;
  msg?: string;
};

export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin();

    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get("providerId");

    if (!providerId) {
      return NextResponse.json(
        { message: "กรุณาระบุ provider ID" },
        { status: 400 }
      );
    }

    const provider = await getApiProviderById(providerId);
    if (!provider) {
      return NextResponse.json(
        { message: "ไม่พบ API provider" },
        { status: 404 }
      );
    }

    if (!provider.apiKey) {
      return NextResponse.json(
        { message: "API provider นี้ยังไม่มี API key" },
        { status: 400 }
      );
    }

    let balance: string | null = null;
    let error: string | null = null;

    try {
      if (provider.name === "peamsub24hr" || provider.apiEndpoint.includes("peamsub24hr.com")) {
        // PeamSub24hr API
        const authHeader = createBasicAuthHeader(provider.apiKey);
        const response = await fetch("https://api.peamsub24hr.com/v2/user/inquiry", {
          method: "GET",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const errorData = (await response.json().catch(() => null)) as PeamSub24hrBalanceResponse | null;
          error = errorData?.message || errorData?.error || `HTTP ${response.status}`;
        } else {
          const data = (await response.json()) as PeamSub24hrBalanceResponse;
          if (data.statusCode === 200 && data.data?.balance) {
            balance = data.data.balance;
          } else {
            error = data.message || data.error || "ไม่สามารถดึงข้อมูล balance ได้";
          }
        }
      } else if (provider.name === "gafiwshop" || provider.apiEndpoint.includes("gafiwshop.xyz")) {
        // GafiwShop API - POST method with application/x-www-form-urlencoded
        const API_URL = "https://gafiwshop.xyz/api/api_money";
        const requestBody = qs.stringify({ keyapi: provider.apiKey });
        const requestHeaders = {
          "Content-Type": "application/x-www-form-urlencoded",
        };

        logger.debug("🔵 [GafiwShop Balance] Request Details:", {
          url: API_URL,
          method: "POST",
          headers: requestHeaders,
          body: requestBody,
          apiKey: provider.apiKey ? `${provider.apiKey.substring(0, 4)}...` : "null",
        });

        try {
          const response = await axios.post<GafiwShopBalanceResponse>(
            API_URL,
            requestBody,
            {
              headers: requestHeaders,
            }
          );

          logger.debug("✅ [GafiwShop Balance] Response Success:", {
            status: response.status,
            statusText: response.statusText,
            data: response.data,
          });

          const data = response.data;
          
          // รองรับ format ใหม่: { status: "success", msg: "150.56 บาท" }
          if (data.status === "success" && data.msg) {
            // Extract ตัวเลขจาก msg (ลบ "บาท" และช่องว่างออก)
            const balanceMatch = data.msg.match(/[\d.]+/);
            if (balanceMatch) {
              balance = balanceMatch[0];
              logger.debug("  ✅ Balance extracted from msg:", balance);
            } else {
              error = "ไม่สามารถ parse balance จาก msg ได้";
              logger.warn("  ❌ Error parsing balance from msg:", data.msg);
            }
          }
          // รองรับ format เก่า: { ok: true, balance: "150.56" }
          else if (data.ok && data.balance !== undefined) {
            balance = data.balance;
            logger.debug("  ✅ Balance extracted from balance field:", balance);
          } else {
            error = data.error || data.msg || "ไม่สามารถดึงข้อมูล balance ได้";
            logger.warn("  ❌ Error from API:", error);
          }
        } catch (axiosError: any) {
          logger.error("❌ [GafiwShop Balance] Request Failed:", axiosError);
          
          if (axiosError.response) {
            // API ส่ง response กลับมาแต่มี error
            console.error("  Response Status:", axiosError.response.status);
            console.error("  Response Headers:", JSON.stringify(axiosError.response.headers, null, 2));
            console.error("  Response Data:", JSON.stringify(axiosError.response.data, null, 2));
            
            const errorData = axiosError.response.data as GafiwShopBalanceResponse;
            error = errorData.error || `HTTP ${axiosError.response.status}`;
            console.error("  Error Message:", error);
          } else if (axiosError.request) {
            // Request ส่งไปแล้วแต่ไม่ได้รับ response
            console.error("  Request was made but no response received");
            console.error("  Request Config:", JSON.stringify(axiosError.config, null, 2));
            error = "ไม่ได้รับ response จาก API";
          } else {
            // เกิด error ในการตั้งค่า request
            console.error("  Error setting up request:", axiosError.message);
            console.error("  Stack:", axiosError.stack);
            error = axiosError.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ API";
          }
        }
      } else {
        error = "API provider นี้ยังไม่รองรับการดึง balance";
      }
    } catch (fetchError) {
      console.error("Error fetching balance:", fetchError);
      error = "เกิดข้อผิดพลาดในการเชื่อมต่อ API";
    }

    return NextResponse.json({
      providerId: provider.id,
      providerName: provider.name,
      balance,
      error,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "ไม่สามารถดึงข้อมูล balance ได้";
    return NextResponse.json({ message }, { status: 500 });
  }
}

