import type { Metadata } from "next";
import ProductsGridClient from "@/components/products/products-grid-client";
import { getSiteConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const { siteName } = getSiteConfig();
  return {
    title: "สินค้าทั้งหมด บัญชีพรีเมียมแท้ราคาถูก",
    description: `เลือกซื้อบัญชีพรีเมียมแท้จาก ${siteName} ราคาถูก ปลอดภัย พร้อมรับประกัน ครอบคลุม Netflix, Spotify, YouTube Premium, Disney+ และอีกมากมาย`,
    keywords: [
      siteName,
      "สินค้าพรีเมียม",
      "บัญชีพรีเมียมทั้งหมด",
      "ขายบัญชีพรีเมียม",
      "Premium Account",
      "Netflix Premium",
      "Spotify Premium",
      "YouTube Premium",
      "Disney Plus",
    ],
  };
}

export default function ProductsPage() {
  return (
    <section className="bg-[var(--theme-color-bg-bottom)] pt-4 pb-12 sm:pt-6 sm:pb-16">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-10">
        <ProductsGridClient />
      </div>
    </section>
  );
}

