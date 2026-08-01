import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/server";
import AdminLayout from "@/components/admin/admin-layout";

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

export default async function AdminDashboardPage() {
  const user = await requireAdmin();
  // ตรวจสอบ role: superadmin หรือ admin
  const isAdmin = user?.role === 'superadmin' || user?.role === 'admin' || user?.isAdmin;
  if (!isAdmin) {
    redirect("/");
  }

  return <AdminLayout />;
}
