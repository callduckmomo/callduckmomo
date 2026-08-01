'use client';

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Menu, X, LogOut, Home, ShoppingBag, History, Wallet, User, Coins, MessageSquare, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/lib/auth/use-session";
import LogoImage from "@/components/logo-image";
import { fetchMasterBalanceForAdmin } from "@/app/admin/settings/actions";
import { usePublicSettings } from "@/components/public-settings-provider";

const NAV_LINKS = [
  { href: "/", label: "หน้าแรก", icon: Home },
  { href: "/products", label: "สินค้า", icon: ShoppingBag },
];

export default function NavigationBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const { user: currentUser, isLoading: isLoadingSession, refreshSession } = useSession();
  const settings = usePublicSettings();
  const [currentHash, setCurrentHash] = useState<string>("");
  const [masterBalance, setMasterBalance] = useState<number | null>(null);
  const [isLoadingMasterBalance, setIsLoadingMasterBalance] = useState(false);

  const handleToggle = () => setIsOpen((prev) => !prev);
  const closeMenu = () => setIsOpen(false);

  // Listen for custom auth events (login/register/logout)
  useEffect(() => {
    const handleAuthChange = () => {
      refreshSession();
    };

    window.addEventListener("auth:session-changed", handleAuthChange);
    return () => {
      window.removeEventListener("auth:session-changed", handleAuthChange);
    };
  }, [refreshSession]);

  useEffect(() => {
    if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'superadmin' || (currentUser as any).isAdmin)) {
      setIsLoadingMasterBalance(true);
      fetchMasterBalanceForAdmin().then(res => {
        if (res.success && res.balance !== null) {
          setMasterBalance(res.balance);
        }
      }).catch(console.error).finally(() => setIsLoadingMasterBalance(false));
    }
  }, [currentUser]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateHash = () => setCurrentHash(window.location.hash);
    updateHash();
    window.addEventListener("hashchange", updateHash);
    return () => window.removeEventListener("hashchange", updateHash);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (pathname === "/") {
      setCurrentHash(window.location.hash);
    } else {
      setCurrentHash("");
    }
  }, [pathname]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const isLinkActive = (href: string) => {
    if (href === "/") {
      return pathname === "/" && (!currentHash || currentHash === "" || currentHash === "#hero");
    }
    if (href.startsWith("/#")) {
      if (pathname !== "/") return false;
      const hash = href.replace("/", "");
      if (!currentHash && hash === "#hero") return true;
      return currentHash === hash;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    
    // Dispatch custom event to notify Navbar to reload session
    window.dispatchEvent(new Event("auth:session-changed"));
    
    toast.success("ออกจากระบบสำเร็จ");
    router.refresh();
    closeMenu();
  };

  const isLoginPage = pathname === "/login";

  return (
    <header className={cn(
      "z-40 w-full transition-all",
      isLoginPage
        ? "absolute top-0 left-0 border-b-0 bg-transparent shadow-none backdrop-blur-none"
        : "sticky top-0 border-b border-white/30 bg-[var(--theme-color-nav)]/35 shadow-[0_4px_12px_rgba(0,0,0,0.08)] backdrop-blur-xl dark:bg-[var(--theme-color-nav)]/35"
    )}>
      <div className="w-full px-4 sm:px-6 lg:px-10">
        <nav className="flex items-center justify-between py-3">
          <Link
            href="/"
            className="flex items-center gap-3"
            onClick={closeMenu}
            aria-label={`${settings.site_name || "Home"}`}
          >
            <LogoImage />
            {settings.site_name && (
              <span className="text-lg font-bold text-[var(--theme-color)] hidden sm:block">
                {settings.site_name}
              </span>
            )}
          </Link>
          <div className="hidden items-center gap-6 text-base font-medium text-[#333333] lg:flex">
            {NAV_LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "transition-colors hover:text-[var(--theme-color)]",
                    isLinkActive(link.href) ? "text-[var(--theme-color)]" : "text-[#9a5832]"
                  )}
                  onClick={closeMenu}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="size-5" />
                    {link.label}
                  </span>
                </Link>
              );
            })}
            {currentUser ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button aria-label="โปรไฟล์" className="rounded-full outline-none ring-0">
                    <Avatar>
                      <AvatarFallback className="bg-[var(--theme-color)]/10 text-[#9a5832]">
                        <User className="size-5" />
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-[#0B0B0B]">
                          {currentUser.displayName ?? currentUser.email}
                        </span>
                        <span className="text-xs text-[#6B7280]">{currentUser.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-[#FFD700] to-[#FFA500] shadow-md">
                          <Coins className="size-4 text-white" />
                        </div>
                        <span className="text-lg font-semibold text-[#FF8C00]">
                          {currentUser.points.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      
                      {(currentUser.role === 'admin' || currentUser.role === 'superadmin' || (currentUser as any).isAdmin) && (
                        <div className="flex flex-col gap-1 mt-1 p-2 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">Master Point (พ้อยท์ร้านแม่)</span>
                          <div className="flex items-center gap-2">
                            <div className="flex size-6 items-center justify-center rounded-full bg-gradient-to-br from-[#3B82F6] to-[#2563EB] shadow-sm">
                              <Coins className="size-3 text-white" />
                            </div>
                            <span className="text-sm font-semibold text-[#2563EB]">
                              {isLoadingMasterBalance ? "กำลังโหลด..." : masterBalance !== null ? masterBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "ไม่ได้เชื่อมต่อ"}
                            </span>
                          </div>
                        </div>
                      )}

                      <Link
                        href="/dashboard/topup"
                        className="flex h-9 items-center justify-center rounded-lg bg-[var(--theme-color)] text-sm font-semibold text-white transition-colors hover:bg-[var(--theme-color)]"
                        onClick={(e) => {
                          e.stopPropagation();
                          closeMenu();
                        }}
                      >
                        เติมพ้อย
                      </Link>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    asChild
                    className="cursor-pointer px-3 py-2 text-sm focus:bg-[var(--theme-color)]/10 focus:text-[var(--theme-color)]"
                  >
                    <Link href="/dashboard" className="flex items-center gap-2">
                      <Home className="size-4" /> แดชบอร์ด
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    asChild
                    className="cursor-pointer px-3 py-2 text-sm focus:bg-[var(--theme-color)]/10 focus:text-[var(--theme-color)]"
                  >
                    <Link href="/dashboard/orders" className="flex items-center gap-2">
                      <History className="size-4" /> ประวัติสั่งซื้อ
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    asChild
                    className="cursor-pointer px-3 py-2 text-sm focus:bg-[var(--theme-color)]/10 focus:text-[var(--theme-color)]"
                  >
                    <Link href="/support/report" className="flex items-center gap-2">
                      <MessageSquare className="size-4" /> แจ้งปัญหา
                    </Link>
                  </DropdownMenuItem>
                  {currentUser.isAdmin ? (
                    <DropdownMenuItem
                      asChild
                      className="cursor-pointer px-3 py-2 text-sm focus:bg-[var(--theme-color)]/10 focus:text-[var(--theme-color)]"
                    >
                      <Link href="/admin">แอดมิน</Link>
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer px-3 py-2 text-sm text-[var(--theme-color)] focus:bg-[var(--theme-color)]/10 focus:text-[var(--theme-color)]"
                  >
                    <LogOut className="mr-2 size-4" /> ออกจากระบบ
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button aria-label="เมนูผู้ใช้" className="rounded-full outline-none ring-0">
                    <Avatar>
                      <AvatarFallback className="bg-[var(--theme-color)]/10 text-[#9a5832]">
                        <User className="size-5" />
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-48">
                  <DropdownMenuItem
                    asChild
                    className="px-3 py-2 text-sm focus:bg-[var(--theme-color)]/10 focus:text-[var(--theme-color)]"
                  >
                    <Link href="/login">เข้าสู่ระบบ</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    asChild
                    className="px-3 py-2 text-sm focus:bg-[var(--theme-color)]/10 focus:text-[var(--theme-color)]"
                  >
                    <Link href="/register">สมัครสมาชิก</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="flex size-10 items-center justify-center rounded-xl text-[#9a5832] hover:bg-[var(--theme-color)]/10 hover:text-[var(--theme-color)] lg:hidden"
            onClick={handleToggle}
            aria-label="เปิดเมนูนำทาง"
          >
            {isOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </nav>
      </div>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[55] bg-black/50 lg:hidden"
            onClick={closeMenu}
          />
        )}
      </AnimatePresence>

      {/* Side Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="mobile-nav"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 z-[60] h-[100dvh] w-[85vw] max-w-sm bg-white shadow-[0_0_24px_rgba(0,0,0,0.15)] lg:hidden"
          >
            <div className="flex h-full flex-col">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-[#E5E7EB] px-4 py-4">
                <h2 className="text-lg font-semibold text-[#0B0B0B]">เมนู</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={closeMenu}
                  className="rounded-full"
                  aria-label="ปิดเมนู"
                >
                  <X className="size-5" />
                </Button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto px-4 py-4 pb-12">
                <div className="flex flex-col gap-2 text-base font-medium text-[#0B0B0B]">
                  {NAV_LINKS.map((link) => {
                    const Icon = link.icon;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-4 py-4 transition-colors hover:bg-[var(--theme-color)]/10 hover:text-[var(--theme-color)]",
                          isLinkActive(link.href) ? "bg-[var(--theme-color)]/10 text-[var(--theme-color)]" : "text-[#9a5832]"
                        )}
                        onClick={closeMenu}
                      >
                        <Icon className="size-6" />
                        <span className="font-medium">{link.label}</span>
                      </Link>
                    );
                  })}
                </div>
                {currentUser ? (
                  <>
                    {/* User Info */}
                    <div className="mb-4 rounded-2xl bg-[#F9FAFB] p-4">
                      <div className="mb-3 flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-full bg-[var(--theme-color)]/10 text-[var(--theme-color)]">
                          <User className="size-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-semibold text-[#0B0B0B]">
                            {currentUser.displayName ?? currentUser.email}
                          </p>
                          <p className="truncate text-xs text-[#6B7280]">{currentUser.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-3">
                        <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-[#FFD700] to-[#FFA500] shadow-md">
                          <Coins className="size-4 text-white" />
                        </div>
                        <span className="text-lg font-semibold text-[#FF8C00]">
                          {currentUser.points.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <Link
                        href="/dashboard/topup"
                        className="mt-3 flex h-10 items-center justify-center rounded-xl bg-[var(--theme-color)] text-sm font-semibold text-white transition-colors hover:bg-[var(--theme-color)]"
                        onClick={closeMenu}
                      >
                        เติมพ้อย
                      </Link>
                    </div>

                    {/* Menu Items */}
                    <div className="space-y-2">
                      {currentUser.isAdmin && (
                        <Link
                          href="/admin"
                          className="flex items-center gap-3 rounded-xl border border-[var(--theme-color)]/40 bg-[#fff4ed] px-4 py-4 text-base font-semibold text-[var(--theme-color)] transition-colors hover:border-[var(--theme-color)] hover:bg-[#fff4ed]"
                          onClick={closeMenu}
                        >
                          <ShieldCheck className="size-6" />
                          <span>แอดมิน</span>
                        </Link>
                      )}
                      <Link
                        href="/dashboard"
                        className="flex items-center gap-3 rounded-xl px-4 py-4 text-base text-[#9a5832] transition-colors hover:bg-[var(--theme-color)]/10 hover:text-[var(--theme-color)]"
                        onClick={closeMenu}
                      >
                        <Home className="size-6" />
                        <span className="font-medium">แดชบอร์ด</span>
                      </Link>
                      <Link
                        href="/dashboard/orders"
                        className="flex items-center gap-3 rounded-xl px-4 py-4 text-base text-[#9a5832] transition-colors hover:bg-[var(--theme-color)]/10 hover:text-[var(--theme-color)]"
                        onClick={closeMenu}
                      >
                        <History className="size-6" />
                        <span className="font-medium">ประวัติสั่งซื้อ</span>
                      </Link>
                      <Link
                        href="/support/report"
                        className="flex items-center gap-3 rounded-xl px-4 py-4 text-base text-[#9a5832] transition-colors hover:bg-[var(--theme-color)]/10 hover:text-[var(--theme-color)]"
                        onClick={closeMenu}
                      >
                        <MessageSquare className="size-6" />
                        <span className="font-medium">แจ้งปัญหา</span>
                      </Link>
                    </div>
                  </>
                ) : (
                  <div className="mt-4 space-y-2">
                    <Link
                      href="/register"
                      className="flex h-11 items-center justify-center rounded-xl bg-[var(--theme-color)] text-base font-semibold text-white transition-colors hover:bg-[var(--theme-color)]"
                      onClick={closeMenu}
                    >
                      สมัครสมาชิก
                    </Link>
                    <Link
                      href="/login"
                      className="flex h-11 items-center justify-center rounded-xl border border-[var(--theme-color)]/40 text-[var(--theme-color)] transition-colors hover:border-[var(--theme-color)] hover:bg-[var(--theme-color)]/10 hover:text-[var(--theme-color)]"
                      onClick={closeMenu}
                    >
                      เข้าสู่ระบบ
                    </Link>
                  </div>
                )}

                {/* Logout Button (if logged in) */}
                {currentUser && (
                  <div className="mt-auto border-t border-[#E5E7EB] pt-4">
                    <Button
                      className="h-11 w-full rounded-xl bg-[var(--theme-color)] text-base font-semibold text-white transition-colors hover:bg-[var(--theme-color)]"
                      onClick={handleLogout}
                      disabled={isLoadingSession}
                    >
                      <LogOut className="mr-2 size-4" /> ออกจากระบบ
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

