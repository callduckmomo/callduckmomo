"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, History } from "lucide-react";
import { useSession } from "@/lib/auth/use-session";
import Link from "next/link";

type CaseType = "screen" | "account";

export default function ReportSupportPage() {
  const router = useRouter();
  const { user, isLoading: isLoadingSession } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [productName, setProductName] = useState<string>("");
  const [accountEmail, setAccountEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [caseType, setCaseType] = useState<CaseType>("screen");
  const [screenNumber, setScreenNumber] = useState("");
  const [problemDescription, setProblemDescription] = useState("");

  useEffect(() => {
    if (!isLoadingSession && !user) {
      router.push("/login");
      return;
    }
  }, [user, isLoadingSession, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!problemDescription.trim()) {
      toast.error("กรุณาระบุปัญหาที่พบ");
      return;
    }

    if (caseType === "screen" && !screenNumber.trim()) {
      toast.error("กรุณาระบุเลขจอ");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/support/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: null,
          productName: productName.trim() || null,
          productTypeId: null,
          accountEmail: accountEmail || null,
          accountPassword: accountPassword || null,
          expirationDate: expirationDate || null,
          caseType,
          screenNumber: caseType === "screen" ? screenNumber : null,
          problemDescription: problemDescription.trim(),
        }),
      });

      const data = (await response.json()) as {
        ok: boolean;
        message?: string;
        case?: { id: string; caseCode: string };
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "ไม่สามารถส่งฟอร์มได้");
      }

      toast.success(data.message || "ส่งฟอร์มสำเร็จ", {
        description: `รหัสเคส: ${data.case?.caseCode}`,
      });

      // Redirect to check page
      if (data.case?.caseCode) {
        router.push(`/support/check?caseCode=${data.case.caseCode}`);
      } else {
        router.push("/support/check");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "ไม่สามารถส่งฟอร์มได้";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--theme-color-bg-bottom)]">
        <Loader2 className="size-8 animate-spin text-[var(--theme-color)]" />
      </div>
    );
  }

  return (
    <section className="bg-[var(--theme-color-bg-bottom)] py-8 sm:py-12">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-10">
        <div className="space-y-3 text-left">
          <h1 className="text-2xl font-bold text-[#0B0B0B] sm:text-3xl">
            แจ้งปัญหา
          </h1>
          <p className="text-sm text-[#6B7280]">
            กรุณากรอกข้อมูลให้ครบถ้วน เพื่อให้ทีมงานสามารถช่วยเหลือคุณได้เร็วที่สุด
          </p>
        </div>

        <Card className="mt-6 border-transparent bg-white/95 shadow-lg">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-xl text-[#0B0B0B]">แบบฟอร์มแจ้งปัญหา</CardTitle>
                <CardDescription className="text-[#6B7280]">
                  กรอกข้อมูลสินค้าและปัญหาที่พบให้ครบถ้วน
                </CardDescription>
              </div>
              <Link href="/support/history">
                <Button
                  type="button"
                  variant="outline"
                  className="border-[var(--theme-color)]/40 text-[var(--theme-color)] hover:bg-[var(--theme-color)] hover:text-white hover:border-[var(--theme-color)]"
                >
                  <History className="mr-2 size-4" />
                  ประวัติแจ้งปัญหา
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* ชื่อสินค้า */}
              <div className="space-y-2">
                <Label htmlFor="product" className="text-[#0B0B0B]">
                  ชื่อสินค้าที่ต้องการแจ้งปัญหา
                </Label>
                <Input
                  id="product"
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="ระบุชื่อสินค้าที่ต้องการแจ้งปัญหา"
                  className="bg-white"
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#0B0B0B]">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={accountEmail}
                  onChange={(e) => setAccountEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="bg-white"
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-[#0B0B0B]">
                  Password
                </Label>
                <Input
                  id="password"
                  type="text"
                  value={accountPassword}
                  onChange={(e) => setAccountPassword(e.target.value)}
                  placeholder="รหัสผ่าน"
                  className="bg-white"
                />
              </div>

              {/* Expiration Date */}
              <div className="space-y-2">
                <Label htmlFor="expDate" className="text-[#0B0B0B]">
                  วันหมดอายุ (Exp Date)
                </Label>
                <Input
                  id="expDate"
                  type="date"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                  className="bg-white"
                />
              </div>

              {/* ประเภทเคส */}
              <div className="space-y-3">
                <Label className="text-[#0B0B0B]">
                  ประเภทเคส <span className="text-red-500">*</span>
                </Label>
                <RadioGroup value={caseType} onValueChange={(v) => setCaseType(v as CaseType)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="screen" id="screen" />
                    <Label htmlFor="screen" className="font-normal cursor-pointer">
                      จอ
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="account" id="account" />
                    <Label htmlFor="account" className="font-normal cursor-pointer">
                      แอค
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* เลขจอ (ถ้าเป็นแบบจอ) */}
              {caseType === "screen" && (
                <div className="space-y-2">
                  <Label htmlFor="screenNumber" className="text-[#0B0B0B]">
                    จอที่เท่าไหร่? <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="screenNumber"
                    type="text"
                    value={screenNumber}
                    onChange={(e) => setScreenNumber(e.target.value)}
                    placeholder="เช่น 1, 2, 3"
                    className="bg-white"
                  />
                </div>
              )}

              {/* ปัญหา */}
              <div className="space-y-2">
                <Label htmlFor="problem" className="text-[#0B0B0B]">
                  ปัญหาคืออะไร? <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="problem"
                  value={problemDescription}
                  onChange={(e) => setProblemDescription(e.target.value)}
                  placeholder="อธิบายปัญหาที่พบ..."
                  rows={5}
                  className="bg-white resize-none"
                />
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="flex-1 border-[var(--theme-color)]/40 text-[var(--theme-color)] hover:bg-[var(--theme-color)]/10"
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || !problemDescription.trim()}
                  className="flex-1 bg-[var(--theme-color)] text-white hover:bg-[var(--theme-color)]/90"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      กำลังส่ง...
                    </>
                  ) : (
                    "ส่งฟอร์ม"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

