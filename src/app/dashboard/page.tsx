import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, ShoppingBag, History, ArrowRight, Sparkles, User, Mail } from "@/components/ui/icons";
import { listRecentOrders } from "@/lib/orders/repository";
import { getSiteConfig } from "@/lib/site-config";

export async function generateMetadata(): Promise<Metadata> {
  const { siteName } = getSiteConfig();
  return {
    title: "แดชบอร์ด",
    description: `จัดการข้อมูลผู้ใช้และการสมัครสมาชิกกับ ${siteName}`,
    robots: { index: false, follow: false },
  };
}

export default async function DashboardPage() {
  const { siteName } = getSiteConfig();
  const user = await requireUser();
  const recentOrders = await listRecentOrders(5);

  const stats = [
    {
      label: "พ้อยท์ที่มีอยู่",
      value: user.points != null ? user.points.toLocaleString("th-TH", { minimumFractionDigits: 2 }) : "0.00",
      unit: "พ้อยท์",
      icon: Wallet,
      color: "text-[var(--theme-color)]",
      bgColor: "bg-[#FEF2F2]",
    },
    {
      label: "จำนวนคำสั่งซื้อ",
      value: recentOrders.length.toString(),
      unit: "รายการ",
      icon: ShoppingBag,
      color: "text-[#0B0B0B]",
      bgColor: "bg-[#F9FAFB]",
    },
  ];

  return (
    <section className="min-h-screen bg-[var(--theme-color-bg-bottom)]">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="outline" className="border-[var(--theme-color)]/20 text-[var(--theme-color)]">
              <Sparkles className="mr-1 size-3" />
              {siteName}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold text-[#0B0B0B] sm:text-3xl lg:text-4xl">
            สวัสดี, {user.displayName?.split(" ")[0] ?? user.email.split("@")[0]}
          </h1>
          <p className="mt-2 text-sm text-[#6B7280]">
            ยินดีต้อนรับสู่แดชบอร์ดของคุณ
          </p>
        </div>

        {/* Stats Grid */}
        <div className="mb-6 sm:mb-8 grid gap-4 grid-cols-1 sm:grid-cols-2">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <Card key={idx} className="border border-[#E5E7EB] bg-white shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-xs font-medium text-[#6B7280]">{stat.label}</p>
                      <div className="mt-2 flex items-baseline gap-1">
                        <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                        <p className="text-sm text-[#9CA3AF]">{stat.unit}</p>
                      </div>
                    </div>
                    <div className={`rounded-lg ${stat.bgColor} p-3`}>
                      <Icon className={`size-5 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-3">
          {/* Account Info Card */}
          <Card className="border border-[#E5E7EB] bg-white lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">ข้อมูลบัญชี</CardTitle>
              <CardDescription className="text-xs">ข้อมูลส่วนตัวและบัญชีของคุณ</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] p-4">
                <div className="rounded-full bg-[#F3F4F6] p-2">
                  <User className="size-4 text-[#6B7280]" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-[#6B7280]">ชื่อแสดง</p>
                  <p className="mt-0.5 text-sm font-medium text-[#0B0B0B]">
                    {user.displayName || "-"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] p-4">
                <div className="rounded-full bg-[#F3F4F6] p-2">
                  <Mail className="size-4 text-[#6B7280]" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-[#6B7280]">อีเมล</p>
                  <p className="mt-0.5 text-sm font-medium text-[#0B0B0B]">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] p-4">
                <div className="rounded-full bg-[#FEF2F2] p-2">
                  <Wallet className="size-4 text-[var(--theme-color)]" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-[#6B7280]">พ้อยท์</p>
                  <p className="mt-0.5 text-lg font-bold text-[var(--theme-color)]">
                    {user.points != null ? user.points.toLocaleString("th-TH", { minimumFractionDigits: 2 }) : "0.00"} พ้อยท์
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border border-[#E5E7EB] bg-white">
            <CardHeader>
              <CardTitle className="text-lg">เมนูหลัก</CardTitle>
              <CardDescription className="text-xs">เข้าถึงฟีเจอร์ต่างๆ ได้อย่างรวดเร็ว</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild variant="outline" className="w-full justify-start border-[#E5E7EB] bg-white text-[#0B0B0B] hover:bg-[#F3F4F6] hover:text-[#0B0B0B] hover:border-[#D1D5DB]">
                <Link href="/dashboard/topup" className="flex items-center gap-2">
                  <Wallet className="size-4" />
                  <span>เติมพ้อยท์</span>
                  <ArrowRight className="ml-auto size-3.5" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start border-[#E5E7EB] bg-white text-[#0B0B0B] hover:bg-[#F3F4F6] hover:text-[#0B0B0B] hover:border-[#D1D5DB]">
                <Link href="/products" className="flex items-center gap-2">
                  <ShoppingBag className="size-4" />
                  <span>ซื้อสินค้า</span>
                  <ArrowRight className="ml-auto size-3.5" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start border-[#E5E7EB] bg-white text-[#0B0B0B] hover:bg-[#F3F4F6] hover:text-[#0B0B0B] hover:border-[#D1D5DB]">
                <Link href="/dashboard/orders" className="flex items-center gap-2">
                  <History className="size-4" />
                  <span>ประวัติสั่งซื้อ</span>
                  <ArrowRight className="ml-auto size-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Recent Orders */}
          {recentOrders.length > 0 && (
            <Card className="border border-[#E5E7EB] bg-white lg:col-span-3">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">คำสั่งซื้อล่าสุด</CardTitle>
                    <CardDescription className="text-xs">ประวัติการสั่งซื้อของคุณ</CardDescription>
                  </div>
                  <Button asChild variant="ghost" size="sm" className="text-xs">
                    <Link href="/dashboard/orders">
                      ดูทั้งหมด
                      <ArrowRight className="ml-1 size-3" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentOrders.slice(0, 3).map((order) => (
                    <Link
                      key={order.id}
                      href="/dashboard/orders"
                      className="block rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] p-4 transition-colors hover:bg-[#F3F4F6] hover:border-[#D1D5DB]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium text-[#0B0B0B]">
                            {order.productName}
                          </p>
                          <p className="mt-1 text-xs text-[#6B7280]">
                            {new Date(order.purchaseDate || order.createdAt).toLocaleDateString("th-TH", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-[var(--theme-color)] text-white">
                            {order.price?.toLocaleString() ?? "0"} พ้อยท์
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {recentOrders.length === 0 && (
            <Card className="border border-[#E5E7EB] bg-white lg:col-span-3">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ShoppingBag className="mb-4 size-12 text-[#D1D5DB]" />
                <p className="mb-2 text-sm font-medium text-[#374151]">ยังไม่มีคำสั่งซื้อ</p>
                <p className="mb-4 text-xs text-[#6B7280]">เริ่มต้นการสั่งซื้อสินค้าพรีเมียมของคุณ</p>
                <Button asChild size="sm" className="bg-[var(--theme-color)] hover:bg-[var(--theme-color)]">
                  <Link href="/products">ดูสินค้า</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </section>
  );
}
