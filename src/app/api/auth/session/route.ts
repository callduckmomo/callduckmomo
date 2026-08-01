import { NextResponse } from "next/server";

import {
  clearAuthCookie,
  getAuthTokenFromCookies,
  verifyAuthToken,
} from "@/lib/auth/session";
import { findUserById, toPublicUser } from "@/lib/auth/user";

export async function GET() {
  const token = await getAuthTokenFromCookies();

  // ไม่มี token = user ไม่ได้ล็อกอิน (สถานะปกติ ไม่ใช่ error)
  if (!token) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const payload = verifyAuthToken(token);

  // Token ไม่ valid = clear cookie และ return null (สถานะปกติ)
  if (!payload) {
    await clearAuthCookie();
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const userRecord = await findUserById(payload.userId);

  // User ไม่พบ = clear cookie และ return null (สถานะปกติ)
  if (!userRecord) {
    await clearAuthCookie();
    return NextResponse.json({ user: null }, { status: 200 });
  }

  return NextResponse.json({ user: toPublicUser(userRecord) });
}

