"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, MessageSquare, Eye, CheckCircle2, Clock, ArrowLeft, Copy, Check } from "lucide-react";
import { useSession } from "@/lib/auth/use-session";
import Image from "next/image";
import Link from "next/link";

type SupportCase = {
  id: string;
  caseCode: string;
  productName: string | null;
  accountEmail: string | null;
  accountPassword: string | null;
  expirationDate: string | null;
  caseType: "screen" | "account";
  screenNumber: string | null;
  problemDescription: string;
  status: "pending" | "resolved";
  adminResponse: string | null;
  createdAt: string;
  updatedAt: string;
  attachments?: Array<{
    id: string;
    fileUrl: string;
    fileName: string | null;
  }>;
};

export default function SupportHistoryPage() {
  const router = useRouter();
  const { user, isLoading: isLoadingSession } = useSession();
  const [cases, setCases] = useState<SupportCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<SupportCase | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  useEffect(() => {
    if (!isLoadingSession && !user) {
      router.push("/login");
      return;
    }

    if (user) {
      fetchCases();
    }
  }, [user, isLoadingSession, router]);

  const fetchCases = async () => {
    try {
      setIsLoading(true);
      // ใช้ API ที่ดึงเคสของ user (ต้องสร้าง API ใหม่)
      // ตอนนี้ใช้วิธีดึงจาก admin API แล้ว filter ด้วย caseCode หรือสร้าง API ใหม่
      const response = await fetch("/api/support/my-cases");
      const data = (await response.json()) as { ok: boolean; cases: SupportCase[] };

      if (!response.ok || !data.ok) {
        throw new Error("ไม่สามารถดึงข้อมูลเคสได้");
      }

      setCases(data.cases);
    } catch (error) {
      toast.error("ไม่สามารถโหลดข้อมูลเคสได้");
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = (caseData: SupportCase) => {
    setSelectedCase(caseData);
    setIsDetailDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("th-TH", {
      dateStyle: "long",
      timeStyle: "short",
    });
  };

  // CopyButton component สำหรับคัดลอกข้อความคำตอบจากทีมงาน
  function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy:', error);
        toast.error("ไม่สามารถคัดลอกได้");
      }
    };

    return (
      <button
        onClick={handleCopy}
        className="flex items-center gap-1.5 rounded-lg border border-[var(--theme-color)]/40 bg-white px-3 py-1.5 text-xs font-medium text-[var(--theme-color)] transition-colors hover:bg-[var(--theme-color)]/10 hover:border-[var(--theme-color)] active:bg-[var(--theme-color)]/20"
        type="button"
      >
        {copied ? (
          <>
            <Check className="size-3.5" />
            <span>คัดลอกแล้ว</span>
          </>
        ) : (
          <>
            <Copy className="size-3.5" />
            <span>คัดลอก</span>
          </>
        )}
      </button>
    );
  }

  if (isLoadingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--theme-color-bg-bottom)]">
        <Loader2 className="size-8 animate-spin text-[var(--theme-color)]" />
      </div>
    );
  }

  return (
    <section className="bg-[var(--theme-color-bg-bottom)] py-8 sm:py-12">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-10">
        <div className="mb-6 flex items-center justify-between">
          <div className="space-y-3 text-left">
            <h1 className="text-2xl font-bold text-[#0B0B0B] sm:text-3xl">
              ประวัติแจ้งปัญหา
            </h1>
            <p className="text-sm text-[#6B7280]">
              ตรวจสอบสถานะและรายละเอียดของเคสที่คุณแจ้งปัญหา
            </p>
          </div>
          <Link href="/support/report">
            <Button className="bg-[var(--theme-color)] text-white hover:bg-[var(--theme-color)]/90">
              <MessageSquare className="mr-2 size-4" />
              แจ้งปัญหาใหม่
            </Button>
          </Link>
        </div>

        <Card className="border-transparent bg-white/95 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg text-[#0B0B0B]">เคสทั้งหมด ({cases.length})</CardTitle>
            <CardDescription className="text-[#6B7280]">
              รายการเคสแจ้งปัญหาทั้งหมดของคุณ
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-8 animate-spin text-[var(--theme-color)]" />
              </div>
            ) : cases.length === 0 ? (
              <div className="py-12 text-center">
                <MessageSquare className="mx-auto size-12 text-[#9CA3AF]" />
                <p className="mt-4 text-sm font-semibold text-[#0B0B0B]">
                  ยังไม่มีประวัติการแจ้งปัญหา
                </p>
                <p className="mt-2 text-sm text-[#6B7280]">
                  เริ่มต้นแจ้งปัญหาจากสินค้าที่คุณซื้อได้เลย
                </p>
                <Link href="/support/report" className="mt-4 inline-block">
                  <Button className="bg-[var(--theme-color)] text-white hover:bg-[var(--theme-color)]/90">
                    แจ้งปัญหาใหม่
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {cases.map((caseData) => (
                  <Card
                    key={caseData.id}
                    className="border-[#E5E7EB] bg-white transition-all hover:border-[var(--theme-color)]/40 hover:shadow-md"
                  >
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold text-[#0B0B0B]">
                              {caseData.caseCode}
                            </h3>
                            <Badge
                              className={
                                caseData.status === "resolved"
                                  ? "bg-green-500 text-white"
                                  : "bg-yellow-500 text-white"
                              }
                            >
                              {caseData.status === "resolved" ? "แก้แล้ว" : "ยังไม่แก้"}
                            </Badge>
                          </div>
                          {caseData.productName && (
                            <p className="text-sm text-[#6B7280]">{caseData.productName}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-4 text-xs text-[#6B7280]">
                            <span>
                              ประเภท:{" "}
                              <span className="font-semibold text-[#0B0B0B]">
                                {caseData.caseType === "screen" ? "จอ" : "แอค"}
                              </span>
                            </span>
                            <span>
                              วันที่แจ้ง:{" "}
                              <span className="font-semibold text-[#0B0B0B]">
                                {formatDate(caseData.createdAt)}
                              </span>
                            </span>
                          </div>
                          {caseData.status === "resolved" && caseData.adminResponse && (
                            <div className="mt-3 rounded-lg border border-[var(--theme-color)]/20 bg-[#fff4ed] p-3">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="size-4 text-green-500" />
                                  <p className="text-xs font-semibold text-[#0B0B0B]">
                                    คำตอบจากทีมงาน
                                  </p>
                                </div>
                                <CopyButton text={caseData.adminResponse} />
                              </div>
                              <p className="text-xs text-[#0B0B0B] whitespace-pre-wrap line-clamp-2">
                                {caseData.adminResponse}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewDetails(caseData)}
                            className="border-[var(--theme-color)]/40 text-[var(--theme-color)] hover:bg-[var(--theme-color)] hover:text-white hover:border-[var(--theme-color)]"
                          >
                            <Eye className="mr-1 size-3" />
                            ดูรายละเอียด
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
                      ? new Date(selectedCase.expirationDate).toLocaleDateString("th-TH")
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

              {selectedCase.attachments && selectedCase.attachments.length > 0 && (
                <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                  <p className="text-xs font-semibold text-[#6B7280] mb-3">รูปภาพประกอบ</p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {selectedCase.attachments.map((att) => (
                      <div
                        key={att.id}
                        className="relative aspect-square overflow-hidden rounded-lg border border-[#E5E7EB]"
                      >
                        <Image
                          src={att.fileUrl}
                          alt={att.fileName || "Attachment"}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedCase.status === "resolved" && selectedCase.adminResponse && (
                <div className="rounded-lg border border-[var(--theme-color)]/20 bg-[#fff4ed] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-5 text-green-500" />
                      <p className="text-sm font-semibold text-[#0B0B0B]">คำตอบจากทีมงาน</p>
                    </div>
                    <CopyButton text={selectedCase.adminResponse} />
                  </div>
                  <p className="text-sm text-[#0B0B0B] whitespace-pre-wrap">
                    {selectedCase.adminResponse}
                  </p>
                </div>
              )}

              {selectedCase.status === "pending" && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="size-5 text-yellow-600" />
                    <p className="text-sm text-yellow-800">
                      กำลังตรวจสอบ กรุณารอการตอบกลับจากทีมงาน
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

