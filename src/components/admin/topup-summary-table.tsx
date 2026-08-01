"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Search, Wallet, LineChart as LineChartIcon, CalendarDays } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { getSiteId } from "@/lib/site";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type TopupSummaryRow = {
  user_id: string;
  email: string;
  display_name: string | null;
  topup_count: number;
  total_amount: number;
  last_topup_at: string | null;
  site_id: string;
};

type TopupSummaryResponse = {
  rows: TopupSummaryRow[];
  meta: {
    total_users: number;
    grand_total_amount: number;
    grand_total_count: number;
    limit: number;
    offset: number;
  };
  sites?: { id: string; name: string }[];
};

function formatDateTime(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAmount(value: number) {
  const n = Number(value ?? 0);
  return `${n.toLocaleString("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} บาท`;
}

export default function TopupSummaryTable() {
  const currentSiteId = getSiteId();
  const isMainSite = currentSiteId === 'main';

  const [isPending, startTransition] = useTransition();

  const [selectedSiteId, setSelectedSiteId] = useState<string>("all");
  const [sites, setSites] = useState<{ id: string, name: string }[]>([]);

  const [rows, setRows] = useState<TopupSummaryRow[]>([]);
  const [meta, setMeta] = useState<TopupSummaryResponse["meta"]>({
    total_users: 0,
    grand_total_amount: 0,
    grand_total_count: 0,
    limit: 50,
    offset: 0,
  });

  const getFirstDayOfMonth = () => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split("T")[0];
  };
  const getToday = () => {
    return new Date().toISOString().split("T")[0];
  };

  const [q, setQ] = useState("");
  const [startDate, setStartDate] = useState(getFirstDayOfMonth());
  const [endDate, setEndDate] = useState(getToday());
  const [timeframe, setTimeframe] = useState("daily");
  
  const [chartData, setChartData] = useState<{ date: string; amount: number; count: number; users: number }[]>([]);
  const [isChartPending, startChartTransition] = useTransition();

  const currentPage = useMemo(() => Math.floor(meta.offset / meta.limit) + 1, [meta]);
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(meta.total_users / meta.limit)),
    [meta]
  );

  const fetchData = (offset = 0) => {
    startTransition(async () => {
      const params = new URLSearchParams();
      params.set("limit", String(meta.limit));
      params.set("offset", String(offset));
      if (q.trim()) params.set("q", q.trim());
      if (startDate) params.set("startDate", new Date(startDate).toISOString());
      if (endDate) params.set("endDate", new Date(endDate + "T23:59:59").toISOString());
      if (isMainSite && selectedSiteId !== "all") {
        params.append("targetSiteId", selectedSiteId);
      }

      const res = await fetch(`/api/admin/topups/summary?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) {
        toast.error("โหลดรายงานเติมเงินไม่สำเร็จ");
        return;
      }

      const data = (await res.json()) as TopupSummaryResponse;
      setRows(data.rows ?? []);
      setMeta(data.meta);
      if (data.sites) {
        setSites(data.sites);
      }
    });
  };

  const fetchChartData = () => {
    startChartTransition(async () => {
      const params = new URLSearchParams();
      params.set("timeframe", timeframe);
      if (startDate) params.set("startDate", new Date(startDate).toISOString());
      if (endDate) params.set("endDate", new Date(endDate + "T23:59:59").toISOString());
      if (isMainSite && selectedSiteId !== "all") {
        params.append("targetSiteId", selectedSiteId);
      }

      const res = await fetch(`/api/admin/topups/chart?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) return;

      const data = await res.json();
      setChartData(data.data ?? []);
    });
  };

  useEffect(() => {
    fetchData(0);
    fetchChartData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchChartData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeframe]);

  const applyFilters = () => {
    fetchData(0);
    fetchChartData();
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border border-[#E5E7EB] bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[#6B7280]">
              ยอดเติมรวม (ตามเงื่อนไข)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-xl font-semibold text-[#0B0B0B]">
              {formatAmount(Number(meta.grand_total_amount ?? 0))}
            </div>
            <div className="rounded-lg bg-[var(--theme-color)]/10 p-3">
              <Wallet className="size-5 text-[var(--theme-color)]" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-[#E5E7EB] bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[#6B7280]">
              จำนวนรายการเติม (success)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold text-[#0B0B0B]">
            {Number(meta.grand_total_count ?? 0).toLocaleString("th-TH")}
          </CardContent>
        </Card>

        <Card className="border border-[#E5E7EB] bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[#6B7280]">
              จำนวนผู้เติม (ตามเงื่อนไข)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold text-[#0B0B0B]">
            {Number(meta.total_users ?? 0).toLocaleString("th-TH")}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border border-[#E5E7EB] bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">ตัวกรอง</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="topup-q">ค้นหา (อีเมล/ชื่อแสดง)</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#9CA3AF]" />
                <Input
                  id="topup-q"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="เช่น agent@gmail.com หรือ Agent A"
                  className="pl-9 border-[#E5E7EB] bg-white focus-visible:ring-[var(--theme-color)]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="topup-start">วันที่เริ่มต้น</Label>
              <Input
                id="topup-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border-[#E5E7EB]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="topup-end">วันที่สิ้นสุด</Label>
              <Input
                id="topup-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border-[#E5E7EB]"
              />
            </div>

            {isMainSite && sites.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="topup-site">ร้านค้า</Label>
                <Select value={selectedSiteId} onValueChange={(v) => { setSelectedSiteId(v); }}>
                  <SelectTrigger id="topup-site" className="border-[#E5E7EB] bg-white">
                    <SelectValue placeholder="ทุกร้านค้า (All)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทุกร้านค้า (All)</SelectItem>
                    {sites.map((site) => (
                      <SelectItem key={site.id} value={site.id}>
                        {site.name === "Appbymari" ? "Appbymari (เว็บหลัก)" : site.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-end gap-2 lg:col-span-full">
              <Button
                onClick={applyFilters}
                disabled={isPending || isChartPending}
                className="w-full bg-[var(--theme-color)] hover:bg-[var(--theme-color)]"
              >
                {isPending || isChartPending ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Search className="mr-2 size-4" />
                )}
                ค้นหา
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chart Dashboard */}
      <Card className="border border-[#E5E7EB] bg-white">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              <LineChartIcon className="size-5 text-[var(--theme-color)]" />
              กราฟวิเคราะห์ยอดเติมเงิน (Analyst Dashboard)
            </CardTitle>
            <p className="text-xs text-[#6B7280]">
              แสดงยอดรวมที่เติมสำเร็จตามช่วงวันที่ (ไม่รวมการค้นหาชื่อ)
            </p>
          </div>
          <div className="w-[150px]">
            <Select value={timeframe} onValueChange={(v) => { setTimeframe(v); }}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="เลือกรูปแบบ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">รายวัน</SelectItem>
                <SelectItem value="monthly">รายเดือน</SelectItem>
                <SelectItem value="yearly">รายปี</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isChartPending ? (
            <div className="flex h-[300px] items-center justify-center">
              <Loader2 className="size-8 animate-spin text-[var(--theme-color)]" />
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex h-[300px] items-center justify-center text-sm text-[#6B7280]">
              ไม่พบข้อมูลกราฟในช่วงเวลาที่เลือก
            </div>
          ) : (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#6B7280' }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    tickFormatter={(value) => `${value.toLocaleString()}`}
                  />
                  <Tooltip 
                    cursor={{ stroke: '#E5E7EB', strokeWidth: 2, strokeDasharray: '5 5' }}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-lg border border-[#E5E7EB] bg-white p-3 shadow-sm">
                            <p className="mb-1 text-sm font-medium text-[#0B0B0B]">{label}</p>
                            <p className="text-sm font-semibold text-[var(--theme-color)]">
                              {formatAmount(payload[0].value as number)}
                            </p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Line 
                    type="monotone"
                    dataKey="amount" 
                    stroke="var(--theme-color)" 
                    strokeWidth={3}
                    dot={{ fill: 'var(--theme-color)', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Time Table */}
      <Card className="border border-[#E5E7EB] bg-white mt-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="size-5 text-[var(--theme-color)]" />
            สรุปยอดเติมเงินแยกตามช่วงเวลา
          </CardTitle>
          <p className="text-xs text-[#6B7280]">
            ตารางแสดงรายละเอียดรายได้และจำนวนรายการตามช่วงเวลาที่เลือก
          </p>
        </CardHeader>
        <CardContent>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto rounded-lg border border-[#E5E7EB]">
            <Table className="min-w-[800px]">
              <TableHeader className="bg-[#F9FAFB]">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold text-[#374151]">วันที่</TableHead>
                  <TableHead className="font-semibold text-[#374151] text-right">จำนวนคนเติม</TableHead>
                  <TableHead className="font-semibold text-[#374151] text-right">จำนวนรายการ</TableHead>
                  <TableHead className="font-semibold text-[#374151] text-right">ยอดรวม (บาท)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isChartPending ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      <Loader2 className="mx-auto size-5 animate-spin text-[var(--theme-color)]" />
                    </TableCell>
                  </TableRow>
                ) : chartData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-[#6B7280]">
                      ไม่พบข้อมูลในช่วงเวลาที่เลือก
                    </TableCell>
                  </TableRow>
                ) : (
                  [...chartData].reverse().map((row, index) => (
                    <TableRow key={index} className="hover:bg-[#F9FAFB]/50 transition-colors">
                      <TableCell className="font-medium text-[#111827]">
                        {row.date}
                      </TableCell>
                      <TableCell className="text-right text-[#6B7280]">
                        {row.users.toLocaleString()} คน
                      </TableCell>
                      <TableCell className="text-right text-[#6B7280]">
                        {row.count.toLocaleString()} บิล
                      </TableCell>
                      <TableCell className="text-right font-semibold text-[#059669]">
                        {formatAmount(row.amount)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="block md:hidden divide-y divide-[#E5E7EB]">
            {isChartPending ? (
              <div className="py-6 text-center">
                <Loader2 className="mx-auto size-5 animate-spin text-[var(--theme-color)]" />
              </div>
            ) : chartData.length === 0 ? (
              <p className="py-6 text-center text-sm text-[#6B7280]">ไม่พบข้อมูลในช่วงเวลาที่เลือก</p>
            ) : (
              [...chartData].reverse().map((row, index) => (
                <div key={index} className="py-3 space-y-1.5 hover:bg-[#F9FAFB]/50 transition-colors">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-[#111827]">{row.date}</span>
                    <span className="text-sm font-bold text-[#059669]">{formatAmount(row.amount)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-[#6B7280]">
                    <span>คนเติม: {row.users.toLocaleString()} คน</span>
                    <span>รายการ: {row.count.toLocaleString()} บิล</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border border-[#E5E7EB] bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">สรุปยอดเติมเงินแยกตามตัวแทน</CardTitle>
          <p className="text-xs text-[#6B7280]">
            เรียงตามยอดเติมรวมมาก → น้อย (เฉพาะรายการที่สถานะ success)
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden md:block w-full overflow-x-auto rounded-lg border border-[#E5E7EB]">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[220px]">ตัวแทน</TableHead>
                  <TableHead className="min-w-[220px]">อีเมล</TableHead>
                  <TableHead className="text-right min-w-[120px]">จำนวนครั้ง</TableHead>
                  <TableHead className="text-right min-w-[140px]">ยอดเติมรวม</TableHead>
                  <TableHead className="min-w-[180px]">เติมล่าสุด</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-[#6B7280]">
                      {isPending ? "กำลังโหลด..." : "ไม่พบข้อมูลตามเงื่อนไข"}
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.user_id}>
                      <TableCell className="font-medium text-[#0B0B0B]">
                        <div className="flex items-center gap-2">
                          {r.display_name || "-"}
                          {isMainSite && (
                            <Badge variant="outline" className={r.site_id === 'main' ? "border-amber-500 text-amber-700 bg-amber-50 h-5 px-1.5 text-[10px]" : "border-purple-500 text-purple-700 bg-purple-50 h-5 px-1.5 text-[10px]"}>
                              {r.site_id === 'main' ? 'เว็บหลัก' : (sites.find(s => s.id === r.site_id)?.name || r.site_id)}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-[#374151]">{r.email}</TableCell>
                      <TableCell className="text-right">
                        {Number(r.topup_count ?? 0).toLocaleString("th-TH")}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-[#0B0B0B]">
                        {formatAmount(Number(r.total_amount ?? 0))}
                      </TableCell>
                      <TableCell className="text-[#374151]">
                        {formatDateTime(r.last_topup_at)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="block md:hidden divide-y divide-[#E5E7EB]">
            {rows.length === 0 ? (
              <p className="py-6 text-center text-sm text-[#6B7280]">
                {isPending ? "กำลังโหลด..." : "ไม่พบข้อมูลตามเงื่อนไข"}
              </p>
            ) : (
              rows.map((r) => (
                <div key={r.user_id} className="py-3 space-y-2 hover:bg-[#F9FAFB]/50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-semibold text-[#0B0B0B] flex items-center gap-2">
                        {r.display_name || "-"}
                        {isMainSite && (
                          <Badge variant="outline" className={r.site_id === 'main' ? "border-amber-500 text-amber-700 bg-amber-50 h-4 px-1.5 text-[10px]" : "border-purple-500 text-purple-700 bg-purple-50 h-4 px-1.5 text-[10px]"}>
                            {r.site_id === 'main' ? 'เว็บหลัก' : (sites.find(s => s.id === r.site_id)?.name || r.site_id)}
                          </Badge>
                        )}
                      </p>
                      <p className="text-xs text-[#6B7280]">{r.email}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-[#6B7280]">ยอดเติมรวม</span>
                      <p className="text-sm font-bold text-[#059669]">{formatAmount(Number(r.total_amount ?? 0))}</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-xs text-[#6B7280] pt-1">
                    <p>จำนวนครั้ง: <span className="font-medium text-[#0B0B0B]">{Number(r.topup_count ?? 0).toLocaleString("th-TH")} ครั้ง</span></p>
                    <p>ล่าสุด: <span className="text-[#374151]">{formatDateTime(r.last_topup_at)}</span></p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-[#6B7280]">
              หน้า {currentPage.toLocaleString("th-TH")} / {totalPages.toLocaleString("th-TH")}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="border-[#E5E7EB] bg-white"
                disabled={isPending || meta.offset <= 0}
                onClick={() => fetchData(Math.max(0, meta.offset - meta.limit))}
              >
                ก่อนหน้า
              </Button>
              <Button
                variant="outline"
                className="border-[#E5E7EB] bg-white"
                disabled={isPending || meta.offset + meta.limit >= meta.total_users}
                onClick={() => fetchData(meta.offset + meta.limit)}
              >
                ถัดไป
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


