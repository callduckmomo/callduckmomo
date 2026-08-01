import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export const AUTH_COOKIE_NAME = "appmymari_session";
const SEVEN_DAYS_IN_SECONDS = 60 * 60 * 24 * 7;

export type AuthTokenPayload = {
  userId: string;
  email: string;
  displayName: string | null;
};

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("ไม่พบตัวแปร JWT_SECRET ใน environment");
  }

  return secret;
}

export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: SEVEN_DAYS_IN_SECONDS,
  });
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as AuthTokenPayload;
  } catch {
    return null;
  }
}

export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set({
    name: AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SEVEN_DAYS_IN_SECONDS,
  });
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  try {
    cookieStore.delete(AUTH_COOKIE_NAME);
  } catch {
    cookieStore.set({
      name: AUTH_COOKIE_NAME,
      value: "",
      path: "/",
      maxAge: 0,
    });
  }
}

export async function getAuthTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_COOKIE_NAME)?.value ?? null;
}

