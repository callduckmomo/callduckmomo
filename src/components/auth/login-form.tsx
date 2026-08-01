'use client';

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

type LoginResponse = {
  user?: {
    id: string;
    email: string;
    displayName: string | null;
  };
  message?: string;
};

export default function LoginForm() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    startTransition(async () => {
      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        });

        let data: LoginResponse | null = null;
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          try {
            data = (await response.json()) as LoginResponse;
          } catch (error) {
            console.error("ไม่สามารถอ่านข้อมูล JSON จากการเข้าสู่ระบบ", error);
          }
        }

        if (!response.ok) {
          const message = data?.message ?? "เข้าสู่ระบบไม่สำเร็จ";
          setErrorMessage(message);
          toast.error(message);
          return;
        }

        toast.success("เข้าสู่ระบบสำเร็จ", {
          description: "ยินดีต้อนรับกลับ",
        });
        
        // Dispatch custom event to notify Navbar to reload session
        window.dispatchEvent(new Event("auth:session-changed"));
        
        router.push("/");
        router.refresh();
      } catch (error) {
        console.error("เกิดข้อผิดพลาดในการเข้าสู่ระบบ", error);
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
        <Label htmlFor="email">อีเมล</Label>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          placeholder="name@example.com"
          required
          autoComplete="email"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">รหัสผ่าน</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          required
          autoComplete="current-password"
        />
      </div>

      <Button
        type="submit"
        className="w-full rounded-xl bg-[var(--theme-color)] hover:bg-[var(--theme-color)]"
        disabled={isPending}
      >
        {isPending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
      </Button>
    </form>
  );
}

