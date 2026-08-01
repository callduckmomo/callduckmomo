import { NextResponse } from "next/server";
import { z } from "zod";

import { createUser, findUserByEmail, toPublicUser } from "@/lib/auth/user";
import { hashPassword, normalizeEmail } from "@/lib/auth/password";
import { setAuthCookie, signAuthToken } from "@/lib/auth/session";
import { getSettingValue } from "@/lib/settings/repository";

const registerSchema = z.object({
  email: z
    .string()
    .min(1, "กรุณากรอกอีเมล")
    .email("รูปแบบอีเมลไม่ถูกต้อง"),
  password: z
    .string()
    .min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"),
  displayName: z
    .string()
    .min(1, "กรุณากรอกชื่อแสดง")
    .min(2, "ชื่อแสดงต้องยาวอย่างน้อย 2 ตัวอักษร")
    .max(64, "ชื่อแสดงต้องไม่ยาวเกิน 64 ตัวอักษร"),
});

export async function POST(request: Request) {
  // ตรวจสอบว่าตอนนี้เปิดระบบสมัครสมาชิกหรือไม่
  const registrationEnabled = await getSettingValue("registration_enabled");
  if (registrationEnabled !== "true") {
    return NextResponse.json(
      { message: "ระบบสมัครสมาชิกถูกปิดการใช้งานชั่วคราว" },
      { status: 403 }
    );
  }

  const body = await request.json();

  const parsed = registerSchema.safeParse(body);
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

  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    return NextResponse.json(
      { message: "อีเมลนี้ถูกใช้งานแล้ว" },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(parsed.data.password);

  const userRecord = await createUser({
    email,
    passwordHash,
    displayName: parsed.data.displayName,
  });

  const publicUser = toPublicUser(userRecord);
  const token = signAuthToken({
    userId: publicUser.id,
    email: publicUser.email,
    displayName: publicUser.displayName,
  });

  await setAuthCookie(token);

  return NextResponse.json({ user: publicUser }, { status: 201 });
}

