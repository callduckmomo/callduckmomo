import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import LoginForm from "@/components/auth/login-form";

import { getSiteConfig } from "@/lib/site-config";
import { getSettingValue } from "@/lib/settings/repository";

export async function generateMetadata(): Promise<Metadata> {
  const { siteName } = getSiteConfig();
  return {
    title: `เข้าสู่ระบบ | ${siteName}`,
    description: "เข้าสู่ระบบเพื่อจัดการบัญชีเช่าแอปพรีเมี่ยมของคุณ",
  };
}

export default async function LoginPage() {
  const { siteName } = getSiteConfig();
  const bgImageUrl = await getSettingValue("login_bg_image");
  return (
    <section 
      className="relative min-h-screen py-20 bg-cover bg-center bg-no-repeat"
      style={bgImageUrl ? { backgroundImage: `url('${bgImageUrl}')` } : { backgroundColor: "var(--theme-color-bg-bottom)" }}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center px-6 sm:px-10">
        <Card className="mt-[15vh] sm:mt-[25vh] lg:mt-[35vh] w-full max-w-md border border-[#E4E4E7] bg-white/90 shadow-xl shadow-black/5 backdrop-blur">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-semibold text-[#0B0B0B]">
              เข้าสู่ระบบบัญชีของคุณ
            </CardTitle>
            <p className="text-sm text-[#6B7280]">
              ระบุอีเมลและรหัสผ่านเพื่อเข้าสู่ระบบ
            </p>
          </CardHeader>
          <CardContent>
            <LoginForm />
            <Separator className="my-6" />
            <p className="text-center text-sm text-[#555555]">
              ยังไม่มีบัญชี?
              <Link href="/register" className="ml-1 font-medium text-[var(--theme-color)] hover:text-[var(--theme-color)]">
                สมัครสมาชิกเลย
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

