"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type Setting = {
  key: string;
  value: string | null;
  description: string | null;
  updatedAt: string;
};

export default function LogSettingsTable() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [isPending, startTransition] = useTransition();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const fetchSettings = () => {
    startTransition(async () => {
      const res = await fetch("/api/admin/settings", { credentials: "include" });
      if (!res.ok) {
        toast.error("โหลดการตั้งค่าไม่สำเร็จ");
        return;
      }
      const data = (await res.json()) as { settings: Setting[] };
      // Filter only Discord webhook settings
      const discordSettings = data.settings.filter((s) => s.key.startsWith("discord_webhook_"));
      setSettings(discordSettings);
      const initialDrafts: Record<string, string> = {};
      discordSettings.forEach((setting) => {
        initialDrafts[setting.key] = setting.value ?? "";
      });
      setDrafts(initialDrafts);
    });
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleDraftChange = (key: string, value: string) => {
    setDrafts((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          settings: Object.fromEntries(
            Object.entries(drafts).map(([key, value]) => [key, value.trim() || null])
          ),
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        toast.error(payload?.message ?? "ไม่สามารถบันทึกการตั้งค่าได้");
        return;
      }

      const payload = (await res.json()) as { message: string };
      toast.success(payload.message ?? "บันทึกการตั้งค่าเรียบร้อย");
      fetchSettings();
    } catch (error) {
      console.error("Save settings error:", error);
      toast.error("ไม่สามารถบันทึกการตั้งค่าได้");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-[#0B0B0B]">Discord Webhook</h3>
          <p className="text-sm text-[#6B7280]">ตั้งค่า Discord webhook URLs สำหรับแจ้งเตือน</p>
        </div>
        <div className="space-y-4 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-6">
          {settings.map((setting) => {
            const settingName = setting.key.replace("discord_webhook_", "");
            const displayName =
              settingName === "topup"
                ? "Webhook URL สำหรับแจ้งเตือนการเติมพ้อย"
                : settingName === "purchase"
                ? "Webhook URL สำหรับแจ้งเตือนการซื้อสินค้า"
                : settingName === "admin_audit"
                ? "Webhook URL สำหรับแจ้งเตือน Admin Actions (รวม)"
                : setting.description ?? setting.key;

            return (
              <div key={setting.key} className="space-y-2">
                <Label htmlFor={`setting-${setting.key}`} className="text-sm text-[#0B0B0B]">
                  {displayName}
                </Label>
                <Input
                  id={`setting-${setting.key}`}
                  type="url"
                  value={drafts[setting.key] ?? ""}
                  onChange={(e) => handleDraftChange(setting.key, e.target.value)}
                  placeholder="https://discord.com/api/webhooks/..."
                  className="rounded-lg border-[var(--theme-color)]/30 bg-white focus-visible:ring-[var(--theme-color)]"
                  disabled={isPending || isSaving}
                />
                <p className="text-xs text-[#6B7280]">
                  ใส่ Discord webhook URL หรือเว้นว่างเพื่อปิดการแจ้งเตือน
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleSaveAll}
          disabled={isPending || isSaving}
          className="rounded-lg bg-[var(--theme-color)] text-white hover:bg-[var(--theme-color)] hover:text-white"
        >
          {isSaving ? "กำลังบันทึก..." : "บันทึกการตั้งค่าทั้งหมด"}
        </Button>
      </div>
    </div>
  );
}

