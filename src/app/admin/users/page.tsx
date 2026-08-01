import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSiteId } from "@/lib/site";

import { loadLayoutPublicSettings } from "@/lib/settings/load-layout-public-settings";

export async function generateMetadata(): Promise<Metadata> {
  const publicSettings = await loadLayoutPublicSettings();
  const siteTitle = publicSettings.site_title || "Shop";
  const shortTitle = siteTitle.split('|')[0].trim();

  return {
    title: `${shortTitle} Admin Panel`,
    robots: { index: false, follow: false },
  };
}

export default function AdminUsersLegacyPage() {
  redirect("/admin");
}
