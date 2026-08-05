// Test deployment auto trigger by Mimi #3
import Image from "next/image";
import { Suspense } from "react";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import ProductsGridClient from "@/components/products/products-grid-client";
import {
  fetchRecommendedProducts,
  fetchPublishedProductsPaginated,
  getAllCategoriesCached,
  countTotalStockAndProducts,
} from "@/lib/products/repository";
import { listRecentOrders, countOrders } from "@/lib/orders/repository";
import type { Order } from "@/lib/orders/types";
import { Marquee } from "@/components/ui/marquee";
import {
  Clock3,
  Headset,
  ShieldCheck,
  Sparkles,
  Crown,
  ShoppingBasket,
} from "lucide-react";
import { countUsers } from "@/lib/auth/user";
import { getSettingValuesCached } from "@/lib/settings/repository";
import { normalizeNewlines } from "@/lib/utils";
import HomeStatsBar from "@/components/home/home-stats-bar";
import MovieGallery from "@/components/home/movie-gallery";
import {
  FeaturedProductCard,
  FeaturedProductCardDesktop,
  type FeaturedProduct,
} from "@/components/products/featured-product-cards";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";

import { getSiteId } from "@/lib/site";
import { getSiteConfig } from "@/lib/site-config";
import { mapPublicMediaSettings } from "@/lib/settings/public-media";

export async function generateMetadata(): Promise<Metadata> {
  const { siteName } = getSiteConfig();
  return {
    title: "Shop",
    description: `${siteName} - ศูนย์รวมสินค้าและบริการพรีเมียมคุณภาพสูง`,
    keywords: [siteName, "Shop", "พรีเมียม"],
  };
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

const GRID_PAGE_SIZE = 12;

type RecentOrder = Order;

function formatOrderTimestamp(value: string | null) {
  if (!value) {
    return "เมื่อสักครู่";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

// ✨ คืนชีพฟังก์ชันหลักที่มิมิทำหล่นหายไป! 
export default function Home() {
  const { siteName, siteUrl } = getSiteConfig();
  return (
    <main className="bg-[var(--theme-color-bg-bottom)]">
      <BreadcrumbJsonLd items={[{ name: "หน้าแรก", url: siteUrl }]} />
      <h1 className="sr-only">{siteName} ศูนย์รวมบัญชีพรีเมียมแท้ ราคาถูก ปลอดภัย บริการครบ จบในหน้าเดียว ให้บริการคนไทย</h1>
      <section className="pt-4 pb-10 sm:pt-6 sm:pb-12 lg:pb-16">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-10">
          <Suspense fallback={<HomeProductsSkeleton />}>
            <ProductsSection />
          </Suspense>
        </div>
      </section>

      <SupportSection />
    </main>
  );
}

async function ProductsSection() {
  const [
    recommendedProducts,
    recentOrders,
    ordersCount,
    usersCount,
    stockStats,
    gridPage,
    gridCategories,
    homeSettings,
  ] = await Promise.all([
    fetchRecommendedProducts(),
    listRecentOrders(20),
    countOrders(),
    countUsers(),
    countTotalStockAndProducts(),
    fetchPublishedProductsPaginated(GRID_PAGE_SIZE, 0),
    getAllCategoriesCached(false),
    getSettingValuesCached([
      "home_youtube_url",
      "home_youtube_enabled",
      "home_youtube_title",
      "home_movies_enabled",
      "home_movie_poster_1",
      "home_movie_poster_2",
      "home_movie_poster_3",
      "home_movie_poster_4",
      "home_movie_poster_5",
      "home_movie_poster_6",
      "home_featured_enabled",
      "home_shortcuts_enabled",
      "home_shortcut_image_1",
      "home_shortcut_link_1",
      "home_shortcut_image_2",
      "home_shortcut_link_2",
      "home_shortcut_image_3",
      "home_shortcut_link_3",
      "home_shortcut_image_4",
      "home_shortcut_link_4",
    ]),
  ]);

  const publicHomeSettings = mapPublicMediaSettings(homeSettings);

  const { totalStock, productCount } = stockStats;
  const youtubeUrl = publicHomeSettings["home_youtube_url"];
  const youtubeEnabled = publicHomeSettings["home_youtube_enabled"] !== "false";
  const youtubeTitle = publicHomeSettings["home_youtube_title"] || "";
  const moviesEnabled = publicHomeSettings["home_movies_enabled"] === "true";
  const featuredEnabled = publicHomeSettings["home_featured_enabled"] !== "false";
  const shortcutsEnabled = publicHomeSettings["home_shortcuts_enabled"] === "true";

  const moviePosters = [
    publicHomeSettings["home_movie_poster_1"],
    publicHomeSettings["home_movie_poster_2"],
    publicHomeSettings["home_movie_poster_3"],
    publicHomeSettings["home_movie_poster_4"],
    publicHomeSettings["home_movie_poster_5"],
    publicHomeSettings["home_movie_poster_6"],
  ].filter((p): p is string => typeof p === "string" && p !== "");

  const shortcutCards = [
    { image: publicHomeSettings["home_shortcut_image_1"], link: publicHomeSettings["home_shortcut_link_1"] },
    { image: publicHomeSettings["home_shortcut_image_2"], link: publicHomeSettings["home_shortcut_link_2"] },
    { image: publicHomeSettings["home_shortcut_image_3"], link: publicHomeSettings["home_shortcut_link_3"] },
    { image: publicHomeSettings["home_shortcut_image_4"], link: publicHomeSettings["home_shortcut_link_4"] },
  ].filter((card): card is { image: string; link: string | null } => typeof card.image === "string" && card.image !== "");

  const videoId = getYoutubeId(youtubeUrl);
  const gridInitialProducts = (gridPage?.products || []).map((product) => ({
    id: product.id,
    typeId: product.typeId,
    name: product.name,
    imageUrl: product.imageUrl,
    typeImageUrl: product.typeImageUrl,
    details: product.details,
    price: product.price,
    priceVip: product.priceVip,
    priceWalkin: product.priceWalkin,
    stock: product.stock,
    typeMenu: product.typeMenu,
    badge: product.badge,
  }));
  const gridInitialCategories = (gridCategories || []).map((c) => ({
    category: c.category,
    imageUrl: c.imageUrl,
    count: c.count,
  }));

  const featuredProducts: FeaturedProduct[] = (recommendedProducts || []).map((product) => ({
    id: product.id,
    typeId: product.typeId,
    name: product.name,
    category: product.typeMenu ?? "หมวดอื่นๆ",
    price: product.price,
    priceVip: product.priceVip,
    priceWalkin: product.priceWalkin,
    imageUrl: product.imageUrl,
    details: product.details,
    stock: product.stock,
    badge: product.badge,
  }));

  const latestOrders = recentOrders
    .filter((order) => order.productName)
    .slice(0, 12);

  return (
    <div className="mt-4 sm:mt-6 space-y-10 sm:space-y-12">
      <HomeStatsBar
        usersCount={usersCount}
        productCount={productCount}
        totalStock={totalStock}
        ordersCount={ordersCount}
      />

      {shortcutsEnabled && shortcutCards.length > 0 && (
        <section className="grid grid-cols-2 gap-3 sm:gap-4">
          {shortcutCards.map((card, index) => {
            const cardContent = (
              <div className="relative aspect-[480/200] w-full overflow-hidden rounded-xl border border-[var(--theme-color)]/30 bg-zinc-50 shadow-sm transition-all duration-300 hover:scale-[1.015] hover:shadow-md hover:border-[var(--theme-color)]/60">
                <img
                  src={card.image}
                  alt={`Shortcut ${index + 1}`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
            );

            if (card.link) {
              return (
                <a
                  key={index}
                  href={card.link}
                  className="block w-full"
                >
                  {cardContent}
                </a>
              );
            }

            return (
              <div key={index} className="w-full">
                {cardContent}
              </div>
            );
          })}
        </section>
      )}

      {youtubeEnabled && videoId && (
        <section className="flex flex-col items-center justify-center py-2">
          <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-[var(--theme-color)]/30 bg-white p-3 shadow-md shadow-[var(--theme-color)]/10">
            <div className="aspect-video w-full">
              <iframe
                className="h-full w-full rounded-xl"
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}`}
                title="YouTube video player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                style={{ border: 0 }}
              ></iframe>
            </div>
            {youtubeTitle && (
              <p className="mt-2.5 text-center text-sm font-semibold text-[#0B0B0B]">
                {youtubeTitle}
              </p>
            )}
          </div>
        </section>
      )}

      {moviesEnabled && moviePosters.length > 0 && (
        <section className="space-y-4 rounded-xl border border-[var(--theme-color)]/30 bg-white p-5 shadow-sm shadow-[var(--theme-color)]/10">
          <div className="text-center space-y-0.5">
            <p className="text-xs font-bold text-[var(--theme-color)] uppercase tracking-wider">NEW RELEASES</p>
            <h2 className="text-lg font-bold text-[#0B0B0B]">แนะนำหนังใหม่น่าดู</h2>
          </div>
          
          <MovieGallery posters={moviePosters} />
        </section>
      )}


      {featuredEnabled && featuredProducts.length > 0 ? (
        <section className="space-y-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--theme-color)]">
                <Sparkles className="size-4" />
                สินค้าแนะนำสำหรับคุณ
              </div>
              <h2 className="flex items-center gap-2 text-2xl font-semibold text-[#0B0B0B]">
                <span className="flex size-8 items-center justify-center rounded-full bg-[var(--theme-color)]/10 text-[var(--theme-color)]">
                  <Crown className="size-4" />
                </span>
                สินค้าขายดีและน่าสนใจ
              </h2>
              <p className="text-sm text-[#6B7280]">
                เรารวบรวมสินค้าที่ได้รับความนิยมและคุ้มค่าที่สุดมาไว้ให้คุณที่นี่
              </p>
            </div>
          </div>

          {/* Mobile: 2 columns minimalist layout */}
          <div className="grid grid-cols-2 gap-4 md:hidden">
            {featuredProducts.slice(0, 8).map((product) => (
              <FeaturedProductCard key={product.id} product={product} />
            ))}
          </div>

          {/* Desktop: Full details layout */}
          <div className="hidden md:grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {featuredProducts.slice(0, 8).map((product) => (
              <FeaturedProductCardDesktop key={product.id} product={product} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h2 className="flex items-center gap-2 text-2xl font-semibold text-[#0B0B0B]">
              <span className="flex size-8 items-center justify-center rounded-full bg-[var(--theme-color)]/10 text-[var(--theme-color)]">
                <ShoppingBasket className="size-4" />
              </span>
              สินค้าพร้อมให้เช่าทั้งหมด
            </h2>
            <p className="text-sm text-[#6B7280]">
              ค้นหา จัดกลุ่ม และเลือกแพ็กเกจที่เหมาะกับการใช้งานของคุณได้จากรายการด้านล่าง
            </p>
          </div>
        </div>

        <ProductsGridClient
          initialProducts={gridInitialProducts}
          initialTotal={gridPage.total}
          initialTotalPages={Math.max(1, Math.ceil(gridPage.total / GRID_PAGE_SIZE))}
          initialCategories={gridInitialCategories}
        />
      </section>
    </div>
  );
}

function RecentOrderChip({ order }: { order: RecentOrder }) {
  const initial = (order.productName || "").slice(0, 1).toUpperCase();
  const imageUrl = order.productImage ?? "/logos/default.svg";
  const isRemoteLogo = imageUrl.startsWith("http");
  return (
    <div className="flex min-w-[200px] sm:min-w-[260px] items-center gap-2 sm:gap-3 rounded-lg border border-[var(--theme-color)]/30 bg-white px-3 sm:px-4 py-2 text-[#0B0B0B] shadow-sm shadow-[var(--theme-color)]/10">
      <span className="relative flex size-9 items-center justify-center overflow-hidden rounded-md bg-[#F4F4F5]">
        <Image
          src={imageUrl}
          alt={order.productName}
          fill
          sizes="36px"
          className="object-contain"
          unoptimized={isRemoteLogo}
        />
        <span className="sr-only">{initial}</span>
      </span>
      <div className="flex min-w-0 flex-col text-left">
        <p className="truncate text-sm font-semibold">{order.productName}</p>
        <span className="text-xs text-[#6B7280]">
          {formatOrderTimestamp(order.purchaseDate ?? order.createdAt)}
        </span>
      </div>
    </div>
  );
}

function SupportSection() {
  const items = [
    {
      icon: ShieldCheck,
      title: "รับประกันเต็มจำนวน",
      description: "เปลี่ยนบัญชีใหม่ให้ทันทีหากใช้งานไม่ได้ภายในระยะเวลาที่ตกลง",
    },
    {
      icon: Clock3,
      title: "ตอบกลับเร็ว",
      description: "ทีมงานพร้อมดูแลตลอดวัน ไม่ปล่อยให้ลูกค้ารอนาน",
    },
    {
      icon: Headset,
      title: "ทีมซัพพอร์ตมืออาชีพ",
      description: "แนะนำการใช้งานทุกขั้นตอน พร้อมคู่มือและคำแนะนำพิเศษ",
    },
    {
      icon: Sparkles,
      title: "อัปเดตราคาอัตโนมัติ",
      description: "ดึงราคาต้นทุนจากพาร์ทเนอร์โดยตรง ปรับราคาขายให้คุ้มที่สุด",
    },
  ];

  return (
    <section className="bg-[#0B0B0B] py-12 sm:py-16 text-white">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-10">
        <div className="space-y-3 text-center">
          <Badge className="mx-auto w-fit bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
            ทำไมลูกค้าถึงเลือกเรา
          </Badge>
          <h2 className="text-2xl font-bold sm:text-3xl lg:text-4xl">บริการครบ จบในหน้าเดียว</h2>
          <p className="mx-auto max-w-3xl text-sm text-white/70">
            เราออกแบบระบบให้คุณเลือกสินค้า ชำระเงิน และรับบัญชีได้รวดเร็ว พร้อมการันตีคุณภาพหลังการขาย
          </p>
        </div>

        <div className="mt-8 sm:mt-10 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {items.map(({ icon: Icon, title, description }) => (
            <Card
              key={title}
              className="border border-white/10 bg-white/5 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur"
            >
              <CardContent className="space-y-4 p-6">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-[var(--theme-color)]/15 text-[var(--theme-color)]">
                  <Icon className="size-5" />
                </span>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-white">{title}</h3>
                  <p className="text-sm text-white/70">{description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function HomeProductsSkeleton() {
  return (
    <div className="mt-10 space-y-12">
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="border-transparent bg-white/90">
            <CardContent className="space-y-3 p-5">
              <Skeleton className="h-3 w-24 rounded-full bg-[var(--theme-color)]/20" />
              <Skeleton className="h-7 w-28 rounded-full bg-[var(--theme-color)]/30" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 md:hidden">
        {Array.from({ length: 8 }).map((_, index) => (
          <Card key={index} className="border-transparent bg-white/95 shadow-sm">
            <CardContent className="flex flex-col items-center h-full p-5 text-center">
              <div className="size-32 rounded-2xl bg-[var(--theme-color)]/10 animate-pulse mb-4" />
              <div className="h-4 w-full rounded bg-[var(--theme-color)]/15 animate-pulse mb-auto min-h-[3rem]" />
              <div className="flex flex-col items-center gap-2 mt-auto pt-4 w-full">
                <div className="h-6 w-20 rounded bg-[var(--theme-color)]/20 animate-pulse" />
                <div className="h-9 w-full rounded-lg bg-[var(--theme-color)]/20 animate-pulse" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="hidden md:grid md:grid-cols-2 xl:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="border-transparent bg-white shadow-sm">
            <CardContent className="gap-6 py-6 flex h-full flex-col">
              <div className="flex flex-row items-start gap-4">
                <div className="h-16 w-16 rounded-2xl bg-[var(--theme-color)]/10 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-full rounded bg-[var(--theme-color)]/15 animate-pulse" />
                  <div className="h-4 w-20 rounded bg-[var(--theme-color)]/10 animate-pulse" />
                </div>
              </div>
              <div className="flex-1 space-y-2">
                <div className="h-3 w-full rounded bg-[var(--theme-color)]/10 animate-pulse" />
                <div className="h-3 w-full rounded bg-[var(--theme-color)]/10 animate-pulse" />
                <div className="h-3 w-3/4 rounded bg-[var(--theme-color)]/10 animate-pulse" />
              </div>
              <div className="mt-auto space-y-4">
                <div className="h-16 rounded-2xl bg-[var(--theme-color)]/10 animate-pulse" />
                <div className="h-4 w-full rounded bg-[var(--theme-color)]/10 animate-pulse" />
                <div className="h-10 w-full rounded-xl bg-[var(--theme-color)]/20 animate-pulse" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function getYoutubeId(url: string | null): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}
