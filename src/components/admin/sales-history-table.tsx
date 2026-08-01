"use client";

import { useEffect, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

import type { Order } from "@/lib/orders/types";
import { Loader2, Eye, DollarSign, ShoppingCart, TrendingUp } from "lucide-react";
import type { ApiProvider } from "@/lib/api-providers/types";
import { normalizeNewlines } from "@/lib/utils";
import { useSession } from "@/lib/auth/use-session";
import { getSiteId } from "@/lib/site";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type TimePeriod = "1d" | "7d" | "30d" | "all" | "custom";

type RevenueStats = {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  orderCount: number;
  averageOrderValue: number;
};

export default function SalesHistoryTable({ isLocal }: { isLocal?: boolean }) {
  const { user } = useSession();
  const isSuperAdmin = user?.role === 'superadmin' || (user?.isAdmin && !user?.role);
  
  const currentSiteId = getSiteId();
  const isMainSite = currentSiteId === 'main';

  const [selectedSiteId, setSelectedSiteId] = useState<string>("all");

  const [sites, setSites] = useState<{ id: string, name: string }[]>([]);

  const [orders, setOrders] = useState<Order[]>([]);
  const [isPending, startTransition] = useTransition();
  const [searchEmail, setSearchEmail] = useState("");
  const [searchProductDetails, setSearchProductDetails] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [apiProviders, setApiProviders] = useState<ApiProvider[]>([]);
  const [selectedApiProviderId, setSelectedApiProviderId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const itemsPerPage = 50;
  const totalPages = Math.ceil(total / itemsPerPage);

  const [activePeriod, setActivePeriod] = useState<TimePeriod>("1d");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [stats, setStats] = useState<RevenueStats>({
    totalRevenue: 0,
    totalCost: 0,
    totalProfit: 0,
    orderCount: 0,
    averageOrderValue: 0,
  });

  const getDateRange = (period: TimePeriod): { start?: string; end?: string } => {
    const now = new Date();
    
    // ดึงวันที่ปัจจุบันตามเวลาประเทศไทย (UTC+7) ที่แม่นยำที่สุด
    const formatter = new Intl.DateTimeFormat('en-US', { 
      timeZone: 'Asia/Bangkok', 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    });
    const parts = formatter.formatToParts(now);
    const y = parts.find(p => p.type === 'year')?.value;
    const m = parts.find(p => p.type === 'month')?.value;
    const d = parts.find(p => p.type === 'day')?.value;
    
    // สร้าง Date object ที่จุดเริ่มต้นของวัน (00:00:00) ในเขตเวลาประเทศไทย (+07:00)
    const startOfTodayUTC = new Date(`${y}-${m}-${d}T00:00:00+07:00`);
    
    switch (period) {
      case "1d":
        return { start: startOfTodayUTC.toISOString(), end: now.toISOString() };
      case "7d":
        const sevenDaysAgo = new Date(startOfTodayUTC);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return { start: sevenDaysAgo.toISOString(), end: now.toISOString() };
      case "30d":
        const thirtyDaysAgo = new Date(startOfTodayUTC);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return { start: thirtyDaysAgo.toISOString(), end: now.toISOString() };
      case "all":
        return {};
      case "custom":
        if (!startDate || !endDate) return {};
        return {
          start: new Date(startDate).toISOString(),
          end: new Date(endDate + "T23:59:59").toISOString()
        };
      default:
        return {};
    }
  };

  const fetchStats = (range: { start?: string; end?: string }) => {
    startTransition(async () => {
      const params = new URLSearchParams();
      if (range.start) params.append("startDate", range.start);
      if (range.end) params.append("endDate", range.end);
      if (isLocal !== undefined) params.append("isLocal", String(isLocal));
      if (selectedApiProviderId) params.append("apiProviderId", selectedApiProviderId);
      if (isMainSite && selectedSiteId !== "all") params.append("targetSiteId", selectedSiteId);

      const res = await fetch(`/api/admin/orders/revenue?${params.toString()}`, { credentials: "include" });
      if (res.ok) {
        const data = (await res.json()) as { stats: RevenueStats };
        setStats(data.stats);
      }
    });
  };

  useEffect(() => {
    // Fetch API providers
    startTransition(async () => {
      const res = await fetch("/api/admin/api-providers", { credentials: "include" });
      if (res.ok) {
        const data = (await res.json()) as { providers: ApiProvider[] };
        setApiProviders(data.providers);
      }
    });
  }, []);

  const fetchOrders = (page = 1) => {
    startTransition(async () => {
      const offset = (page - 1) * itemsPerPage;
      const params = new URLSearchParams({
        limit: String(itemsPerPage),
        offset: String(offset),
      });
      if (selectedApiProviderId) {
        params.append("apiProviderId", selectedApiProviderId);
      }
      if (searchEmail) {
        params.append("searchEmail", searchEmail);
      }
      if (searchProductDetails) {
        params.append("searchProductDetails", searchProductDetails);
      }
      if (isMainSite && selectedSiteId !== "all") {
        params.append("targetSiteId", selectedSiteId);
      }
      
      const range = getDateRange(activePeriod);
      if (range.start) params.append("startDate", range.start);
      if (range.end) params.append("endDate", range.end);
      if (isLocal !== undefined) params.append("isLocal", String(isLocal));

      const res = await fetch(
        `/api/admin/orders/sales?${params.toString()}`,
        { credentials: "include" }
      );
      if (!res.ok) {
        toast.error("โหลดข้อมูลไม่สำเร็จ");
        return;
      }
      const data = (await res.json()) as { orders: Order[]; total: number; sites?: { id: string; name: string }[] };
      setOrders(data.orders);
      setTotal(data.total);
      if (data.sites) {
        setSites(data.sites);
      }
    });
  };

  useEffect(() => {
    setCurrentPage(1);
    const range = getDateRange(activePeriod);
    if (activePeriod !== "custom" || (startDate && endDate)) {
      fetchStats(range);
    }
  }, [searchEmail, searchProductDetails, selectedApiProviderId, activePeriod, startDate, endDate, selectedSiteId]);

  useEffect(() => {
    if (activePeriod === "custom" && (!startDate || !endDate)) {
      return;
    }
    fetchOrders(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, selectedApiProviderId, searchEmail, searchProductDetails, activePeriod, startDate, endDate, selectedSiteId]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Bangkok",
    });
  };

  const formatPrice = (value: number | null) => {
    if (value == null) return "-";
    return `${value.toLocaleString()} พ้อยท์`;
  };

  return (
    <div className="space-y-6">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-0">
        <div>
          <CardTitle className="text-xl text-[#0B0B0B]">
            {isLocal ? "ประวัติการขาย (สินค้าภายในร้าน)" : "ประวัติการขาย (สินค้าหลัก)"}
          </CardTitle>
          <p className="text-sm text-[#9a5832]">
            ติดตามยอดขายและออเดอร์ทั้งหมด
          </p>
        </div>
      </CardHeader>
      <div className="rounded-lg border border-[#E5E7EB] bg-white p-4">
        <Tabs value={activePeriod} onValueChange={(v) => setActivePeriod(v as TimePeriod)}>
          <TabsList className="mb-4 bg-[#F3F4F6]">
            <TabsTrigger value="1d" className="data-[state=active]:bg-white">วันนี้</TabsTrigger>
            <TabsTrigger value="7d" className="data-[state=active]:bg-white">7 วัน</TabsTrigger>
            <TabsTrigger value="30d" className="data-[state=active]:bg-white">30 วัน</TabsTrigger>
            <TabsTrigger value="all" className="data-[state=active]:bg-white">ทั้งหมด</TabsTrigger>
            <TabsTrigger value="custom" className="data-[state=active]:bg-white">กำหนดเอง</TabsTrigger>
          </TabsList>

          <TabsContent value="custom" className="mt-0">
            <div className="mb-4 grid gap-4 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4 sm:grid-cols-2 lg:grid-cols-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="startDate">วันที่เริ่มต้น</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">วันที่สิ้นสุด</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-white"
                  min={startDate}
                />
              </div>
              <div className="col-span-2 lg:col-span-2">
                <p className="text-xs text-[#6B7280]">
                  * ระบบจะดึงข้อมูลประวัติการขายเฉพาะช่วงวันที่กำหนด (เวลาไทย)
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border border-[#E5E7EB] bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-[#6B7280]">ยอดขายรวม</p>
                  <p className="mt-1 text-2xl font-bold text-[#0B0B0B]">
                    {stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                  <p className="mt-1 text-xs text-[#6B7280]">พ้อยท์</p>
                </div>
                <div className="rounded-lg bg-green-100 p-2">
                  <DollarSign className="size-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-[#E5E7EB] bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-[#6B7280]">จำนวนออเดอร์</p>
                  <p className="mt-1 text-2xl font-bold text-[#0B0B0B]">
                    {stats.orderCount.toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs text-[#6B7280]">รายการสั่งซื้อทั้งหมด</p>
                </div>
                <div className="rounded-lg bg-blue-100 p-2">
                  <ShoppingCart className="size-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {isSuperAdmin && (
            <>
              <Card className="border border-[#E5E7EB] bg-white shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-[#6B7280]">ต้นทุนทั้งหมด</p>
                      <p className="mt-1 text-2xl font-bold text-orange-600">
                        {stats.totalCost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </p>
                      <p className="mt-1 text-xs text-[#6B7280]">พ้อยท์</p>
                    </div>
                    <div className="rounded-lg bg-orange-100 p-2">
                      <TrendingUp className="size-5 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-[#E5E7EB] bg-white shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-[#6B7280]">กำไรสุทธิ</p>
                      <p className="mt-1 text-2xl font-bold text-[var(--theme-color)]">
                        {stats.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </p>
                      <p className="mt-1 text-xs text-[#6B7280]">พ้อยท์</p>
                    </div>
                    <div className="rounded-lg bg-[var(--theme-color)]/10 p-2">
                      <TrendingUp className="size-5 text-[var(--theme-color)]" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between flex-wrap">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-1 flex-wrap">
          <Input
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            placeholder="ค้นหาด้วยอีเมลบัญชีสินค้า..."
            className="w-full border-[#E5E7EB] bg-white focus-visible:ring-[var(--theme-color)] sm:w-64"
          />
          <Input
            value={searchProductDetails}
            onChange={(e) => setSearchProductDetails(e.target.value)}
            placeholder="ค้นหาในรายละเอียดสินค้า..."
            className="w-full border-[#E5E7EB] bg-white focus-visible:ring-[var(--theme-color)] sm:w-64"
          />
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {isMainSite && sites.length > 0 && (
            <select
              value={selectedSiteId}
              onChange={(e) => {
                setSelectedSiteId(e.target.value);
                setCurrentPage(1);
              }}
              className="flex h-10 rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-color)]"
            >
              <option value="all">ทุกร้านค้า (All)</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name === "Appbymari" ? "Appbymari (เว็บหลัก)" : site.name}
                </option>
              ))}
            </select>
          )}
          {apiProviders.length > 0 && (
            <select
              value={selectedApiProviderId || ""}
              onChange={(e) => {
                setSelectedApiProviderId(e.target.value || null);
                setCurrentPage(1);
              }}
              className="flex h-10 rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-color)]"
            >
              <option value="">API Provider: ทั้งหมด</option>
              {apiProviders.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.displayName}
                </option>
              ))}
            </select>
          )}
          <Button
            onClick={() => fetchOrders(currentPage)}
            disabled={isPending}
            variant="outline"
            className="border-[#E5E7EB]"
          >
            {isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : null}
            รีเฟรช
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-[#E5E7EB] bg-white">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <Table className="min-w-[800px]">
            <TableHeader className="sticky top-0 bg-[#F9FAFB]">
              <TableRow>
                <TableHead className="w-[80px]">รูป</TableHead>
                {isMainSite && <TableHead>ร้านค้า</TableHead>}
                <TableHead>สินค้า</TableHead>
                <TableHead>ผู้ซื้อ</TableHead>
                <TableHead className="text-right">ราคาขาย</TableHead>
                {isSuperAdmin && (
                  <>
                     <TableHead className="text-right">ราคาต้นทุน</TableHead>
                     <TableHead className="text-right">กำไร</TableHead>
                  </>
                )}
                <TableHead>วันที่</TableHead>
                <TableHead className="text-center">รายละเอียด</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending && orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isMainSite ? 9 : 8} className="h-24 text-center">
                    <Loader2 className="mx-auto size-6 animate-spin text-[var(--theme-color)]" />
                  </TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isMainSite ? 9 : 8} className="h-24 text-center text-[#6B7280]">
                    ไม่พบข้อมูลการขาย
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id} className="hover:bg-[#F9FAFB]">
                    <TableCell>
                      {order.productImage ? (
                        <div
                          className="w-16 h-16 flex-shrink-0 rounded-lg border border-gray-100"
                          style={{
                            backgroundImage: `url(${order.productImage})`,
                            backgroundSize: 'contain',
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat',
                            backgroundColor: '#f9fafb',
                          }}
                          role="img"
                          aria-label={order.productName}
                        />
                      ) : (
                        <div className="flex w-16 h-16 items-center justify-center rounded-lg bg-[#F3F4F6] text-xs text-[#6B7280]">
                          ไม่มีรูป
                        </div>
                      )}
                    </TableCell>
                    {isMainSite && (
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={
                            order.siteId === 'child1' ? 'border-pink-500 text-pink-700' : 
                            order.siteId === 'child2' ? 'border-emerald-500 text-emerald-700' : 
                            'border-blue-500 text-blue-700'
                          }
                        >
                          {order.siteId === 'child1' ? 'PremiumBySom' : 
                           order.siteId === 'child2' ? 'JaoBam' : 
                           'Appbymari'}
                        </Badge>
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="max-w-[200px]">
                        <p className="line-clamp-2 text-sm font-medium text-[#0B0B0B] whitespace-pre-line flex items-center gap-2">
                          {normalizeNewlines(order.productName)}
                          {order.isLocal !== undefined && (
                            <Badge variant="outline" className={order.isLocal ? "border-purple-500 text-purple-700 bg-purple-50" : "border-amber-500 text-amber-700 bg-amber-50"}>
                              {order.isLocal ? "สินค้าภายในร้าน" : "สินค้าหลัก"}
                            </Badge>
                          )}
                        </p>
                        {order.typeMenu && (
                          <p className="text-xs text-[#6B7280]">{order.typeMenu}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[180px]">
                        <p className="truncate text-sm text-[#0B0B0B]">
                          {order.buyerDisplayName || order.buyerEmail || order.usernameBuy || "-"}
                        </p>
                        {order.buyerEmail && order.buyerDisplayName && (
                          <p className="truncate text-xs text-[#6B7280]">{order.buyerEmail}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium text-[#0B0B0B]">
                      {formatPrice(order.price)}
                    </TableCell>
                    {isSuperAdmin && (
                      <>
                        <TableCell className="text-right text-[#6B7280]">
                          {formatPrice(order.costPrice)}
                        </TableCell>
                        <TableCell className="text-right">
                          {order.profit != null ? (
                            <Badge
                              className={
                                order.profit >= 0
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }
                            >
                              {formatPrice(order.profit)}
                            </Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      </>
                    )}
                    <TableCell className="text-sm text-[#6B7280]">
                      {formatDate(order.purchaseDate || order.createdAt)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedOrder(order);
                          setIsDetailDialogOpen(true);
                        }}
                        className="h-8 text-xs border-[var(--theme-color)]/40 text-[var(--theme-color)] hover:bg-[var(--theme-color)] hover:text-white hover:border-[var(--theme-color)]"
                      >
                        <Eye className="mr-1 size-3" />
                        ดูรายละเอียด
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card View */}
        <div className="block md:hidden divide-y divide-[#E5E7EB]">
          {isPending && orders.length === 0 ? (
            <div className="p-8 text-center">
              <Loader2 className="mx-auto size-6 animate-spin text-[var(--theme-color)]" />
            </div>
          ) : orders.length === 0 ? (
            <div className="p-8 text-center text-[#6B7280]">
              ไม่พบข้อมูลการขาย
            </div>
          ) : (
            orders.map((order) => (
              <div key={order.id} className="p-4 space-y-3 hover:bg-[#F9FAFB]/50 transition-colors">
                <div className="flex items-start gap-3">
                  {order.productImage ? (
                    <div
                      className="w-16 h-16 flex-shrink-0 rounded-lg border border-gray-100"
                      style={{
                        backgroundImage: `url(${order.productImage})`,
                        backgroundSize: 'contain',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                        backgroundColor: '#f9fafb',
                      }}
                      role="img"
                      aria-label={order.productName}
                    />
                  ) : (
                    <div className="flex w-16 h-16 flex-shrink-0 items-center justify-center rounded-lg bg-[#F3F4F6] text-xs text-[#6B7280]">
                      ไม่มีรูป
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      {isMainSite && (
                        <Badge 
                          variant="outline" 
                          className={
                            order.siteId === 'child1' ? 'border-pink-500 text-pink-700 text-[10px] px-1.5 py-0' : 
                            order.siteId === 'child2' ? 'border-emerald-500 text-emerald-700 text-[10px] px-1.5 py-0' : 
                            'border-blue-500 text-blue-700 text-[10px] px-1.5 py-0'
                          }
                        >
                          {order.siteId === 'child1' ? 'PremiumBySom' : 
                           order.siteId === 'child2' ? 'JaoBam' : 
                           'Appbymari'}
                        </Badge>
                      )}
                      {order.typeMenu && (
                        <span className="text-[11px] text-[#6B7280]">({order.typeMenu})</span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-[#0B0B0B] line-clamp-2 flex flex-wrap gap-1 items-center">
                      {order.productName}
                      {order.isLocal !== undefined && (
                        <Badge variant="outline" className={order.isLocal ? "border-purple-500 text-purple-700 bg-purple-50 text-[10px] px-1.5 py-0 h-4" : "border-amber-500 text-amber-700 bg-amber-50 text-[10px] px-1.5 py-0 h-4"}>
                          {order.isLocal ? "ภายในร้าน" : "หลัก"}
                        </Badge>
                      )}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-[#4B5563]">
                  <p className="truncate">
                    <span className="font-medium text-[#111827]">ผู้ซื้อ:</span> {order.buyerDisplayName || order.buyerEmail || order.usernameBuy || "-"}
                    {order.buyerEmail && order.buyerDisplayName && (
                      <span className="text-[#6B7280] ml-1">({order.buyerEmail})</span>
                    )}
                  </p>
                  <p>
                    <span className="font-medium text-[#111827]">วันที่:</span> {formatDate(order.purchaseDate || order.createdAt)}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-[#6B7280]">ราคาขาย</span>
                      <span className="text-sm font-bold text-[#0B0B0B]">{formatPrice(order.price)}</span>
                    </div>
                    {isSuperAdmin && (
                      <>
                        <div className="flex flex-col border-l pl-3 border-zinc-150">
                          <span className="text-[10px] text-[#6B7280]">ต้นทุน</span>
                          <span className="text-xs text-[#6B7280]">{formatPrice(order.costPrice)}</span>
                        </div>
                        <div className="flex flex-col border-l pl-3 border-zinc-150">
                          <span className="text-[10px] text-[#6B7280]">กำไร</span>
                          <span>
                            {order.profit != null ? (
                              <Badge
                                className={
                                  order.profit >= 0
                                    ? "bg-green-100 text-green-800 text-[10px] px-1 py-0"
                                    : "bg-red-100 text-red-800 text-[10px] px-1 py-0"
                                }
                              >
                                {formatPrice(order.profit)}
                              </Badge>
                            ) : (
                              "-"
                            )}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedOrder(order);
                      setIsDetailDialogOpen(true);
                    }}
                    className="h-8 text-xs border-[var(--theme-color)]/40 text-[var(--theme-color)] hover:bg-[var(--theme-color)] hover:text-white hover:border-[var(--theme-color)]"
                  >
                    <Eye className="mr-1 size-3" />
                    ดูรายละเอียด
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {orders.length > 0 && (
        <div className="flex items-center justify-between text-sm text-[#6B7280]">
          <p>
            แสดง {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, total)} จาก {total} รายการ
          </p>
          <div className="flex gap-2">
            <Button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1 || isPending}
              variant="outline"
              size="sm"
            >
              ก่อนหน้า
            </Button>
            <Button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || isPending}
              variant="outline"
              size="sm"
            >
              ถัดไป
            </Button>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#0B0B0B]">
              รายละเอียดสินค้าที่ลูกค้าได้รับ
            </DialogTitle>
            <DialogDescription className="text-[#6B7280]">
              ข้อมูลสินค้าที่ลูกค้าได้รับจากการซื้อ
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                  <p className="text-xs text-[#6B7280]">ชื่อสินค้า</p>
                  <p className="mt-1 font-semibold text-[#0B0B0B]">
                    {selectedOrder.productName || "-"}
                  </p>
                </div>
                {isMainSite && (
                  <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                    <p className="text-xs text-[#6B7280]">ร้านค้าที่ซื้อ</p>
                    <Badge 
                      variant="outline" 
                      className={
                        selectedOrder.siteId === 'child1' ? 'border-pink-500 text-pink-700 mt-1' : 
                        selectedOrder.siteId === 'child2' ? 'border-emerald-500 text-emerald-700 mt-1' : 
                        'border-blue-500 text-blue-700 mt-1'
                      }
                    >
                      {selectedOrder.siteId === 'child1' ? 'PremiumBySom' : 
                       selectedOrder.siteId === 'child2' ? 'JaoBam' : 
                       'Appbymari'}
                    </Badge>
                  </div>
                )}
                <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                  <p className="text-xs text-[#6B7280]">ผู้ซื้อ</p>
                  <p className="mt-1 text-sm text-[#0B0B0B]">
                    {selectedOrder.buyerDisplayName || selectedOrder.buyerEmail || selectedOrder.usernameBuy || "-"}
                  </p>
                </div>
                {selectedOrder.accountEmail && (
                  <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                    <p className="text-xs text-[#6B7280]">อีเมลบัญชี</p>
                    <p className="mt-1 font-mono text-sm text-[#0B0B0B]">
                      {selectedOrder.accountEmail}
                    </p>
                  </div>
                )}
                {selectedOrder.accountPassword && (
                  <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                    <p className="text-xs text-[#6B7280]">รหัสผ่านบัญชี</p>
                    <p className="mt-1 font-mono text-sm text-[#0B0B0B]">
                      {selectedOrder.accountPassword}
                    </p>
                  </div>
                )}
                <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                  <p className="text-xs text-[#6B7280]">วันที่ซื้อ</p>
                  <p className="mt-1 text-sm text-[#0B0B0B]">
                    {formatDate(selectedOrder.purchaseDate || selectedOrder.createdAt)}
                  </p>
                </div>
                <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                  <p className="text-xs text-[#6B7280]">ราคาขาย</p>
                  <p className="mt-1 text-sm font-semibold text-[#0B0B0B]">
                    {formatPrice(selectedOrder.price)}
                  </p>
                </div>
              </div>

              {selectedOrder.productDetails && (
                <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                  <p className="text-xs font-semibold text-[#6B7280] mb-2">รายละเอียดสินค้า</p>
                  <p className="text-sm text-[#0B0B0B] whitespace-pre-wrap">
                    {normalizeNewlines(selectedOrder.productDetails)}
                  </p>
                </div>
              )}

              {!selectedOrder.productDetails && !selectedOrder.accountEmail && !selectedOrder.accountPassword && (
                <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4 text-center text-sm text-[#6B7280]">
                  ไม่มีรายละเอียดสินค้า
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

