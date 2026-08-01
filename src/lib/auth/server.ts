import { redirect } from "next/navigation";

import {
  clearAuthCookie,
  getAuthTokenFromCookies,
  verifyAuthToken,
} from "@/lib/auth/session";
import { findUserById, toPublicUser, type PublicUser } from "@/lib/auth/user";

export async function getCurrentUser(): Promise<PublicUser | null> {
  const token = await getAuthTokenFromCookies();

  if (!token) {
    return null;
  }

  const payload = verifyAuthToken(token);

  if (!payload) {
    await clearAuthCookie();
    return null;
  }

  const user = await findUserById(payload.userId);

  if (!user) {
    await clearAuthCookie();
    return null;
  }

  return toPublicUser(user);
}

export async function requireUser(redirectPath = "/login"): Promise<PublicUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect(redirectPath);
  }

  return user;
}

export async function requireAdmin(redirectPath = "/login"): Promise<PublicUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect(redirectPath);
  }

  // ตรวจสอบ role: superadmin หรือ admin
  const isAdmin = user.role === 'superadmin' || user.role === 'admin' || user.isAdmin;
  
  if (!isAdmin) {
    redirect("/");
  }

  return user;
}

export async function requireSuperAdmin(redirectPath = "/login"): Promise<PublicUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect(redirectPath);
  }

  // ตรวจสอบ role: superadmin เท่านั้น
  const isSuperAdmin = user.role === 'superadmin' || (user.isAdmin && !user.role);
  
  if (!isSuperAdmin) {
    redirect("/");
  }

  return user;
}

