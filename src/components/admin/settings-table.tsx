"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { uploadAdminLoginBackground } from "@/lib/admin/image-upload-client";
import { testMasterConnection, getTenantBalance } from "@/app/admin/settings/actions";
import {
  isLoginBackgroundAspectRatioAllowed,
  LOGIN_BACKGROUND_MAX_FILE_SIZE,
  LOGIN_BACKGROUND_MIN_HEIGHT,
  LOGIN_BACKGROUND_MIN_WIDTH,
  resolveLoginBackgroundContentType,
} from "@/lib/uploads/login-background";

type Setting = {
  key: string;
  value: string | null;
  description: string | null;
  updatedAt: string;
};

export default function SettingsTable() {
  const router = useRouter();
  const [settings, setSettings] = useState<Setting[]>([]);
  const [isPending, startTransition] = useTransition();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLoginBackground, setIsUploadingLoginBackground] = useState(false);
  const [loginBackgroundUploadProgress, setLoginBackgroundUploadProgress] = useState(0);
  const [tenantBalance, setTenantBalance] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  const fetchSettings = () => {
    startTransition(async () => {
      const res = await fetch("/api/admin/settings", { credentials: "include" });
      if (!res.ok) {
        toast.error("โหลดการตั้งค่าไม่สำเร็จ");
        return;
      }
      const data = (await res.json()) as { settings: Setting[] };
      setSettings(data.settings);
      const initialDrafts: Record<string, string> = {};
      data.settings.forEach((setting) => {
        initialDrafts[setting.key] = setting.value ?? "";
      });
      setDrafts(initialDrafts);

      if (initialDrafts["MASTER_DOMAIN_URL"] && initialDrafts["MASTER_API_KEY"]) {
        setIsLoadingBalance(true);
        getTenantBalance(initialDrafts["MASTER_DOMAIN_URL"], initialDrafts["MASTER_API_KEY"])
          .then(res => {
            if (res.success) setTenantBalance(res.balance);
          })
          .finally(() => setIsLoadingBalance(false));
      }
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
      const changedSettings: Record<string, string | null> = {};
      let hasChanges = false;
      
      Object.entries(drafts).forEach(([key, value]) => {
        const originalValue = settings.find(s => s.key === key)?.value ?? "";
        if (value !== originalValue) {
          changedSettings[key] = value.trim() || null;
          hasChanges = true;
        }
      });

      if (!hasChanges) {
        toast.info("ไม่มีการตั้งค่าใดเปลี่ยนแปลง");
        setIsSaving(false);
        return;
      }

      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ settings: changedSettings }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        toast.error(payload?.message ?? "ไม่สามารถบันทึกการตั้งค่าได้");
        return;
      }

      const payload = (await res.json()) as { message: string };
      toast.success(payload.message ?? "บันทึกการตั้งค่าเรียบร้อย");
      fetchSettings();
      // Force server re-render so navbar/logo updates immediately
      router.refresh();
    } catch (error) {
      console.error("Save settings error:", error);
      toast.error("ไม่สามารถบันทึกการตั้งค่าได้");
    } finally {
      setIsSaving(false);
    }
  };

  const groupedSettings = {
    site: settings.filter((s) => s.key.startsWith("site_")),
    announcement: settings.filter((s) => s.key.startsWith("announcement_")),
    poster: settings.filter((s) => s.key.startsWith("home_poster_")),
    slip2go: settings.filter((s) => s.key.startsWith("slip2go_")),
    bankAccount: settings.filter((s) => s.key.startsWith("bank_")),
    payment: settings.filter((s) => s.key.includes("minimum_topup") || s.key.includes("expected_receiver")),
    contact: settings.filter((s) => s.key === "admin_contact_url"),
    theme: settings.filter((s) => s.key.startsWith("theme_color")),
    registration: settings.filter((s) => s.key === "registration_enabled"),
  };

  const announcementText = drafts["announcement_text"] ?? "";
  const announcementEnabled = drafts["announcement_enabled"] === "true";
  const posterEnabled = drafts["home_poster_enabled"] === "true";
  const registrationEnabled = drafts["registration_enabled"] === "true";
  const youtubeEnabled = drafts["home_youtube_enabled"] === "true";
  const moviesEnabled = drafts["home_movies_enabled"] === "true";
  const featuredEnabled = drafts["home_featured_enabled"] !== "false";
  const shortcutsEnabled = drafts["home_shortcuts_enabled"] === "true";

  const handleLoginBackgroundUpload = async (file: File) => {
    const contentType = resolveLoginBackgroundContentType(file.type, file.name);

    if (!contentType) {
      toast.error("Background หน้า Login รองรับไฟล์ JPG, JPEG, JPE, JFIF, PJPEG, PJP, PNG, WebP, AVIF, GIF หรือ BMP เท่านั้น");
      return;
    }

    if (file.size > LOGIN_BACKGROUND_MAX_FILE_SIZE) {
      toast.error(
        `ไฟล์มีขนาด ${(file.size / 1024 / 1024).toFixed(1)} MB กรุณาใช้ไฟล์ไม่เกิน 16 MB`
      );
      return;
    }

    setIsUploadingLoginBackground(true);
    setLoginBackgroundUploadProgress(0);

    const objectUrl = URL.createObjectURL(file);

    try {
      const dimensions = await new Promise<{ width: number; height: number }>(
        (resolve, reject) => {
          const image = new Image();
          image.onload = () =>
            resolve({
              width: image.naturalWidth,
              height: image.naturalHeight,
            });
          image.onerror = () => reject(new Error("Invalid image"));
          image.src = objectUrl;
        }
      );

      if (
        !isLoginBackgroundAspectRatioAllowed(
          dimensions.width,
          dimensions.height
        )
      ) {
        toast.error(
          `รูปต้องเป็นอัตราส่วน 16:9 หรือใกล้เคียง แต่ไฟล์นี้มีขนาด ${dimensions.width}×${dimensions.height}px`
        );
        return;
      }

      if (
        dimensions.width < LOGIN_BACKGROUND_MIN_WIDTH ||
        dimensions.height < LOGIN_BACKGROUND_MIN_HEIGHT
      ) {
        toast.error(
          `ความละเอียดต่ำเกินไป (${dimensions.width}×${dimensions.height}px) กรุณาใช้รูปอย่างน้อย 1920×1080px`
        );
        return;
      }

      const imageUrl = await uploadAdminLoginBackground(
        file,
        (percentage) => setLoginBackgroundUploadProgress(percentage)
      );

      handleDraftChange("login_bg_image", imageUrl);
      toast.success(
        `อัปโหลด Background ต้นฉบับ ${dimensions.width}×${dimensions.height}px สำเร็จ กรุณากดบันทึกการตั้งค่าทั้งหมด`
      );
    } catch (error) {
      console.error("Login background upload error:", error);
      toast.error("อัปโหลด Background ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      URL.revokeObjectURL(objectUrl);
      setIsUploadingLoginBackground(false);
      setLoginBackgroundUploadProgress(0);
    }
  };

  const handleFileChange = (key: string, file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) {
        toast.error("ไม่สามารถอ่านไฟล์รูปภาพได้");
        return;
      }

      const img = new Image();
      img.onload = () => {
        const sourceWidth = img.naturalWidth;
        const sourceHeight = img.naturalHeight;

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        
        let MAX_WIDTH = 800;
        if (key.includes("site_logo")) {
          MAX_WIDTH = 600;
        }

        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;

        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL("image/webp", 0.9);
          handleDraftChange(key, compressedBase64);
          toast.success("เตรียมรูปภาพสำเร็จ (แปลงเป็น WebP 0.9 เรียบร้อย)");
        } else {
          handleDraftChange(key, dataUrl);
        }
      };

      img.onerror = () => handleDraftChange(key, dataUrl);

      img.src = dataUrl;
    };
    reader.onerror = () => {
      toast.error("เกิดข้อผิดพลาดในการอ่านไฟล์รูปภาพ");
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-[#0B0B0B]">ตั้งค่าเว็บไซต์</h3>
          <p className="text-sm text-[#6B7280]">ตั้งค่า logo และข้อมูลพื้นฐานของเว็บไซต์</p>
        </div>
        <div className="space-y-4 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-6">
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-[#0B0B0B]">
              Logo เว็บไซต์
            </Label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex h-16 w-32 items-center justify-center overflow-hidden rounded-lg bg-zinc-100 border border-[var(--theme-color)]/20">
                {drafts["site_logo_url"] ? (
                  <img
                    src={drafts["site_logo_url"]}
                    alt="Site Logo"
                    className="h-full w-full object-contain p-2"
                  />
                ) : (
                  <span className="text-center text-xs text-zinc-400">ยังไม่มี Logo</span>
                )}
              </div>
              <div className="flex gap-2">
                <Label
                  htmlFor="upload-site-logo"
                  className="cursor-pointer rounded-lg bg-[var(--theme-color)]/10 px-4 py-2 text-sm font-semibold text-[var(--theme-color)] hover:bg-[var(--theme-color)]/20"
                >
                  อัปโหลด Logo
                </Label>
                <input
                  id="upload-site-logo"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileChange("site_logo_url", file);
                  }}
                  className="hidden"
                  disabled={isPending || isSaving}
                />
                {drafts["site_logo_url"] && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleDraftChange("site_logo_url", "")}
                    className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                    disabled={isPending || isSaving}
                  >
                    ลบรูป
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="setting-site_title" className="text-sm text-[#0B0B0B]">
              Title Bar (ชื่อแท็บเบราว์เซอร์)
            </Label>
            <Input
              id="setting-site_title"
              type="text"
              value={drafts["site_title"] ?? ""}
              onChange={(e) => handleDraftChange("site_title", e.target.value)}
              placeholder="ระบุชื่อแท๊บ Browser"
              className="rounded-lg border-[var(--theme-color)]/30 bg-white focus-visible:ring-[var(--theme-color)]"
              disabled={isPending || isSaving}
            />
            <p className="text-xs text-[#6B7280]">
              แสดงผลที่ด้านบนสุดของเว็บเบราว์เซอร์
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="setting-site_name" className="text-sm text-[#0B0B0B]">
              ชื่อร้าน (Shop Name)
            </Label>
            <Input
              id="setting-site_name"
              type="text"
              value={drafts["site_name"] ?? ""}
              onChange={(e) => handleDraftChange("site_name", e.target.value)}
              placeholder="ระบุชื่อร้าน"
              className="rounded-lg border-[var(--theme-color)]/30 bg-white focus-visible:ring-[var(--theme-color)]"
              disabled={isPending || isSaving}
            />
            <p className="text-xs text-[#6B7280]">
              แสดงผลข้างๆ โลโก้ในแถบเมนู (Navbar)
            </p>
          </div>

          <Separator className="bg-[#E5E7EB]/60 my-4" />

          <div className="space-y-4 pt-2">
            <div className="flex flex-col gap-3 rounded-lg border border-dashed border-[var(--theme-color)]/40 bg-white/70 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <Label htmlFor="home_shortcuts_enabled" className="text-sm font-semibold text-[#0B0B0B]">
                  แสดงปุ่มลัด (Shortcut Buttons) หน้าแรก
                </Label>
                <p className="text-xs text-[#6B7280]">
                  เปิด/ปิด การแสดงปุ่มลัด 4 ปุ่มใต้แถบประกาศหน้าแรก
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="home_shortcuts_enabled"
                  checked={shortcutsEnabled}
                  onCheckedChange={(checked) =>
                    handleDraftChange("home_shortcuts_enabled", checked ? "true" : "false")
                  }
                  disabled={isPending || isSaving}
                />
                <span className="text-sm text-[#6B7280]">{shortcutsEnabled ? "เปิด" : "ปิด"}</span>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-semibold text-[#0B0B0B]">ตั้งค่าปุ่มลัดทั้ง 4 ปุ่ม (ขนาดแนะนำ 480x200px)</Label>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[1, 2, 3, 4].map((num) => {
                  const imgKey = `home_shortcut_image_${num}`;
                  const linkKey = `home_shortcut_link_${num}`;
                  const imgBase64 = drafts[imgKey] ?? "";
                  const linkValue = drafts[linkKey] ?? "";

                  return (
                    <div key={num} className="space-y-3 rounded-xl border border-[var(--theme-color)]/20 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[var(--theme-color)]">ปุ่มลัดที่ {num}</span>
                        {imgBase64 && (
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => handleDraftChange(imgKey, "")}
                            className="h-6 px-2 text-red-500 hover:text-red-700 hover:bg-red-50 text-xs"
                            disabled={isPending || isSaving}
                          >
                            ลบรูป
                          </Button>
                        )}
                      </div>

                      {/* Preview Box */}
                      <div className="relative aspect-[480/200] w-full overflow-hidden rounded-lg bg-zinc-50 border border-[var(--theme-color)]/10 flex items-center justify-center">
                        {imgBase64 ? (
                          <img
                            src={imgBase64}
                            alt={`Shortcut Preview ${num}`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-center text-xs text-zinc-400">ยังไม่มีรูปภาพ (แนะนำ 480x200px)</span>
                        )}
                      </div>

                      {/* File Input & Link Input */}
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Label
                            htmlFor={`shortcut-file-${num}`}
                            className="flex h-9 cursor-pointer items-center justify-center rounded-lg bg-[var(--theme-color)]/10 px-3 text-center text-xs font-semibold text-[var(--theme-color)] transition hover:bg-[var(--theme-color)]/20 shrink-0"
                          >
                            อัปโหลดรูป
                          </Label>
                          <input
                            id={`shortcut-file-${num}`}
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileChange(imgKey, file);
                            }}
                            className="hidden"
                            disabled={isPending || isSaving}
                          />
                          <Input
                            type="text"
                            value={imgBase64?.startsWith('http') ? imgBase64 : (imgBase64 ? '(ไฟล์อัปโหลด)' : '')}
                            onChange={(e) => handleDraftChange(imgKey, e.target.value)}
                            placeholder="หรือใส่ลิงก์รูป (URL)"
                            className="h-9 text-xs rounded-lg border-[var(--theme-color)]/30 bg-white focus-visible:ring-[var(--theme-color)]"
                            disabled={isPending || isSaving}
                          />
                        </div>
                        <Input
                          type="text"
                          value={linkValue}
                          onChange={(e) => handleDraftChange(linkKey, e.target.value)}
                          placeholder="ใส่ลิงก์ปลายทางเมื่อคลิกรูป (เช่น /products)"
                          className="h-9 text-xs rounded-lg border-[var(--theme-color)]/30 bg-white focus-visible:ring-[var(--theme-color)]"
                          disabled={isPending || isSaving}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Separator className="bg-[#E5E7EB]" />

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-[#0B0B0B]">สีธีมหลัก (Theme Color)</h3>
          <p className="text-sm text-[#6B7280]">ปรับแต่งสีหลักของเว็บไซต์</p>
        </div>
        <div className="space-y-6 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="theme_color" className="text-sm text-[#0B0B0B]">
                สีหลักของเว็บไซต์ (ปุ่ม, ไอคอน, ลิงก์เน้นย้ำ)
              </Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  id="theme_color_picker"
                  value={drafts["theme_color"] || "#ff985c"}
                  onChange={(e) => handleDraftChange("theme_color", e.target.value)}
                  className="h-10 w-10 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                  disabled={isPending || isSaving}
                />
                <Input
                  type="text"
                  id="theme_color"
                  value={drafts["theme_color"] || "#ff985c"}
                  onChange={(e) => handleDraftChange("theme_color", e.target.value)}
                  placeholder="#ff985c"
                  className="w-32 rounded-lg border-[var(--theme-color)]/30 bg-white uppercase focus-visible:ring-[var(--theme-color)]"
                  disabled={isPending || isSaving}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="theme_color_nav" className="text-sm text-[#0B0B0B]">
                สีพื้นหลังแถบเมนู (Navbar ด้านบนสุด)
              </Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  id="theme_color_nav_picker"
                  value={drafts["theme_color_nav"] || "#e79940"}
                  onChange={(e) => handleDraftChange("theme_color_nav", e.target.value)}
                  className="h-10 w-10 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                  disabled={isPending || isSaving}
                />
                <Input
                  type="text"
                  id="theme_color_nav"
                  value={drafts["theme_color_nav"] || "#e79940"}
                  onChange={(e) => handleDraftChange("theme_color_nav", e.target.value)}
                  placeholder="#e79940"
                  className="w-32 rounded-lg border-[var(--theme-color)]/30 bg-white uppercase focus-visible:ring-[var(--theme-color)]"
                  disabled={isPending || isSaving}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="theme_color_bg_top" className="text-sm text-[#0B0B0B]">
                สีพื้นหลังส่วนบน (พื้นที่ใต้ Navbar ถึงใต้แบนเนอร์)
              </Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  id="theme_color_bg_top_picker"
                  value={drafts["theme_color_bg_top"] || "#F5DDC2"}
                  onChange={(e) => handleDraftChange("theme_color_bg_top", e.target.value)}
                  className="h-10 w-10 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                  disabled={isPending || isSaving}
                />
                <Input
                  type="text"
                  id="theme_color_bg_top"
                  value={drafts["theme_color_bg_top"] || "#F5DDC2"}
                  onChange={(e) => handleDraftChange("theme_color_bg_top", e.target.value)}
                  placeholder="#F5DDC2"
                  className="w-32 rounded-lg border-[var(--theme-color)]/30 bg-white uppercase focus-visible:ring-[var(--theme-color)]"
                  disabled={isPending || isSaving}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="theme_color_bg_bottom" className="text-sm text-[#0B0B0B]">
                สีพื้นหลังส่วนล่าง (พื้นที่แสดงรายการสินค้าทั้งหมด)
              </Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  id="theme_color_bg_bottom_picker"
                  value={drafts["theme_color_bg_bottom"] || "#F7C58D"}
                  onChange={(e) => handleDraftChange("theme_color_bg_bottom", e.target.value)}
                  className="h-10 w-10 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                  disabled={isPending || isSaving}
                />
                <Input
                  type="text"
                  id="theme_color_bg_bottom"
                  value={drafts["theme_color_bg_bottom"] || "#F7C58D"}
                  onChange={(e) => handleDraftChange("theme_color_bg_bottom", e.target.value)}
                  placeholder="#F7C58D"
                  className="w-32 rounded-lg border-[var(--theme-color)]/30 bg-white uppercase focus-visible:ring-[var(--theme-color)]"
                  disabled={isPending || isSaving}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="theme_color_header_bg" className="text-sm text-[#0B0B0B]">
                สีพื้นหลังเว็บเพจ (แถบด้านหลังสุด หรือขอบจอ)
              </Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  id="theme_color_header_bg_picker"
                  value={drafts["theme_color_header_bg"] || "#ffffff"}
                  onChange={(e) => handleDraftChange("theme_color_header_bg", e.target.value)}
                  className="h-10 w-10 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                  disabled={isPending || isSaving}
                />
                <Input
                  type="text"
                  id="theme_color_header_bg"
                  value={drafts["theme_color_header_bg"] || "#ffffff"}
                  onChange={(e) => handleDraftChange("theme_color_header_bg", e.target.value)}
                  placeholder="#ffffff"
                  className="w-32 rounded-lg border-[var(--theme-color)]/30 bg-white uppercase focus-visible:ring-[var(--theme-color)]"
                  disabled={isPending || isSaving}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="theme_color_announcement" className="text-sm text-[#0B0B0B]">
                สีพื้นหลังแถบประกาศ (Announcement Bar บนสุด)
              </Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  id="theme_color_announcement_picker"
                  value={drafts["theme_color_announcement"] || "#ff985c"}
                  onChange={(e) => handleDraftChange("theme_color_announcement", e.target.value)}
                  className="h-10 w-10 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                  disabled={isPending || isSaving}
                />
                <Input
                  type="text"
                  id="theme_color_announcement"
                  value={drafts["theme_color_announcement"] || "#ff985c"}
                  onChange={(e) => handleDraftChange("theme_color_announcement", e.target.value)}
                  placeholder="#ff985c"
                  disabled={isPending || isSaving}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="theme_color_text_accent" className="text-sm text-[#0B0B0B]">
                สีตัวอักษรเน้นย้ำ (หัวข้อสถิติ, จำนวนสินค้า, ป้ายกำกับ)
              </Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  id="theme_color_text_accent_picker"
                  value={drafts["theme_color_text_accent"] || "#D94654"}
                  onChange={(e) => handleDraftChange("theme_color_text_accent", e.target.value)}
                  className="h-10 w-10 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                  disabled={isPending || isSaving}
                />
                <Input
                  type="text"
                  id="theme_color_text_accent"
                  value={drafts["theme_color_text_accent"] || "#D94654"}
                  onChange={(e) => handleDraftChange("theme_color_text_accent", e.target.value)}
                  placeholder="#D94654"
                  className="w-32 rounded-lg border-[var(--theme-color)]/30 bg-white uppercase focus-visible:ring-[var(--theme-color)]"
                  disabled={isPending || isSaving}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="theme_color_text_main" className="text-sm text-[#0B0B0B]">
                สีตัวอักษรทั่วไป (ข้อความปกติในเว็บ)
              </Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  id="theme_color_text_main_picker"
                  value={drafts["theme_color_text_main"] || "#9a5832"}
                  onChange={(e) => handleDraftChange("theme_color_text_main", e.target.value)}
                  className="h-10 w-10 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                  disabled={isPending || isSaving}
                />
                <Input
                  type="text"
                  id="theme_color_text_main"
                  value={drafts["theme_color_text_main"] || "#9a5832"}
                  onChange={(e) => handleDraftChange("theme_color_text_main", e.target.value)}
                  placeholder="#9a5832"
                  className="w-32 rounded-lg border-[var(--theme-color)]/30 bg-white uppercase focus-visible:ring-[var(--theme-color)]"
                  disabled={isPending || isSaving}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <Separator className="bg-[#E5E7EB]" />

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-[#0B0B0B]">โปสเตอร์หน้าแรก</h3>
          <p className="text-sm text-[#6B7280]">ตั้งค่าแบนเนอร์รูปภาพที่จะขึ้นใต้ Navbar ในหน้าแรก</p>
        </div>
        <div className="space-y-5 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-6">
          <div className="flex flex-col gap-3 rounded-lg border border-dashed border-[var(--theme-color)]/40 bg-white/70 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <Label htmlFor="home_poster_enabled" className="text-sm text-[#0B0B0B]">
                แสดงโปสเตอร์หน้าแรก
              </Label>
              <p className="text-xs text-[#6B7280]">
                เปิด/ปิดการแสดงโปสเตอร์รูปภาพใต้ Navbar (แนะนำใส่รูปขนาด 1600x900px)
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="home_poster_enabled"
                checked={posterEnabled}
                onCheckedChange={(checked) =>
                  handleDraftChange("home_poster_enabled", checked ? "true" : "false")
                }
                disabled={isPending || isSaving}
              />
              <span className="text-sm text-[#6B7280]">{posterEnabled ? "เปิด" : "ปิด"}</span>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-semibold text-[#0B0B0B]">
              รูปโปสเตอร์
            </Label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex aspect-[16/9] w-48 items-center justify-center overflow-hidden rounded-lg bg-zinc-100 border border-[var(--theme-color)]/20">
                {drafts["home_poster_image_url"] ? (
                  <img
                    src={drafts["home_poster_image_url"]}
                    alt="Home Poster"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-center text-xs text-zinc-400">ยังไม่มีรูปภาพ</span>
                )}
              </div>
              <div className="flex flex-col gap-2 w-full max-w-sm">
                <Label
                  htmlFor="upload-home-poster"
                  className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-[var(--theme-color)]/10 px-4 py-2 text-sm font-semibold text-[var(--theme-color)] hover:bg-[var(--theme-color)]/20"
                >
                  อัปโหลดโปสเตอร์
                </Label>
                <input
                  id="upload-home-poster"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileChange("home_poster_image_url", file);
                  }}
                  className="hidden"
                  disabled={isPending || isSaving}
                />
                <div className="flex items-center gap-2 my-1">
                   <div className="flex-1 border-t border-zinc-200"></div>
                   <span className="text-xs text-zinc-400">หรือ (แนะนำ)</span>
                   <div className="flex-1 border-t border-zinc-200"></div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-[#0B0B0B]">วางลิงก์รูปภาพจากเว็บฝากรูป</Label>
                  <Input 
                    type="url"
                    placeholder="https://..."
                    value={drafts["home_poster_image_url"]?.startsWith("data:image") ? "" : drafts["home_poster_image_url"] || ""}
                    onChange={(e) => handleDraftChange("home_poster_image_url", e.target.value)}
                    className="h-9 text-xs"
                    disabled={isPending || isSaving}
                  />
                </div>
                {drafts["home_poster_image_url"] && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleDraftChange("home_poster_image_url", "")}
                    className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 w-full mt-2"
                    disabled={isPending || isSaving}
                  >
                    ลบรูป
                  </Button>
                )}
              </div>
            </div>
            <p className="text-xs text-[#6B7280] mt-1">
              อัปโหลดรูปภาพจากอุปกรณ์ ความละเอียดแนะนำ 16:9 (เช่น 1600x900px)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="home_poster_link_url" className="text-sm text-[#0B0B0B]">
              ลิงก์เมื่อคลิกโปสเตอร์ (ไม่บังคับ)
            </Label>
            <Input
              id="home_poster_link_url"
              type="url"
              value={drafts["home_poster_link_url"] ?? ""}
              onChange={(e) => handleDraftChange("home_poster_link_url", e.target.value)}
              placeholder="https://line.me/ti/p/~username"
              className="rounded-lg border-[var(--theme-color)]/30 bg-white focus-visible:ring-[var(--theme-color)]"
              disabled={isPending || isSaving}
            />
            <p className="text-xs text-[#6B7280]">
              หากกรอกลิงก์ ลูกค้าจะถูกพาไปยัง URL นั้นเมื่อคลิกโปสเตอร์ (เปิดแท็บใหม่)
            </p>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-dashed border-[var(--theme-color)]/40 bg-white/70 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <Label htmlFor="home_youtube_enabled" className="text-sm text-[#0B0B0B]">
                แสดงวิดีโอแนะนำหน้าแรก
              </Label>
              <p className="text-xs text-[#6B7280]">
                เปิด/ปิดการแสดงวิดีโอ YouTube ในหน้าแรก
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="home_youtube_enabled"
                checked={youtubeEnabled}
                onCheckedChange={(checked) =>
                  handleDraftChange("home_youtube_enabled", checked ? "true" : "false")
                }
                disabled={isPending || isSaving}
              />
              <span className="text-sm text-[#6B7280]">{youtubeEnabled ? "เปิด" : "ปิด"}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="home_youtube_url" className="text-sm text-[#0B0B0B]">
              YouTube Video URL
            </Label>
            <Input
              id="home_youtube_url"
              type="url"
              value={drafts["home_youtube_url"] ?? ""}
              onChange={(e) => handleDraftChange("home_youtube_url", e.target.value)}
              placeholder="https://www.youtube.com/watch?v=xxxxxx หรือ https://youtu.be/xxxxxx"
              className="rounded-lg border-[var(--theme-color)]/30 bg-white focus-visible:ring-[var(--theme-color)]"
              disabled={isPending || isSaving}
            />
            <p className="text-xs text-[#6B7280]">
              หากใส่ลิงก์ หน้าแรกจะแทรกวิดีโอจาก YouTube อัตโนมัติ (ข้ามหรือเว้นว่างเพื่อใช้หน้าจอปกติ)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="home_youtube_title" className="text-sm text-[#0B0B0B]">
              ชื่อคลิปวิดีโอ (จะแสดงใต้คลิปในหน้าแรก)
            </Label>
            <Input
              id="home_youtube_title"
              type="text"
              value={drafts["home_youtube_title"] ?? ""}
              onChange={(e) => handleDraftChange("home_youtube_title", e.target.value)}
              placeholder="เช่น ตัวอย่างหนังเรื่องธี่หยด 2"
              className="rounded-lg border-[var(--theme-color)]/30 bg-white focus-visible:ring-[var(--theme-color)]"
              disabled={isPending || isSaving}
            />
          </div>
        </div>
      </div>

      <Separator className="bg-[#E5E7EB]" />

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-[#0B0B0B]">พื้นหลังหน้าเข้าสู่ระบบ (Login Background)</h3>
          <p className="text-sm text-[#6B7280]">ตั้งค่ารูปภาพพื้นหลังสำหรับหน้า Login (อัตราส่วน 16:9)</p>
        </div>
        <div className="space-y-5 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-6">
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-[#0B0B0B]">
              รูปภาพพื้นหลัง
            </Label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex aspect-[16/9] w-48 items-center justify-center overflow-hidden rounded-lg bg-zinc-100 border border-[var(--theme-color)]/20">
                {drafts["login_bg_image"] ? (
                  <img
                    src={drafts["login_bg_image"]}
                    alt="Login Background"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-center text-xs text-zinc-400">ยังไม่มีรูปภาพ</span>
                )}
              </div>
              <div className="flex flex-col gap-2 w-full max-w-sm">
                <Label
                  htmlFor="upload-login-bg"
                  className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-[var(--theme-color)]/10 px-4 py-2 text-sm font-semibold text-[var(--theme-color)] hover:bg-[var(--theme-color)]/20"
                >
                  {isUploadingLoginBackground
                    ? `กำลังอัปโหลด ${loginBackgroundUploadProgress}%`
                    : "อัปโหลดพื้นหลัง"}
                </Label>
                <input
                  id="upload-login-bg"
                  type="file"
                  accept=".jpg,.jpeg,.jpe,.jfif,.pjpeg,.pjp,.png,.webp,.avif,.gif,.bmp,image/jpeg,image/png,image/webp,image/avif,image/gif,image/bmp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleLoginBackgroundUpload(file);
                    e.currentTarget.value = "";
                  }}
                  className="hidden"
                  disabled={isPending || isSaving || isUploadingLoginBackground}
                />
                <div className="flex items-center gap-2 my-1">
                   <div className="flex-1 border-t border-zinc-200"></div>
                   <span className="text-xs text-zinc-400">หรือ (แนะนำ)</span>
                   <div className="flex-1 border-t border-zinc-200"></div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-[#0B0B0B]">วางลิงก์รูปภาพจากเว็บฝากรูป</Label>
                  <Input 
                    type="url"
                    placeholder="https://..."
                    value={drafts["login_bg_image"]?.startsWith("data:image") ? "" : drafts["login_bg_image"] || ""}
                    onChange={(e) => handleDraftChange("login_bg_image", e.target.value)}
                    className="h-9 text-xs"
                    disabled={isPending || isSaving || isUploadingLoginBackground}
                  />
                </div>
                {drafts["login_bg_image"] && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleDraftChange("login_bg_image", "")}
                    className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 w-full mt-2"
                    disabled={isPending || isSaving || isUploadingLoginBackground}
                  >
                    ลบรูป
                  </Button>
                )}
              </div>
            </div>
            <p className="text-xs text-[#6B7280] mt-1">
              ใช้ภาพอัตราส่วน 16:9 หรือใกล้เคียงไม่เกิน 2% ความละเอียดอย่างน้อย 1920×1080px
              ขนาดไม่เกิน 16 MB รองรับ JPG, JPEG, JPE, JFIF, PJPEG, PJP, PNG, WebP, AVIF, GIF และ BMP
              โดยระบบจะเก็บไฟล์ต้นฉบับ ไม่ย่อหรือบีบอัดซ้ำ
            </p>
          </div>
        </div>
      </div>

      <Separator className="bg-[#E5E7EB]" />

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-[#0B0B0B]">แนะนำหนังใหม่</h3>
          <p className="text-sm text-[#6B7280]">ตั้งค่าการ์ดโชว์โปสเตอร์หนังใหม่ 6 การ์ดในหน้าแรก (ไม่จำกัดสัดส่วน สามารถใช้ลิงก์รูปได้)</p>
        </div>
        <div className="space-y-5 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-6">
          <div className="flex flex-col gap-3 rounded-lg border border-dashed border-[var(--theme-color)]/40 bg-white/70 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <Label htmlFor="home_movies_enabled" className="text-sm text-[#0B0B0B]">
                แสดงส่วนภาพยนตร์แนะนำหน้าแรก
              </Label>
              <p className="text-xs text-[#6B7280]">
                เปิด/ปิดการแสดงแถบโปสเตอร์หนังใหม่ 6 ช่อง
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="home_movies_enabled"
                checked={moviesEnabled}
                onCheckedChange={(checked) =>
                  handleDraftChange("home_movies_enabled", checked ? "true" : "false")
                }
                disabled={isPending || isSaving}
              />
              <span className="text-sm text-[#6B7280]">{moviesEnabled ? "เปิด" : "ปิด"}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            {[1, 2, 3, 4, 5, 6].map((num) => {
              const key = `home_movie_poster_${num}`;
              const posterBase64 = drafts[key] ?? "";
              return (
                <div key={key} className="flex flex-col items-center gap-2 rounded-xl border border-[var(--theme-color)]/20 bg-white p-3 shadow-sm">
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-semibold text-[var(--theme-color)]">ช่องที่ {num}</span>
                    {posterBase64 && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => handleDraftChange(key, "")}
                        className="h-6 px-2 text-red-500 hover:text-red-700 hover:bg-red-50 text-xs"
                        disabled={isPending || isSaving}
                      >
                        ลบรูป
                      </Button>
                    )}
                  </div>
                  
                  <div className="relative flex w-full items-center justify-center overflow-hidden rounded-lg bg-zinc-50 border border-[var(--theme-color)]/10" style={{ minHeight: '120px' }}>
                    {posterBase64 ? (
                      <img
                        src={posterBase64}
                        alt={`Movie Poster ${num}`}
                        className="h-full w-full object-contain max-h-[200px]"
                      />
                    ) : (
                      <span className="text-center text-xs text-zinc-400 px-2">ยังไม่มีรูปภาพ</span>
                    )}
                  </div>

                  <div className="flex w-full flex-col gap-2 mt-1">
                    <Label
                      htmlFor={`file-upload-movie-${num}`}
                      className="flex cursor-pointer items-center justify-center rounded-lg bg-[var(--theme-color)]/10 px-3 py-1.5 text-center text-xs font-semibold text-[var(--theme-color)] transition hover:bg-[var(--theme-color)]/20"
                    >
                      อัปโหลดรูป
                    </Label>
                    <input
                      id={`file-upload-movie-${num}`}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileChange(key, file);
                      }}
                      className="hidden"
                      disabled={isPending || isSaving}
                    />
                    <Input
                      type="text"
                      value={posterBase64?.startsWith('http') ? posterBase64 : (posterBase64 ? '(ไฟล์อัปโหลด)' : '')}
                      onChange={(e) => handleDraftChange(key, e.target.value)}
                      placeholder="หรือใส่ลิงก์รูป (URL)"
                      className="h-8 text-xs rounded-lg border-[var(--theme-color)]/30 bg-white focus-visible:ring-[var(--theme-color)]"
                      disabled={isPending || isSaving}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Separator className="bg-[#E5E7EB]" />

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-[#0B0B0B]">สินค้าขายดี</h3>
          <p className="text-sm text-[#6B7280]">ตั้งค่าการแสดงส่วนแนะนำสินค้าขายดีในหน้าแรก</p>
        </div>
        <div className="space-y-4 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-6">
          <div className="flex flex-col gap-3 rounded-lg border border-dashed border-[var(--theme-color)]/40 bg-white/70 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <Label htmlFor="home_featured_enabled" className="text-sm text-[#0B0B0B]">
                แสดงสินค้าขายดีและน่าสนใจ
              </Label>
              <p className="text-xs text-[#6B7280]">
                เปิด/ปิดการแสดงแถบ "สินค้าแนะนำสำหรับคุณ / สินค้าขายดีและน่าสนใจ" ในหน้าแรก
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="home_featured_enabled"
                checked={featuredEnabled}
                onCheckedChange={(checked) =>
                  handleDraftChange("home_featured_enabled", checked ? "true" : "false")
                }
                disabled={isPending || isSaving}
              />
              <span className="text-sm text-[#6B7280]">{featuredEnabled ? "เปิด" : "ปิด"}</span>
            </div>
          </div>
        </div>
      </div>

      <Separator className="bg-[#E5E7EB]" />

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-[#0B0B0B]">แถบประกาศ</h3>
          <p className="text-sm text-[#6B7280]">ตั้งค่าข้อความประกาศที่แสดงใต้ navbar</p>
        </div>
        <div className="space-y-4 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-6">

          <div className="space-y-2">
            <Label htmlFor="announcement_enabled" className="text-sm text-[#0B0B0B]">
              แสดงแถบประกาศ
            </Label>
            <div className="flex items-center gap-3">
              <Switch
                id="announcement_enabled"
                checked={announcementEnabled}
                onCheckedChange={(checked) => {
                  handleDraftChange("announcement_enabled", checked ? "true" : "false");
                }}
                disabled={isPending || isSaving}
              />
              <span className="text-sm text-[#6B7280]">
                {announcementEnabled ? "เปิดใช้งาน" : "ปิดใช้งาน"}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="announcement_text" className="text-sm text-[#0B0B0B]">
              ข้อความประกาศ
            </Label>
            <Textarea
              id="announcement_text"
              value={announcementText}
              onChange={(e) => handleDraftChange("announcement_text", e.target.value)}
              placeholder="ใส่ประกาศที่ต้องการแสดง"
              className="min-h-[100px] rounded-lg border-[var(--theme-color)]/30 bg-white focus-visible:ring-[var(--theme-color)]"
              disabled={isPending || isSaving}
            />
            <p className="text-xs text-[#6B7280]">
              รองรับ emoji และข้อความยาว สามารถเว้นบรรทัดได้
            </p>
          </div>
        </div>
      </div>

      <Separator className="bg-[#E5E7EB]" />

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-[#0B0B0B]">การเชื่อมต่อเว็บหลัก (Master API)</h3>
          <p className="text-sm text-[#6B7280]">ตั้งค่าการเชื่อมต่อกับเว็บแม่เพื่อดึงข้อมูลสินค้าและอัปเดตสต๊อกอัตโนมัติ</p>
        </div>
        <div className="space-y-4 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm font-medium text-[#6B7280]">พ้อยท์คงเหลือบนเว็บแม่ (Master Balance)</p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-[#0B0B0B]">
                  {isLoadingBalance ? "กำลังโหลด..." : tenantBalance !== null ? tenantBalance.toLocaleString("th-TH", { minimumFractionDigits: 2 }) : "0.00"}
                </span>
                <span className="text-sm text-[#6B7280]">บาท</span>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="setting-master_url" className="text-sm text-[#0B0B0B]">
              Master Domain URL (เว็ปแม่)
            </Label>
            <Input
              id="setting-master_url"
              type="url"
              value={drafts["MASTER_DOMAIN_URL"] ?? ""}
              onChange={(e) => handleDraftChange("MASTER_DOMAIN_URL", e.target.value)}
              placeholder="https://master-website.com"
              className="rounded-lg border-[var(--theme-color)]/30 bg-white focus-visible:ring-[var(--theme-color)]"
              disabled={isPending || isSaving}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="setting-master_api" className="text-sm text-[#0B0B0B]">
              Master API Key
            </Label>
            <Input
              id="setting-master_api"
              type="text"
              value={drafts["MASTER_API_KEY"] ?? ""}
              onChange={(e) => handleDraftChange("MASTER_API_KEY", e.target.value)}
              placeholder="your-api-key"
              className="rounded-lg border-[var(--theme-color)]/30 bg-white focus-visible:ring-[var(--theme-color)]"
              disabled={isPending || isSaving}
            />
          </div>
          
          <div className="pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={isPending || isSaving}
              className="border-[var(--theme-color)]/50 text-[var(--theme-color)] hover:bg-[var(--theme-color)]/10"
              onClick={async () => {
                const url = drafts["MASTER_DOMAIN_URL"];
                const key = drafts["MASTER_API_KEY"];
                if (!url || !key) {
                  toast.error("กรุณากรอก URL และ API Key ก่อนทดสอบ");
                  return;
                }
                try {
                  const res = await testMasterConnection(url, key);
                  if (res.success) {
                    toast.success("เชื่อมต่อสำเร็จ! (Connection Successful)");
                    // Fetch balance again on successful test
                    setIsLoadingBalance(true);
                    const balRes = await getTenantBalance(url, key);
                    if (balRes.success) setTenantBalance(balRes.balance);
                    setIsLoadingBalance(false);
                  } else {
                    toast.error(`ล้มเหลว: ${res.error}`);
                  }
                } catch (e: any) {
                  toast.error("เกิดข้อผิดพลาดในการทดสอบเชื่อมต่อ");
                }
              }}
            >
              ทดสอบการเชื่อมต่อ (Test Connection)
            </Button>
          </div>
        </div>
      </div>

      <Separator className="bg-[#E5E7EB]" />

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-[#0B0B0B]">การตั้งค่าระบบสมัครสมาชิก</h3>
          <p className="text-sm text-[#6B7280]">เปิด/ปิดระบบสมัครสมาชิกใหม่</p>
        </div>
        <div className="space-y-4 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-6">
          <div className="flex flex-col gap-3 rounded-lg border border-dashed border-[var(--theme-color)]/40 bg-white/70 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <Label htmlFor="registration_enabled" className="text-sm text-[#0B0B0B]">
                เปิดใช้งานระบบสมัครสมาชิก
              </Label>
              <p className="text-xs text-[#6B7280]">
                เมื่อปิดการใช้งาน ผู้ใช้จะไม่สามารถสมัครสมาชิกใหม่ได้
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="registration_enabled"
                checked={registrationEnabled}
                onCheckedChange={(checked) =>
                  handleDraftChange("registration_enabled", checked ? "true" : "false")
                }
                disabled={isPending || isSaving}
              />
              <span className="text-sm text-[#6B7280]">{registrationEnabled ? "เปิด" : "ปิด"}</span>
            </div>
          </div>
        </div>
      </div>

      <Separator className="bg-[#E5E7EB]" />

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-[#0B0B0B]">การตั้งค่าติดต่อแอดมิน</h3>
          <p className="text-sm text-[#6B7280]">ตั้งค่าลิงก์สำหรับปุ่มติดต่อแอดมิน (Sticky Icon)</p>
        </div>
        <div className="space-y-4 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-6">
          <div className="space-y-2">
            <Label htmlFor="setting-admin_contact_url" className="text-sm text-[#0B0B0B]">
              ลิงก์ติดต่อแอดมิน
            </Label>
            <Input
              id="setting-admin_contact_url"
              type="url"
              value={drafts["admin_contact_url"] ?? ""}
              onChange={(e) => handleDraftChange("admin_contact_url", e.target.value)}
              placeholder="https://line.me/ti/p/~username หรือ https://m.me/username"
              className="rounded-lg border-[var(--theme-color)]/30 bg-white focus-visible:ring-[var(--theme-color)]"
              disabled={isPending || isSaving}
            />
            <p className="text-xs text-[#6B7280]">
              ใส่ URL สำหรับติดต่อแอดมิน (เช่น LINE, Facebook Messenger, Discord) หรือเว้นว่างเพื่อซ่อนปุ่ม
            </p>
          </div>
        </div>
      </div>

      <Separator className="bg-[#E5E7EB]" />

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-[#0B0B0B]">การตั้งค่า Slip2Go API</h3>
          <p className="text-sm text-[#6B7280]">ตั้งค่า API สำหรับตรวจสอบสลิปโอนเงินแบบอัปโหลดรูปภาพ</p>
        </div>
        <div className="space-y-4 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-6">
          <div className="space-y-2">
            <Label htmlFor="setting-slip2go_api_endpoint" className="text-sm text-[#0B0B0B]">
              API Endpoint
            </Label>
            <Input
              id="setting-slip2go_api_endpoint"
              type="text"
              value={drafts["slip2go_api_endpoint"] ?? ""}
              onChange={(e) => handleDraftChange("slip2go_api_endpoint", e.target.value)}
              placeholder="https://connect.slip2go.com/api/verify-slip/qr-image/info"
              className="rounded-xl border-[var(--theme-color)]/30 bg-white focus-visible:ring-[var(--theme-color)]"
              disabled={isPending || isSaving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="setting-slip2go_api_secret" className="text-sm text-[#0B0B0B]">
              API Secret Key <span className="ml-2 text-xs text-[#6B7280]">(จะไม่แสดงค่าปัจจุบัน)</span>
            </Label>
            <Input
              id="setting-slip2go_api_secret"
              type="password"
              value={drafts["slip2go_api_secret"] ?? ""}
              onChange={(e) => handleDraftChange("slip2go_api_secret", e.target.value)}
              placeholder="Secret Key จาก Slip2Go"
              className="rounded-xl border-[var(--theme-color)]/30 bg-white focus-visible:ring-[var(--theme-color)]"
              disabled={isPending || isSaving}
            />
          </div>
        </div>
      </div>

      <Separator className="bg-[#E5E7EB]" />

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-[#0B0B0B]">ข้อมูลบัญชีธนาคาร</h3>
          <p className="text-sm text-[#6B7280]">ตั้งค่าข้อมูลบัญชีธนาคารสำหรับรับเงินโอน</p>
        </div>
        <div className="space-y-4 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-6">
          <div className="space-y-2">
            <Label htmlFor="setting-bank_name" className="text-sm text-[#0B0B0B]">ชื่อธนาคาร</Label>
            <Input
              id="setting-bank_name"
              type="text"
              value={drafts["bank_name"] ?? ""}
              onChange={(e) => handleDraftChange("bank_name", e.target.value)}
              placeholder="เช่น กสิกรไทย (KBank)"
              className="rounded-xl border-[var(--theme-color)]/30 bg-white focus-visible:ring-[var(--theme-color)]"
              disabled={isPending || isSaving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="setting-bank_account_no" className="text-sm text-[#0B0B0B]">เลขที่บัญชี</Label>
            <Input
              id="setting-bank_account_no"
              type="text"
              value={drafts["bank_account_no"] ?? ""}
              onChange={(e) => handleDraftChange("bank_account_no", e.target.value)}
              placeholder="เช่น 123-4-56789-0"
              className="rounded-xl border-[var(--theme-color)]/30 bg-white focus-visible:ring-[var(--theme-color)]"
              disabled={isPending || isSaving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="setting-bank_account_name" className="text-sm text-[#0B0B0B]">ชื่อบัญชี</Label>
            <Input
              id="setting-bank_account_name"
              type="text"
              value={drafts["bank_account_name"] ?? ""}
              onChange={(e) => handleDraftChange("bank_account_name", e.target.value)}
              placeholder="เช่น นาย ใจดี มีตังค์"
              className="rounded-xl border-[var(--theme-color)]/30 bg-white focus-visible:ring-[var(--theme-color)]"
              disabled={isPending || isSaving}
            />
          </div>
        </div>
      </div>

      <Separator className="bg-[#E5E7EB]" />

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-[#0B0B0B]">การตั้งค่าการเติมเงิน</h3>
          <p className="text-sm text-[#6B7280]">ตั้งค่าบัญชีผู้รับเงินและจำนวนเงินขั้นต่ำ</p>
        </div>
        <div className="space-y-4 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-6">
          <div className="space-y-2">
            <Label htmlFor="setting-minimum_topup" className="text-sm text-[#0B0B0B]">จำนวนเงินเติมขั้นต่ำ (บาท)</Label>
            <Input
              id="setting-minimum_topup"
              type="number"
              value={drafts["minimum_topup"] ?? ""}
              onChange={(e) => handleDraftChange("minimum_topup", e.target.value)}
              placeholder="เช่น 50"
              className="rounded-xl border-[var(--theme-color)]/30 bg-white focus-visible:ring-[var(--theme-color)]"
              disabled={isPending || isSaving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="setting-expected_receiver" className="text-sm text-[#0B0B0B]">ชื่อผู้รับเงินในสลิป (ตรวจสอบความถูกต้องของสลิป)</Label>
            <Input
              id="setting-expected_receiver"
              type="text"
              value={drafts["expected_receiver"] ?? ""}
              onChange={(e) => handleDraftChange("expected_receiver", e.target.value)}
              placeholder="เช่น นาย ใจดี มีตังค์"
              className="rounded-xl border-[var(--theme-color)]/30 bg-white focus-visible:ring-[var(--theme-color)]"
              disabled={isPending || isSaving}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleSaveAll}
          disabled={isPending || isSaving || isUploadingLoginBackground}
          className="rounded-lg bg-[var(--theme-color)] text-white hover:bg-[var(--theme-color)] hover:text-white"
        >
          {isSaving ? "กำลังบันทึก..." : "บันทึกการตั้งค่าทั้งหมด"}
        </Button>
      </div>
    </div>
  );
}

