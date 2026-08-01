'use client';

import { useEffect, useState, useCallback } from 'react';
import type { PublicUser } from './user';

let sessionCache: { user: PublicUser | null; timestamp: number } | null = null;
let sessionListeners: Set<(user: PublicUser | null) => void> = new Set();
const CACHE_DURATION = 5000; // 5 seconds

async function fetchSession(): Promise<PublicUser | null> {
  // ใช้ cache ถ้ายังไม่หมดอายุ
  if (sessionCache && Date.now() - sessionCache.timestamp < CACHE_DURATION) {
    return sessionCache.user;
  }

  try {
    const response = await fetch('/api/auth/session', {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as { user: PublicUser | null };
    const user = data.user;

    // อัปเดต cache
    sessionCache = { user, timestamp: Date.now() };

    // แจ้ง listeners ทั้งหมด
    sessionListeners.forEach((listener) => listener(user));

    return user;
  } catch {
    return null;
  }
}

export function useSession() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // เพิ่ม listener
    const listener = (newUser: PublicUser | null) => {
      setUser(newUser);
      setIsLoading(false);
    };
    sessionListeners.add(listener);

    // โหลด session ครั้งแรก
    fetchSession().then((user) => {
      setUser(user);
      setIsLoading(false);
    });

    return () => {
      sessionListeners.delete(listener);
    };
  }, []);

  const refreshSession = useCallback(async () => {
    setIsLoading(true);
    // ล้าง cache เพื่อบังคับให้ fetch ใหม่
    sessionCache = null;
    const newUser = await fetchSession();
    setUser(newUser);
    setIsLoading(false);
    return newUser;
  }, []);

  return { user, isLoading, refreshSession };
}

// ฟังก์ชันสำหรับ refresh session จากภายนอก
export function refreshSessionCache() {
  sessionCache = null;
  fetchSession().then((user) => {
    // แจ้ง listeners ทั้งหมดเมื่อ refresh เสร็จ
    sessionListeners.forEach((listener) => listener(user));
  });
}

