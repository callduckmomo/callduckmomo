import { NextResponse } from "next/server";
import { z } from "zod";

import { findUserByEmail, toPublicUser } from "@/lib/auth/user";
import { normalizeEmail, verifyPassword } from "@/lib/auth/password";
import { setAuthCookie, signAuthToken } from "@/lib/auth/session";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "กรุณากรอกอีเมล")
    .email("รูปแบบอีเมลไม่ถูกต้อง"),
  password: z.string().min(1, "กรุณากรอกรหัสผ่าน"),
});

export async function POST(request: Request) {
  const body = await request.json();

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "ข้อมูลไม่ถูกต้อง",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 422 }
    );
  }

  const email = normalizeEmail(parsed.data.email);
  const user = await findUserByEmail(email);

  if (!user) {
    return NextResponse.json(
      { message: "ไม่พบบัญชีผู้ใช้" },
      { status: 401 }
    );
  }

  const isValid = await verifyPassword(parsed.data.password, user.password_hash);

  if (!isValid) {
    return NextResponse.json(
      { message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" },
      { status: 401 }
    );
  }

  const publicUser = toPublicUser(user);
  const token = signAuthToken({
    userId: publicUser.id,
    email: publicUser.email,
    displayName: publicUser.displayName,
  });

  await setAuthCookie(token);

  return NextResponse.json({ user: publicUser });
}

