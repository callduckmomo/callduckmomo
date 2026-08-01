import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

import { requireUser } from "@/lib/auth/server";
import { adjustUserPoints, findUserById } from "@/lib/auth/user";
import { verifySlipWithSlip2Go } from "@/lib/slip/slip2go-api";
import { validateBankAccount } from "@/lib/slip/validation";
import { saveSlipHistory, checkDuplicateSlip } from "@/lib/slip/repository";
import { getAllSettingsForAdmin } from "@/lib/settings/repository";
import {
  SlipVerificationError,
  ErrorCodes,
  type VerifySlipResponse,
  type Slip2GoPayload,
} from "@/lib/slip/types";
import {
  sendDiscordWebhook,
  createTopupEmbed,
} from "@/lib/discord/webhook";
import { logger } from "@/lib/utils/logger";

const MAX_SLIP_FILE_SIZE = 8 * 1024 * 1024; // 8 MB
const SUCCESS_CODES = new Set(["200000", "200001", "200200"]);

function logVerificationError(
  userEmail: string,
  errorMessage: string,
  slip2goData: any
) {
  try {
    const logDir = path.join(process.cwd(), "tmp");
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir);
    }
    const logPath = path.join(logDir, "verify_errors.log");
    const timestamp = new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });
    const logEntry = JSON.stringify({
      timestamp,
      userEmail,
      errorMessage,
      slip2goData: slip2goData || null,
    });
    fs.appendFileSync(logPath, logEntry + "\n");
  } catch (err) {
    console.error("Failed to write to verify_errors.log:", err);
  }
}

export async function POST(request: NextRequest) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  let userEmail = "Unknown User";
  let slipDetails: any = null;
  try {
    const user = await requireUser();
    userEmail = user.email || "Unknown User";

    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json<VerifySlipResponse>(
        {
          success: false,
          error: "รูปแบบข้อมูลไม่ถูกต้อง กรุณาอัปโหลดไฟล์สลิป",
        },
        { status: 415 }
      );
    }

    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json<VerifySlipResponse>(
        {
          success: false,
          error: "ไม่สามารถอ่านข้อมูลจากคำขอได้",
        },
        { status: 400 }
      );
    }

    const slipFile = formData.get("slip");
    if (!(slipFile instanceof File)) {
      return NextResponse.json<VerifySlipResponse>(
        {
          success: false,
          error: "ไม่พบไฟล์สลิป กรุณาลองใหม่",
        },
        { status: 400 }
      );
    }

    if (slipFile.size === 0) {
      return NextResponse.json<VerifySlipResponse>(
        {
          success: false,
          error: "ไฟล์สลิปว่างเปล่า กรุณาเลือกไฟล์ใหม่",
        },
        { status: 400 }
      );
    }

    if (slipFile.size > MAX_SLIP_FILE_SIZE) {
      return NextResponse.json<VerifySlipResponse>(
        {
          success: false,
          error: "ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 8 MB)",
        },
        { status: 400 }
      );
    }

    const allSettings = await getAllSettingsForAdmin();
    const getSetting = (key: string) => allSettings.find(s => s.key === key)?.value || null;

    const slip2goSecretSetting = getSetting("slip2go_api_secret");
    const slip2goEndpointSetting = getSetting("slip2go_api_endpoint");
    const expectedAccount = getSetting("bank_account_no");
    const expectedReceiverName = getSetting("expected_receiver");
    const minimumAmountStr = getSetting("minimum_topup");

    const slip2goSecret =
      slip2goSecretSetting ||
      process.env.SLIP2GO_API_SECRET ||
      process.env.SLIP2GO_SECRET_KEY ||
      "";

    if (!slip2goSecret) {
      throw new SlipVerificationError(
        "ระบบยังไม่ได้ตั้งค่า Slip2Go Secret Key กรุณาติดต่อแอดมิน",
        ErrorCodes.API_ERROR,
        500
      );
    }

    const slip2goEndpoint =
      slip2goEndpointSetting ||
      process.env.SLIP2GO_API_ENDPOINT ||
      "https://connect.slip2go.com/api/verify-slip/qr-image/info";

    const minimumAmount = parseFloat(minimumAmountStr || "49") || 49;

    const payload: Slip2GoPayload = {
      checkDuplicate: true,
    };

    if (expectedAccount) {
      const digits = expectedAccount.replace(/[^0-9]/g, "");
      if (digits.length > 0) {
        payload.checkReceiver = [{ accountNumber: digits }];
      }
    }

    const apiFormData = new FormData();
    apiFormData.append(
      "file",
      slipFile,
      slipFile.name || `slip-${Date.now()}.jpg`
    );
    if (Object.keys(payload).length > 0) {
      apiFormData.append("payload", JSON.stringify(payload));
    }

    const slip2goResponse = await verifySlipWithSlip2Go(apiFormData, {
      endpoint: slip2goEndpoint,
      secretKey: slip2goSecret,
    });
    slipDetails = slip2goResponse;

    if (!SUCCESS_CODES.has(slip2goResponse.code) || !slip2goResponse.data) {
      throw mapSlip2GoError(slip2goResponse.code, slip2goResponse.message);
    }

    const slipData = slip2goResponse.data;
    const amount = Number(slipData.amount ?? 0);
    const receiverAccount =
      slipData.receiver?.account?.bank?.account ||
      slipData.receiver?.account?.proxy?.account ||
      "";

    logger.debug("✅ [Verify Slip] Slip2Go data:", {
      amount,
      receiverAccount,
      referenceId: slipData.referenceId,
      transRef: slipData.transRef,
      dateTime: slipData.dateTime,
    });

    if (!receiverAccount) {
      throw new SlipVerificationError(
        "ไม่สามารถอ่านบัญชีผู้รับจากสลิปได้",
        ErrorCodes.INVALID_ACCOUNT
      );
    }

    if (amount <= 0) {
      throw new SlipVerificationError(
        "ไม่สามารถอ่านจำนวนเงินจากสลิปได้",
        ErrorCodes.INVALID_AMOUNT
      );
    }

    if (amount < minimumAmount) {
      throw new SlipVerificationError(
        `จำนวนเงินต้องไม่น้อยกว่า ${minimumAmount.toFixed(2)} บาท (ปัจจุบัน: ${amount.toFixed(2)} บาท)`,
        ErrorCodes.INVALID_AMOUNT
      );
    }

    if (!expectedAccount) {
      throw new SlipVerificationError(
        "ระบบยังไม่ได้ตั้งค่าเลขบัญชีรับเงิน (bank_account_no) กรุณาติดต่อแอดมิน",
        ErrorCodes.API_ERROR,
        500
      );
    }

    if (!validateBankAccount(expectedAccount, receiverAccount)) {
      throw new SlipVerificationError(
        "เลขบัญชีผู้รับเงินไม่ถูกต้อง",
        ErrorCodes.INVALID_ACCOUNT
      );
    }



    if (slipData.dateTime) {
      const transactionDate = new Date(slipData.dateTime);
      if (isNaN(transactionDate.getTime())) {
        throw new SlipVerificationError(
          "ไม่สามารถอ่านวันที่จากสลิปได้",
          ErrorCodes.INVALID_QR
        );
      }

      const now = new Date();
      const latestAllowedDate = new Date(now);
      latestAllowedDate.setDate(latestAllowedDate.getDate() - 20);

      if (transactionDate < latestAllowedDate) {
        const daysOld = Math.floor(
          (now.getTime() - transactionDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        throw new SlipVerificationError(
          `ไม่สามารถใช้สลิปที่เก่ากว่า 20 วันได้ (สลิปนี้เก่า ${daysOld} วัน) กรุณาใช้สลิปที่ใหม่กว่า`,
          ErrorCodes.INVALID_QR
        );
      }
    }

    const transactionId =
      slipData.transRef || slipData.referenceId || slipData.decode || "";

    if (transactionId) {
      const isDuplicate = await checkDuplicateSlip(transactionId);
      if (isDuplicate) {
        throw new SlipVerificationError(
          "สลิปนี้เคยใช้แล้ว",
          ErrorCodes.DUPLICATE_SLIP
        );
      }
    }

    const pointsToAdd = Number(amount);
    const updatedPoints = await adjustUserPoints(user.id, pointsToAdd);

    await saveSlipHistory({
      userId: user.id,
      transactionId: transactionId || slipData.referenceId || null,
      amount,
      qrPayload:
        slipData.referenceId || slipData.decode || transactionId || "slip",
      status: "success",
    });

    try {
      const webhookUrl = getSetting("discord_webhook_topup");
      if (webhookUrl) {
        const userRecord = await findUserById(user.id);
        const embed = createTopupEmbed({
          userId: user.id,
          username: userRecord?.display_name || user.email || "Unknown",
          email: user.email || "Unknown",
          amount,
          pointsAdded: pointsToAdd,
          currentPoints: updatedPoints,
          transactionId: transactionId || undefined,
        });

        await sendDiscordWebhook(webhookUrl, {
          embeds: [embed],
        });
      }
    } catch (error) {
      logger.error("❌ [Verify Slip] Failed to send Discord webhook:", error);
    }

    return NextResponse.json<VerifySlipResponse>({
      success: true,
      data: {
        message: `เติมเงินสำเร็จ! จำนวน ${amount.toFixed(2)} บาท ได้รับ ${pointsToAdd.toLocaleString()} พ้อยท์`,
        pointsAdded: pointsToAdd,
        currentPoints: updatedPoints,
        transactionAmount: amount,
        minimumAmount,
      },
    });
  } catch (error) {
    logger.error("❌ Slip verification error:", error);
    const errMessage = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในระบบ";
    logVerificationError(userEmail, errMessage, slipDetails);

    if (error instanceof SlipVerificationError) {
      return NextResponse.json<VerifySlipResponse>(
        {
          success: false,
          error: error.message,
        },
        { status: error.statusCode }
      );
    }

    return NextResponse.json<VerifySlipResponse>(
      {
        success: false,
        error: "เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง",
      },
      { status: 500 }
    );
  }
}

function mapSlip2GoError(code: string, fallbackMessage?: string): SlipVerificationError {
  const defaultMessage = fallbackMessage || "ไม่สามารถตรวจสอบสลิปได้ กรุณาลองใหม่";
  switch (code) {
    case "200401":
      return new SlipVerificationError(
        "บัญชีผู้รับเงินไม่ถูกต้อง",
        ErrorCodes.INVALID_ACCOUNT
      );
    case "200402":
      return new SlipVerificationError(
        "ยอดโอนเงินไม่ตรงเงื่อนไข",
        ErrorCodes.INVALID_AMOUNT
      );
    case "200403":
      return new SlipVerificationError(
        "วันที่โอนไม่ตรงเงื่อนไข",
        ErrorCodes.INVALID_QR
      );
    case "200404":
      return new SlipVerificationError("ไม่พบข้อมูลสลิปในระบบธนาคาร", ErrorCodes.INVALID_QR);
    case "200500":
      return new SlipVerificationError("สลิปเสียหรือสลิปปลอม", ErrorCodes.INVALID_QR);
    case "200501":
      return new SlipVerificationError("สลิปนี้เคยใช้แล้ว", ErrorCodes.DUPLICATE_SLIP);
    default:
      return new SlipVerificationError(defaultMessage, ErrorCodes.API_ERROR);
  }
}

