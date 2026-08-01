"use client";

import { useState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  Search,
  Eye,
  CheckCircle2,
  Clock,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { SupportCase } from "@/lib/support/types";

export default function SupportCasesTable() {
  const [cases, setCases] = useState<SupportCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<SupportCase | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isCentralized, setIsCentralized] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [caseTypeFilter, setCaseTypeFilter] = useState<string>("all");
  const [searchEmail, setSearchEmail] = useState("");
  const [searchCaseCode, setSearchCaseCode] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const itemsPerPage = 50;

  // Update form
  const [updateStatus, setUpdateStatus] = useState<"pending" | "resolved">("pending");
  const [adminNote, setAdminNote] = useState("");
  const [adminResponse, setAdminResponse] = useState("");

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
    setCases([]);
  }, [statusFilter, caseTypeFilter, searchEmail, searchCaseCode]);

  // Fetch cases when page or filters change
  useEffect(() => {
    fetchCases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, statusFilter, caseTypeFilter, searchEmail, searchCaseCode]);

  const fetchCases = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        pagination: "true",
        page: String(currentPage),
        limit: String(itemsPerPage),
      });
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (caseTypeFilter !== "all") params.append("caseType", caseTypeFilter);
      if (searchEmail) params.append("searchEmail", searchEmail);
      if (searchCaseCode) params.append("searchCaseCode", searchCaseCode);

      const response = await fetch(`/api/admin/support-cases?${params.toString()}`);
      const data = (await response.json()) as {
        ok: boolean;
        cases: SupportCase[];
        total?: number;
        page?: number;
        totalPages?: number;
        isCentralized?: boolean;
      };

      if (!response.ok || !data.ok) {
        throw new Error("ไม่สามารถดึงข้อมูลเคสได้");
      }

      setCases(data.cases || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      setIsCentralized(data.isCentralized || false);
    } catch (error) {
      toast.error("ไม่สามารถโหลดข้อมูลเคสได้");
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = async (caseData: SupportCase) => {
    try {
      const response = await fetch(`/api/admin/support-cases?id=${caseData.id}`);
      const data = (await response.json()) as { ok: boolean; case: SupportCase };
      if (data.ok && data.case) {
        setSelectedCase(data.case);
      } else {
        setSelectedCase(caseData);
      }
    } catch (error) {
      setSelectedCase(caseData);
    }
    setIsDetailDialogOpen(true);
  };

  const handleUpdateCase = (caseData: SupportCase) => {
    setSelectedCase(caseData);
    setUpdateStatus(caseData.status);
    setAdminNote(caseData.adminNote || "");
    setAdminResponse(caseData.adminResponse || "");
    setIsUpdateDialogOpen(true);
  };

  const handleSaveUpdate = () => {
    if (!selectedCase) return;

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/support-cases", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: selectedCase.id,
            caseCode: selectedCase.caseCode,
            status: updateStatus,
            adminNote: adminNote || null,
            adminResponse: adminResponse || null,
          }),
        });

        const data = (await response.json()) as { ok: boolean; message?: string };

        if (!response.ok || !data.ok) {
          throw new Error(data.message || "ไม่สามารถอัปเดตเคสได้");
        }

        toast.success("อัปเดตเคสสำเร็จ");
        setIsUpdateDialogOpen(false);
        fetchCases();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
      }
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("th-TH", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Bangkok",
    });
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="border-transparent bg-white/95 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-[#0B0B0B]">ตัวกรอง</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label className="text-sm text-[#6B7280]">สถานะ</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  <SelectItem value="pending">ยังไม่แก้</SelectItem>
                  <SelectItem value="resolved">แก้แล้ว</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-[#6B7280]">ประเภทเคส</Label>
              <Select value={caseTypeFilter} onValueChange={setCaseTypeFilter}>
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  <SelectItem value="screen">จอ</SelectItem>
                  <SelectItem value="account">แอค</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-[#6B7280]">ค้นหา Email (เมลที่ลูกค้าได้รับเคลม)</Label>
              <Input
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                placeholder="ค้นหาเมลที่ลูกค้าได้รับเคลม..."
                className="bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-[#6B7280]">ค้นหารหัสเคส</Label>
              <Input
                value={searchCaseCode}
                onChange={(e) => setSearchCaseCode(e.target.value.toUpperCase())}
                placeholder="CASE-2025-00031"
                className="bg-white"
              />
            </div>
          </div>

          {(statusFilter !== "all" ||
            caseTypeFilter !== "all" ||
            searchEmail ||
            searchCaseCode) && (
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStatusFilter("all");
                  setCaseTypeFilter("all");
                  setSearchEmail("");
                  setSearchCaseCode("");
                }}
                className="border-[var(--theme-color)]/40 text-[var(--theme-color)] hover:bg-[var(--theme-color)]/10"
              >
                <X className="mr-2 size-4" />
                ล้างตัวกรอง
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cases Table */}
      <Card className="border-transparent bg-white/95 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-[#0B0B0B]">
            เคสทั้งหมด ({total.toLocaleString()})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && cases.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-8 animate-spin text-[var(--theme-color)]" />
            </div>
          ) : cases.length === 0 ? (
            <div className="py-12 text-center text-[#6B7280]">
              ไม่พบเคสที่ตรงกับเงื่อนไข
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-[800px] w-full divide-y divide-[#E5E7EB]">
                  <thead className="bg-[#F9FAFB]">
                    <tr>
                      <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                        รหัสเคส
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                        ร้านค้า
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                        สินค้า
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                        Email
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                        ประเภท
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                        สถานะ
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                        วันที่แจ้ง
                      </th>
                      <th className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                        จัดการ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB] bg-white">
                    {isLoading ? (
                      // Skeleton loading rows
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={`skeleton-${i}`} className="hover:bg-[#F9FAFB]">
                          <td className="px-2 py-2">
                            <div className="h-4 w-32 rounded bg-[#F4F4F5] animate-pulse" />
                          </td>
                          <td className="px-2 py-2">
                            <div className="h-4 w-24 rounded bg-[#F4F4F5] animate-pulse" />
                          </td>
                          <td className="px-2 py-2">
                            <div className="h-4 w-24 rounded bg-[#F4F4F5] animate-pulse" />
                          </td>
                          <td className="px-2 py-2">
                            <div className="h-4 w-40 rounded bg-[#F4F4F5] animate-pulse" />
                          </td>
                          <td className="px-2 py-2">
                            <div className="h-6 w-16 rounded bg-[#F4F4F5] animate-pulse" />
                          </td>
                          <td className="px-2 py-2">
                            <div className="h-6 w-20 rounded bg-[#F4F4F5] animate-pulse" />
                          </td>
                          <td className="px-2 py-2">
                            <div className="h-4 w-32 rounded bg-[#F4F4F5] animate-pulse" />
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex items-center justify-center gap-2">
                              <div className="h-8 w-24 rounded bg-[#F4F4F5] animate-pulse" />
                              <div className="h-8 w-20 rounded bg-[#F4F4F5] animate-pulse" />
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      cases.map((caseData) => (
                        <tr key={caseData.id} className="hover:bg-[#F9FAFB]">
                          <td className="px-2 py-2 text-sm font-medium text-[#0B0B0B]">
                            {caseData.caseCode}
                          </td>
                          <td className="px-2 py-2 text-sm text-[#0B0B0B]">
                            <Badge 
                              variant="outline" 
                              className={(() => {
                                const name = caseData.shopName || 'Appbymari';
                                // Special case for main site
                                if (name === 'Appbymari') return 'border-blue-500 text-blue-700';
                                
                                const SHOP_COLORS = [
                                  'border-emerald-500 text-emerald-700',
                                  'border-orange-500 text-orange-700',
                                  'border-purple-500 text-purple-700',
                                  'border-pink-500 text-pink-700',
                                  'border-rose-500 text-rose-700',
                                  'border-cyan-500 text-cyan-700',
                                  'border-indigo-500 text-indigo-700',
                                  'border-teal-500 text-teal-700',
                                  'border-fuchsia-500 text-fuchsia-700'
                                ];
                                
                                let hash = 0;
                                for (let i = 0; i < name.length; i++) {
                                  hash = name.charCodeAt(i) + ((hash << 5) - hash);
                                }
                                const index = Math.abs(hash) % SHOP_COLORS.length;
                                return SHOP_COLORS[index];
                              })()}
                            >
                              {caseData.shopName || 'Appbymari'}
                            </Badge>
                          </td>
                          <td className="px-2 py-2 text-sm text-[#0B0B0B]">
                            {caseData.productName || "-"}
                          </td>
                          <td className="px-2 py-2 text-sm text-[#6B7280]">
                            {caseData.accountEmail || "-"}
                          </td>
                          <td className="px-2 py-2 text-sm text-[#6B7280]">
                            <Badge
                              variant="outline"
                              className={
                                caseData.caseType === "screen"
                                  ? "border-blue-500 text-blue-700"
                                  : "border-purple-500 text-purple-700"
                              }
                            >
                              {caseData.caseType === "screen" ? "จอ" : "แอค"}
                            </Badge>
                          </td>
                          <td className="px-2 py-2 text-sm">
                            <Badge
                              className={
                                caseData.status === "resolved"
                                  ? "bg-green-500 text-white"
                                  : "bg-yellow-500 text-white"
                              }
                            >
                              {caseData.status === "resolved" ? "แก้แล้ว" : "ยังไม่แก้"}
                            </Badge>
                          </td>
                          <td className="px-2 py-2 text-sm text-[#6B7280]">
                            {formatDate(caseData.createdAt)}
                          </td>
                          <td className="px-2 py-2 text-center">
                            <div className="flex items-center justify-center gap-1 flex-wrap w-[180px]">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewDetails(caseData)}
                                className="h-8 text-xs border-[var(--theme-color)]/40 text-[var(--theme-color)] hover:bg-[var(--theme-color)] hover:text-white hover:border-[var(--theme-color)]"
                              >
                                <Eye className="mr-1 size-3" />
                                ดูรายละเอียด
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUpdateCase(caseData)}
                                className="h-8 text-xs border-[var(--theme-color)]/40 text-[var(--theme-color)] hover:bg-[var(--theme-color)] hover:text-white hover:border-[var(--theme-color)]"
                              >
                                <CheckCircle2 className="mr-1 size-3" />
                                แก้ไข
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="block md:hidden divide-y divide-[#E5E7EB]">
                {isLoading && cases.length === 0 ? (
                  // Mobile skeleton cards
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={`mobile-skeleton-${i}`} className="p-4 space-y-3 animate-pulse">
                      <div className="flex justify-between items-center">
                        <div className="h-5 w-32 rounded bg-[#F4F4F5]" />
                        <div className="h-5 w-16 rounded bg-[#F4F4F5]" />
                      </div>
                      <div className="h-4 w-48 rounded bg-[#F4F4F5]" />
                      <div className="h-4 w-40 rounded bg-[#F4F4F5]" />
                      <div className="flex gap-2">
                        <div className="h-8 w-24 rounded bg-[#F4F4F5] flex-1" />
                        <div className="h-8 w-24 rounded bg-[#F4F4F5] flex-1" />
                      </div>
                    </div>
                  ))
                ) : (
                  cases.map((caseData) => (
                    <div key={caseData.id} className="p-4 space-y-3 hover:bg-[#F9FAFB]/50 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <span className="text-sm font-bold text-[#0B0B0B]">{caseData.caseCode}</span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge 
                              variant="outline" 
                              className={(() => {
                                const name = caseData.shopName || 'Appbymari';
                                if (name === 'Appbymari') return 'border-blue-500 text-blue-700 text-[10px] px-1.5 py-0';
                                const SHOP_COLORS = [
                                  'border-emerald-500 text-emerald-700',
                                  'border-orange-500 text-orange-700',
                                  'border-purple-500 text-purple-700',
                                  'border-pink-500 text-pink-700',
                                  'border-rose-500 text-rose-700',
                                  'border-cyan-500 text-cyan-700',
                                  'border-indigo-500 text-indigo-700',
                                  'border-teal-500 text-teal-700',
                                  'border-fuchsia-500 text-fuchsia-700'
                                ];
                                let hash = 0;
                                for (let i = 0; i < name.length; i++) {
                                  hash = name.charCodeAt(i) + ((hash << 5) - hash);
                                }
                                return SHOP_COLORS[Math.abs(hash) % SHOP_COLORS.length] + ' text-[10px] px-1.5 py-0';
                              })()}
                            >
                              {caseData.shopName || 'Appbymari'}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={
                                caseData.caseType === "screen"
                                  ? "border-blue-500 text-blue-700 text-[10px] px-1.5 py-0"
                                  : "border-purple-500 text-purple-700 text-[10px] px-1.5 py-0"
                              }
                            >
                              {caseData.caseType === "screen" ? "จอ" : "แอค"}
                            </Badge>
                          </div>
                        </div>
                        <Badge
                          className={
                            caseData.status === "resolved"
                              ? "bg-green-500 text-white text-[10px] px-1.5 py-0.5"
                              : "bg-yellow-500 text-white text-[10px] px-1.5 py-0.5"
                          }
                        >
                          {caseData.status === "resolved" ? "แก้แล้ว" : "ยังไม่แก้"}
                        </Badge>
                      </div>

                      <div className="space-y-1 text-xs text-[#4B5563]">
                        <p>
                          <span className="font-medium text-[#111827]">สินค้า:</span> {caseData.productName || "-"}
                        </p>
                        <p className="truncate">
                          <span className="font-medium text-[#111827]">Email:</span> {caseData.accountEmail || "-"}
                        </p>
                        <p>
                          <span className="font-medium text-[#111827]">วันที่แจ้ง:</span> {formatDate(caseData.createdAt)}
                        </p>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewDetails(caseData)}
                          className="flex-1 h-8 text-xs border-[var(--theme-color)]/40 text-[var(--theme-color)] hover:bg-[var(--theme-color)] hover:text-white hover:border-[var(--theme-color)]"
                        >
                          <Eye className="mr-1 size-3" />
                          ดูรายละเอียด
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateCase(caseData)}
                          className="flex-1 h-8 text-xs border-[var(--theme-color)]/40 text-[var(--theme-color)] hover:bg-[var(--theme-color)] hover:text-white hover:border-[var(--theme-color)]"
                        >
                          <CheckCircle2 className="mr-1 size-3" />
                          แก้ไข
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between border-t border-[#E5E7EB] px-4 py-4 sm:px-6">
                  <div className="flex flex-1 justify-between sm:hidden">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (currentPage > 1) {
                          setCurrentPage(currentPage - 1);
                        }
                      }}
                      disabled={currentPage === 1 || isLoading}
                      className="border-[#E5E7EB]"
                    >
                      ก่อนหน้า
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (currentPage < totalPages) {
                          setCurrentPage(currentPage + 1);
                        }
                      }}
                      disabled={currentPage === totalPages || isLoading}
                      className="border-[#E5E7EB]"
                    >
                      ถัดไป
                    </Button>
                  </div>
                  <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-[#6B7280]">
                        แสดง <span className="font-medium">{((currentPage - 1) * itemsPerPage + 1).toLocaleString()}</span> ถึง{" "}
                        <span className="font-medium">
                          {Math.min(currentPage * itemsPerPage, total).toLocaleString()}
                        </span>{" "}
                        จาก <span className="font-medium">{total.toLocaleString()}</span> เคส
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (currentPage > 1) {
                            setCurrentPage(currentPage - 1);
                          }
                        }}
                        disabled={currentPage === 1 || isLoading}
                        className="border-[#E5E7EB]"
                      >
                        <ChevronLeft className="size-4" />
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum: number;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(pageNum)}
                              disabled={isLoading}
                              className={
                                currentPage === pageNum
                                  ? "bg-[var(--theme-color)] text-white hover:bg-[var(--theme-color)]"
                                  : "border-[#E5E7EB]"
                              }
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (currentPage < totalPages) {
                            setCurrentPage(currentPage + 1);
                          }
                        }}
                        disabled={currentPage === totalPages || isLoading}
                        className="border-[#E5E7EB]"
                      >
                        <ChevronRight className="size-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#0B0B0B]">
              รายละเอียดเคส: {selectedCase?.caseCode}
            </DialogTitle>
            <DialogDescription className="text-[#6B7280]">
              ข้อมูลทั้งหมดของเคสแจ้งปัญหา
            </DialogDescription>
          </DialogHeader>

          {selectedCase && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                  <p className="text-xs text-[#6B7280]">สินค้า</p>
                  <p className="mt-1 font-semibold text-[#0B0B0B]">
                    {selectedCase.productName || "-"}
                  </p>
                </div>
                <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                  <p className="text-xs text-[#6B7280]">สถานะ</p>
                  <Badge
                    className={
                      selectedCase.status === "resolved"
                        ? "mt-1 bg-green-500 text-white"
                        : "mt-1 bg-yellow-500 text-white"
                    }
                  >
                    {selectedCase.status === "resolved" ? "แก้แล้ว" : "ยังไม่แก้"}
                  </Badge>
                </div>
                <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                  <p className="text-xs text-[#6B7280]">Email</p>
                  <p className="mt-1 font-mono text-sm text-[#0B0B0B]">
                    {selectedCase.accountEmail || "-"}
                  </p>
                </div>
                <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                  <p className="text-xs text-[#6B7280]">Password</p>
                  <p className="mt-1 font-mono text-sm text-[#0B0B0B]">
                    {selectedCase.accountPassword || "-"}
                  </p>
                </div>
                <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                  <p className="text-xs text-[#6B7280]">วันหมดอายุ</p>
                  <p className="mt-1 text-sm text-[#0B0B0B]">
                    {selectedCase.expirationDate
                      ? new Date(selectedCase.expirationDate).toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok" })
                      : "-"}
                  </p>
                </div>
                <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                  <p className="text-xs text-[#6B7280]">ประเภทเคส</p>
                  <Badge
                    variant="outline"
                    className={
                      selectedCase.caseType === "screen"
                        ? "mt-1 border-blue-500 text-blue-700"
                        : "mt-1 border-purple-500 text-purple-700"
                    }
                  >
                    {selectedCase.caseType === "screen" ? "จอ" : "แอค"}
                  </Badge>
                </div>
                {selectedCase.caseType === "screen" && selectedCase.screenNumber && (
                  <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                    <p className="text-xs text-[#6B7280]">จอที่</p>
                    <p className="mt-1 text-sm font-semibold text-[#0B0B0B]">
                      {selectedCase.screenNumber}
                    </p>
                  </div>
                )}
                <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                  <p className="text-xs text-[#6B7280]">วันที่แจ้ง</p>
                  <p className="mt-1 text-sm text-[#0B0B0B]">
                    {formatDate(selectedCase.createdAt)}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                <p className="text-xs font-semibold text-[#6B7280] mb-2">ปัญหาที่แจ้ง</p>
                <p className="text-sm text-[#0B0B0B] whitespace-pre-wrap">
                  {selectedCase.problemDescription}
                </p>
              </div>

              {selectedCase.adminNote && (
                <div className="rounded-lg border border-[var(--theme-color)]/20 bg-[#fff4ed] p-4">
                  <p className="text-xs font-semibold text-[#6B7280] mb-2">Note (แอดมิน)</p>
                  <p className="text-sm text-[#0B0B0B] whitespace-pre-wrap">
                    {selectedCase.adminNote}
                  </p>
                </div>
              )}

              {selectedCase.adminResponse && (
                <div className="rounded-lg border border-[var(--theme-color)]/20 bg-[#fff4ed] p-4">
                  <p className="text-xs font-semibold text-[#6B7280] mb-2">คำเคลมให้ลูกค้า</p>
                  <p className="text-sm text-[#0B0B0B] whitespace-pre-wrap">
                    {selectedCase.adminResponse}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Update Dialog */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#0B0B0B]">
              แก้ไขเคส: {selectedCase?.caseCode}
            </DialogTitle>
            <DialogDescription className="text-[#6B7280]">
              อัปเดตสถานะและเพิ่มข้อมูลสำหรับเคสนี้
            </DialogDescription>
          </DialogHeader>

          {selectedCase && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[#0B0B0B]">สถานะ</Label>
                <Select
                  value={updateStatus}
                  onValueChange={(v) => setUpdateStatus(v as "pending" | "resolved")}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">ยังไม่แก้</SelectItem>
                    <SelectItem value="resolved">แก้แล้ว</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[#0B0B0B]">Note (สำหรับแอดมิน)</Label>
                <Textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="บันทึกโน๊ตเพิ่มเติม..."
                  rows={4}
                  className="bg-white resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[#0B0B0B]">คำเคลมให้ลูกค้า</Label>
                <Textarea
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  placeholder="ข้อความที่ต้องแจ้งลูกค้า / สรุปผล..."
                  rows={5}
                  className="bg-white resize-none"
                />
                <p className="text-xs text-[#6B7280]">
                  ข้อความนี้จะแสดงให้ลูกค้าเห็นเมื่อเช็คสถานะเคส
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsUpdateDialogOpen(false)}
                  className="flex-1 border-[var(--theme-color)]/40 text-[var(--theme-color)] hover:bg-[var(--theme-color)]/10"
                >
                  ยกเลิก
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveUpdate}
                  disabled={isPending}
                  className="flex-1 bg-[var(--theme-color)] text-white hover:bg-[var(--theme-color)]/90"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      กำลังบันทึก...
                    </>
                  ) : (
                    "บันทึก"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

