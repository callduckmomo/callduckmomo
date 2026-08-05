import { getSettingValue } from "@/lib/settings/repository";
import { requireAdmin } from "@/lib/auth/server";
import SettingsForm from "./settings-form";

// This page reads the Master API key and must never be prerendered into a
// public ISR artifact or CDN cache.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SettingsPage() {
  await requireAdmin();
  const masterUrl = await getSettingValue("MASTER_DOMAIN_URL");
  const apiKey = await getSettingValue("MASTER_API_KEY");

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">ตั้งค่าระบบ (Settings)</h1>
        <p className="text-gray-500 mt-2">
          ตั้งค่าการเชื่อมต่อกับเว็ปแม่ (Master Website) เพื่อดึงข้อมูลสินค้าและอัปเดตสต๊อก
        </p>
      </div>

      <SettingsForm 
        initialUrl={masterUrl || process.env.NEXT_PUBLIC_MASTER_DOMAIN_URL || ""} 
        initialApiKey={apiKey || process.env.MASTER_API_KEY || ""} 
      />
    </div>
  );
}
