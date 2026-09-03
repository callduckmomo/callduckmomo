import { getSiteId } from "./site";

export type SiteConfig = {
  siteId: string;
  siteName: string;
  siteUrl: string;
  isChildSite: boolean;
};

/**
 * Browser title used when an installation has not configured a custom title.
 * Keep this in one place so the layout and the home page cannot drift apart.
 */
export const DEFAULT_SITE_TITLE =
  "🦆💎 CallDuck Store | Premium ที่ใช่ ในราคาที่คุ้มกว่า 💖";

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
        process.env.NEXT_PUBLIC_SITE_URL ||
        process.env.NEXT_PUBLIC_BASE_URL ||
        "https://new-child-site.vercel.app",
      isChildSite: true,
    };
  }

  return {
    siteId,
    siteName: "ชื่อร้าน",
    siteUrl:
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      "https://appbymari.com",
    isChildSite: false,
  };
}
