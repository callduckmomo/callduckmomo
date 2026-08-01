import type { Slip2GoApiResponse } from "./types";
import { logger } from "@/lib/utils/logger";
import axios from "axios";
import https from "https";

const DEFAULT_SLIP2GO_ENDPOINT =
  "https://connect.slip2go.com/api/verify-slip/qr-image/info";

export async function verifySlipWithSlip2Go(
  formData: FormData,
  options: { secretKey: string; endpoint?: string }
): Promise<Slip2GoApiResponse> {
  const endpoint = options.endpoint ?? DEFAULT_SLIP2GO_ENDPOINT;
  const secretKey = options.secretKey;

  if (!secretKey) {
    throw new Error("Slip2Go secret key is missing");
  }

  try {
    logger.debug("🔵 [Slip2Go] Sending multipart request via Axios", {
      endpoint,
      hasPayload: formData.has("payload"),
    });

    const agent = new https.Agent({
      rejectUnauthorized: false,
    });

    const response = await axios.post(endpoint, formData, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
      httpsAgent: agent,
      responseType: "json",
    });

    const data = response.data as Slip2GoApiResponse;

    logger.debug("🟢 [Slip2Go] Response received via Axios", {
      status: response.status,
      code: data.code,
      message: data.message,
    });

    return data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      logger.error("🔴 [Slip2Go] Axios request failed", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
      const responseData = error.response?.data as any;
      throw new Error(
        responseData?.message ||
          error.message ||
          "เกิดข้อผิดพลาดในการตรวจสอบสลิป"
      );
    }
    if (error instanceof Error) {
      throw new Error(error.message || "เกิดข้อผิดพลาดในการตรวจสอบสลิป");
    }
    throw new Error("เกิดข้อผิดพลาดในการตรวจสอบสลิป");
  }
}


