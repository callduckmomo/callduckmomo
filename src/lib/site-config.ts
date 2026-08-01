import { getSiteId } from "./site";

export type SiteConfig = {
  siteId: string;
  siteName: string;
  siteUrl: string;
  isChildSite: boolean;
};

/**
 * คืนค่า config ของเว็บไซต์ปัจจุบัน (เว็บหลัก vs เว็บลูก)
 * ใช้ได้ทั้ง server และ client side
 */
export function getSiteConfig(): SiteConfig {
  const siteId = getSiteId();
  const isChildSite = siteId !== "main";

  if (isChildSite) {
    return {
      siteId,
      siteName: "ชื่อร้าน",
      siteUrl:
        process.env.NEXT_PUBLIC_BASE_URL ||
        "https://new-child-site.vercel.app",
      isChildSite: true,
    };
  }

  return {
    siteId,
    siteName: "ชื่อร้าน",
    siteUrl:
      process.env.NEXT_PUBLIC_BASE_URL || "https://appbymari.com",
    isChildSite: false,
  };
}
