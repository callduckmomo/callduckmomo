"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Users,
  Package,
  ListChecks,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

type HomeStatsBarProps = {
  usersCount: number;
  productCount: number;
  totalStock: number;
  ordersCount: number;
};

const STAT_CONFIG: Array<{
  key: "users" | "products" | "stock" | "orders";
  label: string;
  icon: LucideIcon;
  format: (values: HomeStatsBarProps) => string;
}> = [
  {
    key: "users",
    label: "จำนวนผู้ใช้งาน",
    icon: Users,
    format: (v) => `${v.usersCount.toLocaleString()} คน`,
  },
  {
    key: "products",
    label: "รายการสินค้า",
    icon: Package,
    format: (v) => `${v.productCount.toLocaleString()} รายการ`,
  },
  {
    key: "stock",
    label: "จำนวนสินค้าคงเหลือ",
    icon: ListChecks,
    format: (v) => `${v.totalStock.toLocaleString()} ชิ้น`,
  },
  {
    key: "orders",
    label: "ยอดคำสั่งซื้อ",
    icon: TrendingUp,
    format: (v) => `${v.ordersCount.toLocaleString()} รายการ`,
  },
];

export default function HomeStatsBar({
  usersCount,
  productCount,
  totalStock,
  ordersCount,
}: HomeStatsBarProps) {
  const [values, setValues] = useState({
    usersCount,
    productCount,
    totalStock,
    ordersCount,
  });

  useEffect(() => {
    setValues({ usersCount, productCount, totalStock, ordersCount });
  }, [usersCount, productCount, totalStock, ordersCount]);

  const refreshStats = useCallback(async () => {
    try {
      const res = await fetch("/api/products/stats", { cache: "no-store" });
      if (!res.ok) {
        return;
      }
      const data = (await res.json()) as {
        totalStock: number;
        productCount: number;
      };
      setValues((prev) => ({
        ...prev,
        totalStock: data.totalStock,
        productCount: data.productCount,
      }));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleRefresh = () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = setTimeout(() => {
        void refreshStats();
      }, 800);
    };

    window.addEventListener("products:stock-changed", scheduleRefresh);

    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      window.removeEventListener("products:stock-changed", scheduleRefresh);
    };
  }, [refreshStats]);

  return (
    <div className="hidden sm:block">
      <div className="relative overflow-hidden rounded-2xl border border-[var(--theme-color)]/30 bg-gradient-to-r from-[#FFF8F8] via-white to-[#FFF8F8] p-4 sm:p-5">
        <div className="absolute -left-12 top-1/2 h-28 w-28 -translate-y-1/2 rounded-full bg-[#FFE1E6] blur-3xl opacity-80" />
        <div className="absolute right-0 top-0 h-28 w-28 translate-x-1/4 -translate-y-1/3 rounded-full bg-[#FFD7DD] blur-3xl opacity-80" />
        <div className="relative z-10 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {STAT_CONFIG.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card
                key={stat.key}
                className="group rounded-xl border border-[var(--theme-color)]/30 bg-white shadow-sm shadow-[var(--theme-color)]/10 transition-all duration-200 hover:-translate-y-1 hover:border-[var(--theme-color)]/30 hover:shadow-[0_16px_24px_var(--theme-color)]"
              >
                <CardContent className="flex items-center gap-3 p-3 sm:p-4">
                  <span className="flex size-8 items-center justify-center rounded-md bg-[var(--theme-color)]/12 text-[var(--theme-color)] transition-transform duration-200 group-hover:scale-105">
                    <Icon className="size-4" />
                  </span>
                  <div className="space-y-1">
                    <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--theme-color-text-accent)] sm:text-[11px]">
                      {stat.label}
                    </p>
                    <p className="text-sm font-semibold text-[#0B0B0B] sm:text-base">
                      {stat.format(values)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
