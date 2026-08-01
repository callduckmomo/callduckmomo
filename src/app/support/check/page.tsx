"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, CheckCircle2, Clock, AlertCircle, Copy, Check } from "lucide-react";

type CaseStatus = {
  caseCode: string;
  status: "pending" | "resolved";
  adminResponse: string | null;
  createdAt: string;
  updatedAt: string;
  productName: string | null;
};

function CheckSupportPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [caseCode, setCaseCode] = useState("");
  const [caseData, setCaseData] = useState<CaseStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const code = searchParams.get("caseCode");
    if (code) {
      setCaseCode(code);
      handleSearch(code);
    }
  }, [searchParams]);

  const handleSearch = async (code?: string) => {
    const searchCode = code || caseCode.trim();
    if (!searchCode) {
      toast.error("กรุณาระบุรหัสเคส");
      return;
    }

    setIsLoading(true);
    setHasSearched(true);

    try {
      const response = await fetch(`/api/support/check?caseCode=${encodeURIComponent(searchCode)}`);
      const data = (await response.json()) as {
        ok: boolean;
        message?: string;
        case?: CaseStatus;
      };

      if (!response.ok || !data.ok) {
        setCaseData(null);
        toast.error(data.message || "ไม่พบเคสที่ระบุ");
        return;
      }

      if (data.case) {
        setCaseData(data.case);
      }
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดในการค้นหา");
      setCaseData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch();
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

  return (
    <section className="bg-[var(--theme-color-bg-bottom)] py-8 sm:py-12">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-10">
        <div className="space-y-3 text-left">
          <h1 className="text-2xl font-bold text-[#0B0B0B] sm:text-3xl">
            เช็คสถานะเคส
          </h1>
          <p className="text-sm text-[#6B7280]">
            ใส่รหัสเคสเพื่อตรวจสอบสถานะและดูคำตอบจากทีมงาน
          </p>
        </div>

        <Card className="mt-6 border-transparent bg-white/95 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl text-[#0B0B0B]">ค้นหารหัสเคส</CardTitle>
            <CardDescription className="text-[#6B7280]">
              ใส่รหัสเคสที่ได้รับหลังจากส่งฟอร์มแจ้งปัญหา
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="caseCode" className="text-[#0B0B0B]">
                  รหัสเคส
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="caseCode"
                    type="text"
                    value={caseCode}
                    onChange={(e) => setCaseCode(e.target.value.toUpperCase())}
                    placeholder="เช่น CASE-2025-00031"
                    className="bg-white"
                  />
                  <Button
                    type="submit"
                    disabled={isLoading || !caseCode.trim()}
                    className="bg-[var(--theme-color)] text-white hover:bg-[var(--theme-color)]/90"
                  >
                    {isLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Search className="size-4" />
                    )}
                  </Button>
                </div>
              </div>
            </form>

            {/* แสดงผลลัพธ์ */}
            {hasSearched && (
              <div className="mt-6">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="size-8 animate-spin text-[var(--theme-color)]" />
                  </div>
                ) : caseData ? (
                  <div className="space-y-4 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
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
                      </div>
                      {caseData.status === "resolved" ? (
                        <CheckCircle2 className="size-6 text-green-500" />
                      ) : (
                        <Clock className="size-6 text-yellow-500" />
                      )}
                    </div>

                    <div className="space-y-2 border-t border-[#E5E7EB] pt-4">
                      <p className="text-sm font-semibold text-[#0B0B0B]">วันที่แจ้ง</p>
                      <p className="text-sm text-[#6B7280]">
                        {new Date(caseData.createdAt).toLocaleString("th-TH", {
                          dateStyle: "long",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>

                    {caseData.status === "resolved" && caseData.adminResponse && (
                      <div className="space-y-2 rounded-lg border border-[var(--theme-color)]/20 bg-[#fff4ed] p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="size-5 text-[var(--theme-color)]" />
                            <p className="text-sm font-semibold text-[#0B0B0B]">คำตอบจากทีมงาน</p>
                          </div>
                          <CopyButton text={caseData.adminResponse} />
                        </div>
                        <p className="text-sm text-[#0B0B0B] whitespace-pre-wrap">
                          {caseData.adminResponse}
                        </p>
                      </div>
                    )}

                    {caseData.status === "pending" && (
                      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                        <p className="text-sm text-yellow-800">
                          กำลังตรวจสอบ กรุณารอการตอบกลับจากทีมงาน
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-6 text-center">
                    <AlertCircle className="mx-auto size-12 text-[#9CA3AF]" />
                    <p className="mt-4 text-sm font-semibold text-[#0B0B0B]">
                      ไม่พบเคสที่ระบุ
                    </p>
                    <p className="mt-2 text-sm text-[#6B7280]">
                      กรุณาตรวจสอบรหัสเคสอีกครั้ง
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

export default function CheckSupportPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[var(--theme-color-bg-bottom)]">
        <Loader2 className="size-8 animate-spin text-[var(--theme-color)]" />
      </div>
    }>
      <CheckSupportPageContent />
    </Suspense>
  );
}

