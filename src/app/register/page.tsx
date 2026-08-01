import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import RegisterForm from "@/components/auth/register-form";
import { getSettingValue } from "@/lib/settings/repository";
import { getSiteConfig } from "@/lib/site-config";

export async function generateMetadata(): Promise<Metadata> {
  const { siteName } = getSiteConfig();
  return {
    title: "สมัครสมาชิก",
    description: `สร้างบัญชีใหม่เพื่อเริ่มเช่าและแชร์แอปพรีเมี่ยมกับ ${siteName}`,
  };
}

export default async function RegisterPage() {
  const registrationEnabled = await getSettingValue("registration_enabled");
  const { siteName } = getSiteConfig();

  return (
    <section className="relative bg-[var(--theme-color-bg-bottom)] py-20">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-12 px-6 sm:px-10">
        <div className="text-center">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-[var(--theme-color)]">
            {siteName}
          </p>
          <h1 className="mt-4 text-4xl font-bold text-[#0B0B0B] sm:text-5xl">
            สร้างบัญชีของคุณ
          </h1>
          <p className="mt-3 text-base text-[#555555]">
            ใช้เวลาสมัครเพียงไม่กี่นาที แล้วเริ่มเช่าแอปพรีเมี่ยมราคาสบายได้ทันที
          </p>
        </div>

        <Card className="w-full max-w-md border border-[#E4E4E7] bg-white/90 shadow-xl shadow-black/5 backdrop-blur">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-semibold text-[#0B0B0B]">
              สมัครสมาชิกใหม่
            </CardTitle>
            <p className="text-sm text-[#6B7280]">
              กรอกข้อมูลเพื่อสร้างบัญชี {siteName} ของคุณ
            </p>
          </CardHeader>
          <CardContent>
            {registrationEnabled !== "true" ? (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>
                  ระบบสมัครสมาชิกถูกปิดการใช้งานชั่วคราว กรุณาติดต่อแอดมินหากต้องการสมัครสมาชิก
                </AlertDescription>
              </Alert>
            ) : null}
            <RegisterForm registrationEnabled={registrationEnabled === "true"} />
            <Separator className="my-6" />
            <p className="text-center text-sm text-[#555555]">
              มีบัญชีอยู่แล้ว?
              <Link href="/login" className="ml-1 font-medium text-[var(--theme-color)] hover:text-[var(--theme-color)]">
                เข้าสู่ระบบ
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

