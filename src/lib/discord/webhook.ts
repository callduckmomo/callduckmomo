/**
 * Discord Webhook Utility
 * ส่งข้อความแจ้งเตือนไปยัง Discord webhook
 */

import { getSettingValue } from "../settings/repository";
import { getSiteConfig } from "@/lib/site-config";
import { logger } from "@/lib/utils/logger";

// ประเภทของ Webhook
export type WebhookType = "topup" | "purchase" | "admin";

export interface DiscordWebhookEmbed {
  title?: string;
  description?: string;
  color?: number; // Decimal color code (0xRRGGBB)
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  timestamp?: string;
  footer?: {
    text: string;
  };
}

export interface DiscordWebhookPayload {
  username?: string;
  avatar_url?: string;
  embeds?: DiscordWebhookEmbed[];
  content?: string;
}

/**
 * ส่ง webhook ไปยัง Discord
 * @param webhookUrl Discord webhook URL
 * @param payload ข้อมูลที่จะส่ง
 * @returns Promise<boolean> true ถ้าส่งสำเร็จ, false ถ้าส่งไม่สำเร็จ
 */
export async function sendDiscordWebhook(
  webhookUrl: string,
  payload: DiscordWebhookPayload
): Promise<boolean> {
  try {
    if (!webhookUrl || webhookUrl.trim() === "") {
      logger.warn("⚠️ [Discord Webhook] Webhook URL is empty, skipping");
      return false;
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      logger.error("❌ [Discord Webhook] Failed to send:", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      return false;
    }

    logger.debug("✅ [Discord Webhook] Sent successfully");
    return true;
  } catch (error) {
    console.error("❌ [Discord Webhook] Error sending webhook:", error);
    return false;
  }
}

/**
 * สร้าง embed สำหรับแจ้งเตือนเติมพ้อย
 */
export function createTopupEmbed(data: {
  userId: string;
  username: string;
  email: string;
  amount: number;
  pointsAdded: number;
  currentPoints: number;
  transactionId?: string;
}): DiscordWebhookEmbed {
  return {
    title: "💰 เติมพ้อยสำเร็จ",
    color: 0x00ff00, // Green
    fields: [
      {
        name: "👤 ผู้ใช้",
        value: `${data.username}\n${data.email}`,
        inline: true,
      },
      {
        name: "💵 จำนวนเงิน",
        value: `${data.amount.toFixed(2)} บาท`,
        inline: true,
      },
      {
        name: "🎁 พ้อยท์ที่ได้รับ",
        value: `${data.pointsAdded.toLocaleString()} พ้อยท์`,
        inline: true,
      },
      {
        name: "💳 พ้อยท์คงเหลือ",
        value: `${data.currentPoints.toLocaleString()} พ้อยท์`,
        inline: true,
      },
      {
        name: "🆔 Transaction ID",
        value: data.transactionId || "ไม่ระบุ",
        inline: true,
      },
      {
        name: "🆔 User ID",
        value: data.userId,
        inline: true,
      },
    ],
    timestamp: new Date().toISOString(),
    footer: {
      text: `${getSiteConfig().siteName} System`,
    },
  };
}

/**
 * สร้าง embed สำหรับแจ้งเตือนซื้อสินค้า
 */
export function createPurchaseEmbed(data: {
  userId: string;
  username: string;
  email: string;
  productName: string;
  typeId: string;
  price: number;
  remainingPoints: number;
  orderId: string;
  apiProvider?: string;
}): DiscordWebhookEmbed {
  return {
    title: "🛒 ซื้อสินค้าสำเร็จ",
    color: 0x0099ff, // Blue
    fields: [
      {
        name: "👤 ผู้ใช้",
        value: `${data.username}\n${data.email}`,
        inline: true,
      },
      {
        name: "📦 สินค้า",
        value: `${data.productName}\nรหัส: ${data.typeId}`,
        inline: true,
      },
      {
        name: "💰 ราคา",
        value: `${data.price.toLocaleString()} พ้อยท์`,
        inline: true,
      },
      {
        name: "💳 พ้อยท์คงเหลือ",
        value: `${data.remainingPoints.toLocaleString()} พ้อยท์`,
        inline: true,
      },
      {
        name: "🆔 Order ID",
        value: data.orderId,
        inline: true,
      },
      {
        name: "🔌 API Provider",
        value: data.apiProvider || "ไม่ระบุ",
        inline: true,
      },
    ],
    timestamp: new Date().toISOString(),
    footer: {
      text: `${getSiteConfig().siteName} System`,
    },
  };
}

/**
 * สร้าง embed สำหรับแจ้งเตือน admin actions
 */
export function createAdminAuditEmbed(data: {
  adminId: string;
  adminName: string;
  adminEmail: string;
  action: string;
  target?: string;
  details?: string;
  changes?: Record<string, { old: string | number | null; new: string | number | null }>;
}): DiscordWebhookEmbed {
  const fields: DiscordWebhookEmbed["fields"] = [
    {
      name: "👤 แอดมิน",
      value: `${data.adminName}\n${data.adminEmail}`,
      inline: true,
    },
    {
      name: "⚡ Action",
      value: data.action,
      inline: true,
    },
  ];

  if (data.target) {
    fields.push({
      name: "🎯 Target",
      value: data.target,
      inline: true,
    });
  }

  if (data.details) {
    fields.push({
      name: "📝 รายละเอียด",
      value: data.details,
      inline: false,
    });
  }

  if (data.changes && Object.keys(data.changes).length > 0) {
    const changesText = Object.entries(data.changes)
      .map(([key, { old, new: newValue }]) => {
        const oldStr = old === null ? "null" : String(old);
        const newStr = newValue === null ? "null" : String(newValue);
        return `**${key}:**\n\`${oldStr}\` → \`${newStr}\``;
      })
      .join("\n\n");

    fields.push({
      name: "🔄 การเปลี่ยนแปลง",
      value: changesText,
      inline: false,
    });
  }

  fields.push({
    name: "🆔 Admin ID",
    value: data.adminId,
    inline: true,
  });

  return {
    title: "🔐 Admin Action",
    color: 0xff9900, // Orange
    fields,
    timestamp: new Date().toISOString(),
    footer: {
      text: `${getSiteConfig().siteName} System`,
    },
  };
}

