'use client';

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

type RegisterResponse = {
  user?: {
    id: string;
    email: string;
    displayName: string | null;
  };
  message?: string;
  issues?: Record<string, string[]>;
};

type RegisterFormProps = {
  registrationEnabled?: boolean;
};

export default function RegisterForm({ registrationEnabled = true }: RegisterFormProps) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationIssues, setValidationIssues] = useState<RegisterResponse["issues"]>(
    undefined
  );
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setValidationIssues(undefined);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const displayName = String(formData.get("displayName") ?? "");

    startTransition(async () => {
      try {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password, displayName }),
        });

        let data: RegisterResponse | null = null;
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          try {
            data = (await response.json()) as RegisterResponse;
          } catch (error) {
            console.error("ไม่สามารถอ่านข้อมูล JSON จากการสมัครสมาชิก", error);
          }
        }

        if (!response.ok) {
          const message = data?.message ?? "สมัครสมาชิกไม่สำเร็จ";
          setErrorMessage(message);
          setValidationIssues(data?.issues);
          toast.error(message);
          return;
        }

        const { siteName } = (await import('@/lib/site-config')).getSiteConfig();
        toast.success("สมัครสมาชิกสำเร็จ", {
          description: `ยินดีต้อนรับสู่ ${siteName}`,
        });
        
        // Dispatch custom event to notify Navbar to reload session
        window.dispatchEvent(new Event("auth:session-changed"));
        
        router.push("/");
        router.refresh();
      } catch (error) {
        console.error("เกิดข้อผิดพลาดในการสมัครสมาชิก", error);
        const message = "ไม่สามารถติดต่อเซิร์ฟเวอร์ได้ กรุณาลองอีกครั้ง";
        setErrorMessage(message);
        toast.error(message);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errorMessage ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="displayName">ชื่อแสดง</Label>
        <Input
          id="displayName"
          name="displayName"
          placeholder="ชื่อที่ต้องการให้แสดง"
          required
          disabled={!registrationEnabled || isPending}
          aria-invalid={validationIssues?.displayName ? "true" : undefined}
        />
        {validationIssues?.displayName ? (
          <p className="text-sm text-[var(--theme-color)]">
            {validationIssues.displayName?.[0]}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">อีเมล</Label>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          placeholder="name@example.com"
          required
          autoComplete="email"
          disabled={!registrationEnabled || isPending}
          aria-invalid={validationIssues?.email ? "true" : undefined}
        />
        {validationIssues?.email ? (
          <p className="text-sm text-[var(--theme-color)]">{validationIssues.email?.[0]}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">รหัสผ่าน</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="อย่างน้อย 8 ตัวอักษร"
          required
          autoComplete="new-password"
          disabled={!registrationEnabled || isPending}
          aria-invalid={validationIssues?.password ? "true" : undefined}
        />
        {validationIssues?.password ? (
          <p className="text-sm text-[var(--theme-color)]">{validationIssues.password?.[0]}</p>
        ) : null}
      </div>

      <Button
        type="submit"
        className="w-full rounded-xl bg-[var(--theme-color)] hover:bg-[var(--theme-color)]"
        disabled={!registrationEnabled || isPending}
      >
        {isPending ? "กำลังสมัครสมาชิก..." : "สมัครสมาชิก"}
      </Button>
    </form>
  );
}

