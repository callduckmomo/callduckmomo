"use client";

import { useEffect, useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, DollarSign, ShoppingCart, Calendar, BarChart3, TrendingUp } from "lucide-react";

type RevenueStats = {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  orderCount: number;
  averageOrderValue: number;
};

type TimePeriod = "1d" | "7d" | "30d" | "all" | "custom";

export default function RevenueHistoryTable({ isLocal }: { isLocal?: boolean }) {
  const [stats1d, setStats1d] = useState<RevenueStats>({
    totalRevenue: 0,
    totalCost: 0,
    totalProfit: 0,
    orderCount: 0,
    averageOrderValue: 0,
  });
  const [stats7d, setStats7d] = useState<RevenueStats>({
    totalRevenue: 0,
    totalCost: 0,
    totalProfit: 0,
    orderCount: 0,
    averageOrderValue: 0,
  });
  const [stats30d, setStats30d] = useState<RevenueStats>({
    totalRevenue: 0,
    totalCost: 0,
    totalProfit: 0,
    orderCount: 0,
    averageOrderValue: 0,
  });
  const [statsAll, setStatsAll] = useState<RevenueStats>({
    totalRevenue: 0,
    totalCost: 0,
    totalProfit: 0,
    orderCount: 0,
    averageOrderValue: 0,
  });
  const [customStats, setCustomStats] = useState<RevenueStats>({
    totalRevenue: 0,
    totalCost: 0,
    totalProfit: 0,
    orderCount: 0,
    averageOrderValue: 0,
  });
  const [isPending, startTransition] = useTransition();
  const [activePeriod, setActivePeriod] = useState<TimePeriod>("1d");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loadedAll, setLoadedAll] = useState(false);

  const getDateRange = (period: TimePeriod): { startDate?: string; endDate?: string } => {
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
        return {
          startDate: startOfTodayUTC.toISOString(),
          endDate: now.toISOString(),
        };
      case "7d":
        const sevenDaysAgo = new Date(startOfTodayUTC);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return {
          startDate: sevenDaysAgo.toISOString(),
          endDate: now.toISOString(),
        };
      case "30d":
        const thirtyDaysAgo = new Date(startOfTodayUTC);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return {
          startDate: thirtyDaysAgo.toISOString(),
          endDate: now.toISOString(),
        };
      case "all":
        return {};
      default:
        return {};
    }
  };

  const fetchStats = (period: TimePeriod, setter: (stats: RevenueStats) => void) => {
    startTransition(async () => {
      const range = getDateRange(period);
      const params = new URLSearchParams();
      if (range.startDate) params.append("startDate", range.startDate);
      if (range.endDate) params.append("endDate", range.endDate);
      if (isLocal !== undefined) params.append("isLocal", String(isLocal));

      const res = await fetch(`/api/admin/orders/revenue?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) {
        toast.error("โหลดข้อมูลไม่สำเร็จ");
        return;
      }
      const data = (await res.json()) as { stats: RevenueStats };
      setter(data.stats);
    });
  };

  const fetchCustomStats = () => {
    if (!startDate || !endDate) {
      toast.error("กรุณาเลือกวันที่เริ่มต้นและสิ้นสุด");
      return;
    }
    startTransition(async () => {
      const params = new URLSearchParams();
      params.append("startDate", new Date(startDate).toISOString());
      params.append("endDate", new Date(endDate + "T23:59:59").toISOString());
      if (isLocal !== undefined) params.append("isLocal", String(isLocal));

      const res = await fetch(`/api/admin/orders/revenue?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) {
        toast.error("โหลดข้อมูลไม่สำเร็จ");
        return;
      }
      const data = (await res.json()) as { stats: RevenueStats };
      setCustomStats(data.stats);
    });
  };

  useEffect(() => {
    fetchStats("1d", setStats1d);
    fetchStats("7d", setStats7d);
    fetchStats("30d", setStats30d);
    if (activePeriod === "all" || loadedAll) {
      fetchStats("all", (stats) => {
        setStatsAll(stats);
        setLoadedAll(true);
      });
    }
    if (activePeriod === "custom" && startDate && endDate) {
      fetchCustomStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activePeriod === "all" && !loadedAll) {
      fetchStats("all", (stats) => {
        setStatsAll(stats);
        setLoadedAll(true);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePeriod, loadedAll]);

  const formatPrice = (value: number) => {
    return `${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const getCurrentStats = (): RevenueStats => {
    switch (activePeriod) {
      case "1d":
        return stats1d;
      case "7d":
        return stats7d;
      case "30d":
        return stats30d;
      case "all":
        return statsAll;
      case "custom":
        return customStats;
      default:
        return stats1d;
    }
  };

  const currentStats = getCurrentStats();

  const StatCard = ({ 
    label, 
    value, 
    icon: Icon, 
    color, 
    bgColor,
    subtitle 
  }: { 
    label: string; 
    value: string | number; 
    icon: React.ComponentType<{ className?: string }>; 
    color: string;
    bgColor: string;
    subtitle?: string;
  }) => (
    <Card className="border border-[#E5E7EB] bg-white">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium text-[#6B7280] mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            {subtitle && (
              <p className="mt-1 text-xs text-[#6B7280]">{subtitle}</p>
            )}
          </div>
          <div className={`rounded-lg ${bgColor} p-3`}>
            <Icon className={`size-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const PeriodComparison = () => (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card className="border border-[#E5E7EB] bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-[#6B7280]">วันนี้</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#6B7280]">ยอดขาย</span>
            <span className="text-sm font-semibold text-[#0B0B0B]">
              {formatPrice(stats1d.totalRevenue)} พ้อยท์
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#6B7280]">ออเดอร์</span>
            <span className="text-sm font-semibold text-[#0B0B0B]">
              {stats1d.orderCount}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-[#E5E7EB] bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-[#6B7280]">7 วันที่ผ่านมา</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#6B7280]">ยอดขาย</span>
            <span className="text-sm font-semibold text-[#0B0B0B]">
              {formatPrice(stats7d.totalRevenue)} พ้อยท์
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#6B7280]">ออเดอร์</span>
            <span className="text-sm font-semibold text-[#0B0B0B]">
              {stats7d.orderCount}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-[#E5E7EB] bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-[#6B7280]">30 วันที่ผ่านมา</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#6B7280]">ยอดขาย</span>
            <span className="text-sm font-semibold text-[#0B0B0B]">
              {formatPrice(stats30d.totalRevenue)} พ้อยท์
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#6B7280]">ออเดอร์</span>
            <span className="text-sm font-semibold text-[#0B0B0B]">
              {stats30d.orderCount}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">

      {/* Period Tabs */}

      <Tabs value={activePeriod} onValueChange={(v) => setActivePeriod(v as TimePeriod)}>
        <TabsList className="grid w-full grid-cols-5 bg-[#F9FAFB]">
          <TabsTrigger value="1d" className="text-xs sm:text-sm">วันนี้</TabsTrigger>
          <TabsTrigger value="7d" className="text-xs sm:text-sm">7 วัน</TabsTrigger>
          <TabsTrigger value="30d" className="text-xs sm:text-sm">30 วัน</TabsTrigger>
          <TabsTrigger value="all" className="text-xs sm:text-sm">ทั้งหมด</TabsTrigger>
          <TabsTrigger value="custom" className="text-xs sm:text-sm">กำหนดเอง</TabsTrigger>
        </TabsList>

        {/* Custom Date Range */}
        <TabsContent value="custom" className="space-y-4">
          <Card className="border border-[#E5E7EB]">
            <CardHeader>
              <CardTitle className="text-base">เลือกช่วงเวลา</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="startDate">วันที่เริ่มต้น</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="border-[#E5E7EB]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">วันที่สิ้นสุด</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="border-[#E5E7EB]"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={() => fetchCustomStats()}
                    disabled={isPending || !startDate || !endDate}
                    className="w-full bg-[var(--theme-color)] hover:bg-[var(--theme-color)]"
                  >
                    {isPending ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Calendar className="mr-2 size-4" />
                    )}
                    ค้นหา
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Period Comparison */}
      <Card className="border border-[#E5E7EB] bg-white">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="size-5" />
            เปรียบเทียบช่วงเวลา
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PeriodComparison />
        </CardContent>
      </Card>

      {/* Main Stats Cards */}
      <div>
        <h3 className="mb-4 text-lg font-semibold text-[#0B0B0B]">
          สรุปข้อมูล{activePeriod === "1d" ? " วันนี้" : activePeriod === "7d" ? " 7 วันที่ผ่านมา" : activePeriod === "30d" ? " 30 วันที่ผ่านมา" : activePeriod === "all" ? " ทั้งหมด" : " ช่วงเวลาที่เลือก"}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="ยอดขายทั้งหมด"
            value={`${formatPrice(currentStats.totalRevenue)} พ้อยท์`}
            icon={DollarSign}
            color="text-[#10B981]"
            bgColor="bg-green-50"
            subtitle={`เฉลี่ย ${formatPrice(currentStats.averageOrderValue)} / รายการ`}
          />
          <StatCard
            label="จำนวนคำสั่งซื้อ"
            value={currentStats.orderCount.toLocaleString()}
            icon={ShoppingCart}
            color="text-[#6366F1]"
            bgColor="bg-indigo-50"
            subtitle="รายการสั่งซื้อทั้งหมด"
          />
          <StatCard
            label="ต้นทุนทั้งหมด"
            value={`${formatPrice(currentStats.totalCost)} พ้อยท์`}
            icon={BarChart3}
            color="text-[#F59E0B]"
            bgColor="bg-amber-50"
            subtitle="ต้นทุนจากพาร์ทเนอร์"
          />
          <StatCard
            label="กำไรสุทธิ"
            value={`${formatPrice(currentStats.totalProfit)} พ้อยท์`}
            icon={TrendingUp}
            color="text-[#EC4899]"
            bgColor="bg-pink-50"
            subtitle={`กำไรเฉลี่ย ${currentStats.orderCount > 0 ? formatPrice(currentStats.totalProfit / currentStats.orderCount) : 0} / รายการ`}
          />
        </div>
      </div>

      {/* Detailed Summary */}
      <Card className="border border-[#E5E7EB] bg-white">
        <CardHeader>
          <CardTitle className="text-lg">
            <h2 className="text-xl font-bold text-[#0B0B0B]">
              {isLocal ? "สรุปกำไร/ยอดขาย (สินค้าภายในร้าน)" : "สรุปกำไร/ยอดขาย (สินค้าหลัก)"}
            </h2>
            <p className="text-sm text-[#9a5832]">
              วิเคราะห์ยอดขาย ต้นทุน และกำไร ในแต่ละช่วงเวลา
            </p>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4">
            <h4 className="text-sm font-semibold text-[#0B0B0B]">ยอดขาย</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#6B7280]">ยอดขายทั้งหมด</span>
                <span className="font-semibold text-[#10B981]">
                  {formatPrice(currentStats.totalRevenue)} พ้อยท์
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#6B7280]">ต้นทุนทั้งหมด</span>
                <span className="font-semibold text-[#F59E0B]">
                  {formatPrice(currentStats.totalCost)} พ้อยท์
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#6B7280]">กำไรสุทธิ</span>
                <span className="font-bold text-[#EC4899]">
                  {formatPrice(currentStats.totalProfit)} พ้อยท์
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-[#E5E7EB] pt-2 mt-2">
                <span className="text-sm text-[#6B7280]">จำนวนคำสั่งซื้อ</span>
                <span className="font-semibold text-[#0B0B0B]">
                  {currentStats.orderCount.toLocaleString()} รายการ
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
