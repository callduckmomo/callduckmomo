import type { RDCWApiRequest, RDCWApiResponse } from "./types";
import { logger } from "@/lib/utils/logger";

export async function verifySlipWithRDCW(
  qrPayload: string,
  options?: {
    endpoint?: string;
    clientId?: string;
    clientSecret?: string;
  }
): Promise<RDCWApiResponse> {
  const endpoint =
    options?.endpoint ??
    process.env.RDCW_API_ENDPOINT ??
    "https://suba.rdcw.co.th/v2/inquiry";
  const clientId =
    options?.clientId ?? process.env.RDCW_API_CLIENT_ID ?? "";
  const clientSecret =
    options?.clientSecret ?? process.env.RDCW_API_CLIENT_SECRET ?? "";

  if (!endpoint || !clientId || !clientSecret) {
    throw new Error("RDCW API configuration is missing");
  }

  const authString = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64"
  );

  const requestBody: RDCWApiRequest = {
    payload: qrPayload,
  };

  try {
    logger.debug("🔵 [RDCW API] Request:", {
      endpoint,
      method: "POST",
      payloadLength: qrPayload.length,
      payloadPreview: qrPayload.substring(0, 100) + (qrPayload.length > 100 ? "..." : ""),
    });

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${authString}`,
      },
      body: JSON.stringify(requestBody),
    });

    logger.debug("🟡 [RDCW API] Response Status:", {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unable to read error response");
      logger.error("🔴 [RDCW API] Error Response:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      throw new Error("เกิดความผิดพลาด กรุณาติดต่อแอดมินและลองใหม่ภายหลัง");
    }

    const data: RDCWApiResponse = await response.json();
    
    logger.debug("🟢 [RDCW API] Success Response:", {
      valid: data.valid,
      hasData: !!data.data,
      dataPreview: data.data ? {
        amount: data.data.amount,
        receiverAccount: data.data.receiver?.account?.value,
        senderAccount: data.data.sender?.account?.value,
        transRef: data.data.transRef,
        ref1: data.data.ref1,
        transactionDate: data.data.transactionDate,
        transactionTime: data.data.transactionTime,
        transDate: data.data.transDate,
        transTime: data.data.transTime,
      } : null,
    });
    
    return data;
  } catch (error) {
    if (error instanceof Error && error.message.includes("เกิดความผิดพลาด")) {
      throw error;
    }
    throw new Error("เกิดความผิดพลาด กรุณาติดต่อแอดมินและลองใหม่ภายหลัง");
  }
}

