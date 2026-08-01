'use client';

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Home, ShoppingBag, Wallet, Bell, UserRound, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/auth/use-session";

type BottomNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  requiresAuth?: boolean;
};

const NAV_ITEMS: BottomNavItem[] = [
  { href: "/dashboard/topup", label: "เติมพ้อย", icon: Wallet, requiresAuth: true },
  { href: "/products", label: "ซื้อแอพ", icon: ShoppingBag },
  { href: "/", label: "หน้าหลัก", icon: Home },
  { href: "/dashboard/orders", label: "ประวัติ", icon: Bell, requiresAuth: true },
  { href: "/dashboard", label: "บัญชี", icon: UserRound, requiresAuth: true },
];

export default function BottomNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { user: currentUser } = useSession();
  const navRef = useRef<HTMLDivElement | null>(null);

  const updateBodyOffset = useCallback(() => {
    if (typeof window === "undefined") return;

    const isMobile = window.innerWidth < 768;

    if (!isMobile || !navRef.current) {
      document.body.style.removeProperty("--mobile-bottom-nav-offset");
      return;
    }

    const offsetHeight = navRef.current.offsetHeight;
    document.body.style.setProperty("--mobile-bottom-nav-offset", `${offsetHeight}px`);
  }, []);

  const activeIndex = useMemo(() => {
    return NAV_ITEMS.findIndex((item) => {
      if (item.href === "/") {
        return pathname === "/";
      }

      if (pathname === item.href) {
        return true;
      }

      return pathname.startsWith(`${item.href}/`);
    });
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => {
      updateBodyOffset();
    };

    // delay to ensure layout ready
    const id = window.requestAnimationFrame(() => updateBodyOffset());

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.cancelAnimationFrame(id);
      document.body.style.removeProperty("--mobile-bottom-nav-offset");
    };
  }, [updateBodyOffset]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    updateBodyOffset();
  }, [activeIndex, currentUser, updateBodyOffset]);

  return (
    <AnimatePresence initial={false}>
      <motion.nav
        initial={{ y: 120, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 120, opacity: 0 }}
        transition={{ type: "spring", stiffness: 140, damping: 20 }}
        className="fixed inset-x-0 bottom-0 z-50 block md:hidden"
      >
        <div
          ref={navRef}
          className="border-t border-white/40 bg-gradient-to-t from-[#F5F5F5] via-white/95 to-white/80 shadow-[0_-8px_24px_rgba(0,0,0,0.12)] backdrop-blur-md dark:border-white/10 dark:from-[#141414] dark:via-[#0F0F0F]/95 dark:to-[#141414]/70"
        >
          <div
            className="mx-auto flex h-full max-w-xl items-end justify-between px-2"
            style={{
              paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.45rem)",
              paddingTop: "0.65rem",
            }}
          >
            {NAV_ITEMS.map((item, index) => {
              const Icon = item.icon;
              const isActive = activeIndex === index;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group relative flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-1 text-[11px] font-semibold tracking-tight text-[#9a5832] transition-all hover:text-[var(--theme-color)]",
                    isActive && "text-[var(--theme-color)]"
                  )}
                  prefetch
                  aria-current={isActive ? "page" : undefined}
                  onClick={(event) => {
                    if (item.requiresAuth && !currentUser) {
                      event.preventDefault();
                      router.push(`/login?redirect=${encodeURIComponent(item.href)}`);
                    }
                  }}
                >
                  <div className="relative flex h-11 w-full items-center justify-center">
                    <AnimatePresence>
                      {isActive && (
                        <motion.span
                          layoutId="mobile-bottom-nav-active"
                          className="absolute inset-y-0 w-full rounded-2xl bg-[var(--theme-color)]/12 shadow-[0_4px_12px_rgba(248,191,193,0.3)]"
                          transition={{ type: "spring", stiffness: 260, damping: 28 }}
                        />
                      )}
                    </AnimatePresence>
                    <Icon
                      className="relative size-5"
                      strokeWidth={isActive ? 2.4 : 2.1}
                    />
                  </div>
                  <span className="relative select-none">
                    {isActive ? (
                      <motion.span
                        layoutId="mobile-bottom-nav-label"
                        className="rounded-full bg-[var(--theme-color)]/10 px-2 py-0.5 text-[var(--theme-color)]"
                        transition={{ type: "spring", stiffness: 260, damping: 28 }}
                      >
                        {item.label}
                      </motion.span>
                    ) : (
                      item.label
                    )}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </motion.nav>
    </AnimatePresence>
  );
}


