/**
 * Helper function สำหรับส่ง admin audit webhook
 */

import { getSettingValue } from "@/lib/settings/repository";
import {
  sendDiscordWebhook,
  createAdminAuditEmbed,
} from "./webhook";
import { getCurrentUser } from "@/lib/auth/server";

/**
 * ส่ง admin audit webhook (ถ้ามีการตั้งค่า)
 */
export async function sendAdminAuditWebhook(data: {
  action: string;
  target?: string;
  details?: string;
  changes?: Record<string, { old: string | number | null; new: string | number | null }>;
}): Promise<void> {
  try {
    const webhookUrl = await getSettingValue("discord_webhook_admin_audit");
    if (!webhookUrl) {
      return; // ไม่มีการตั้งค่า webhook
    }

    const admin = await getCurrentUser();
    if (!admin) {
      return; // ไม่พบ admin user
    }

    const embed = createAdminAuditEmbed({
      adminId: admin.id,
      adminName: admin.displayName || admin.email || "Unknown",
      adminEmail: admin.email || "Unknown",
      ...data,
    });

    await sendDiscordWebhook(webhookUrl, {
      embeds: [embed],
    });
  } catch (error) {
    // Don't fail the request if webhook fails
    console.error("❌ [Admin Audit] Failed to send Discord webhook:", error);
  }
}

