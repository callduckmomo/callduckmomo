"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PurchaseProductButton } from "@/components/orders/purchase-product-button";
import { ProductPriceDisplay } from "@/components/products/product-price-display";
import { VipBadge } from "@/components/products/vip-badge";
import { useLiveProductStock } from "@/components/products/product-stock-realtime-provider";
import { cn, normalizeNewlines } from "@/lib/utils";

export type FeaturedProduct = {
  id: string;
  typeId: string;
  name: string;
  category: string;
  price: number | null;
  priceVip: number | null;
  priceWalkin: number | null;
  imageUrl: string | null;
  details: string | null;
  stock: number | null;
  badge: "hot_sale" | "recommended" | null;
};

export function FeaturedProductCard({ product }: { product: FeaturedProduct }) {
  const { stock, badge, isOutOfStock, price, priceVip, priceWalkin } = useLiveProductStock(
    product.id,
    product.stock,
    product.badge,
    product.price,
    product.priceVip,
    product.priceWalkin
  );
  const logoUrl = product.imageUrl ?? "/logos/default.svg";
  const isRemoteLogo = logoUrl.startsWith("http");
  const hasVipPrice = priceVip != null;

  return (
    <Card
      className={cn(
        "group relative flex h-full flex-col border shadow-sm transition-all",
        isOutOfStock
          ? "border-[#D1D5DB]/60 bg-gray-50/95 grayscale hover:shadow-sm hover:border-[#D1D5DB]"
          : "border-[var(--theme-color)]/30 bg-white/95 hover:shadow-md hover:border-[var(--theme-color)]/40"
      )}
    >
      {badge === "hot_sale" && !isOutOfStock ? (
        <Badge className="absolute right-2 top-2 z-10 bg-red-500 text-white text-xs font-semibold px-2 py-0.5 shadow-sm">
          HOT SALE
        </Badge>
      ) : badge === "recommended" && !isOutOfStock ? (
        <Badge className="absolute right-2 top-2 z-10 bg-green-500 text-white text-xs font-semibold px-2 py-0.5 shadow-sm">
          แนะนำ
        </Badge>
      ) : null}
      {isOutOfStock && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <Badge className="bg-gray-600 text-white text-xs font-semibold px-3 py-1.5 shadow-lg">
            สินค้าหมด
          </Badge>
        </div>
      )}
      {hasVipPrice && <VipBadge />}
      <CardContent className="flex flex-col items-center h-full p-5 text-center">
        <div className="relative mb-4 w-full overflow-hidden rounded-2xl aspect-square">
          <Image
            src={logoUrl}
            alt={normalizeNewlines(product.name)}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
            unoptimized={isRemoteLogo}
          />
        </div>
        <CardTitle
          className={cn(
            "line-clamp-2 text-center text-base font-semibold leading-tight whitespace-pre-line mb-auto min-h-[3rem]",
            isOutOfStock ? "text-gray-500" : "text-[#0B0B0B]"
          )}
        >
          {normalizeNewlines(product.name)}
        </CardTitle>
        <div className="flex flex-col items-center gap-2 mt-auto pt-4 w-full">
          <ProductPriceDisplay
            price={price}
            priceVip={priceVip}
            priceWalkin={priceWalkin}
            isOutOfStock={isOutOfStock}
          />
          <div className="w-full text-center">
            <span className="text-xs text-[#6B7280]">
              สต็อก:{" "}
              <span className="font-semibold text-[#0B0B0B]">
                {(stock ?? 0).toLocaleString()}
              </span>{" "}
              ชิ้น
            </span>
          </div>
          <PurchaseProductButton
            typeId={product.typeId}
            productName={product.name}
            productDescription={product.details}
            price={price}
            priceVip={priceVip}
            priceWalkin={priceWalkin}
            stock={stock}
            className="w-full rounded-lg text-sm py-2"
            disabled={isOutOfStock}
          >
            ซื้อทันที
          </PurchaseProductButton>
        </div>
      </CardContent>
    </Card>
  );
}

export function FeaturedProductCardDesktop({
  product,
}: {
  product: FeaturedProduct;
}) {
  const { stock, badge, isOutOfStock, price, priceVip, priceWalkin } = useLiveProductStock(
    product.id,
    product.stock,
    product.badge,
    product.price,
    product.priceVip,
    product.priceWalkin
  );
  const logoUrl = product.imageUrl ?? "/logos/default.svg";
  const isRemoteLogo = logoUrl.startsWith("http");

  return (
    <Card
      className={cn(
        "group relative flex h-full flex-col border shadow-sm shadow-black/5 transition-all",
        isOutOfStock
          ? "border-[#D1D5DB]/80 bg-gray-50 grayscale hover:shadow-sm hover:border-[#D1D5DB]"
          : "border-[var(--theme-color)]/30 bg-white hover:shadow-md hover:border-[var(--theme-color)]/40"
      )}
    >
      {badge === "hot_sale" && !isOutOfStock ? (
        <Badge className="absolute right-4 top-4 z-10 bg-red-500 text-white text-xs font-semibold px-2 py-0.5 shadow-sm">
          HOT SALE
        </Badge>
      ) : badge === "recommended" && !isOutOfStock ? (
        <Badge className="absolute left-4 top-4 z-10 bg-green-500 text-white text-xs font-semibold px-2 py-0.5 shadow-sm">
          แนะนำ
        </Badge>
      ) : null}
      {priceVip != null && <VipBadge />}
      {isOutOfStock && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <Badge className="bg-gray-600 text-white text-sm font-semibold px-4 py-2 shadow-lg">
            สินค้าหมด
          </Badge>
        </div>
      )}
      <CardContent className="gap-6 py-6 flex h-full flex-col">
        <CardHeader className="flex flex-row items-start gap-4 px-0 pt-0">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-[#F4F4F5]">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={normalizeNewlines(product.name)}
                fill
                sizes="64px"
                className="object-contain p-2"
                unoptimized={isRemoteLogo}
              />
            ) : null}
          </div>
          <div className="flex-1 min-w-0 pr-12">
            <CardTitle
              className={cn(
                "text-lg font-semibold whitespace-pre-line line-clamp-2 leading-tight mb-2",
                isOutOfStock ? "text-gray-500" : "text-[#0B0B0B]"
              )}
            >
              {normalizeNewlines(product.name)}
            </CardTitle>
            {product.category && product.category !== "หมวดอื่นๆ" ? (
              <Badge
                variant="secondary"
                className={cn(
                  "text-xs",
                  isOutOfStock
                    ? "bg-gray-200 text-gray-500"
                    : "bg-[var(--theme-color)]/10 text-[var(--theme-color)]"
                )}
              >
                {product.category.toUpperCase()}
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <div className="flex-1 space-y-3 px-0">
          {product.details ? (
            <p
              className={cn(
                "text-sm whitespace-pre-line line-clamp-4 leading-relaxed",
                isOutOfStock ? "text-gray-400" : "text-[#555555]"
              )}
            >
              {normalizeNewlines(product.details.replace(/<[^>]+>/g, ""))}
            </p>
          ) : null}
        </div>
        <div className="mt-auto space-y-4 px-0">
          <div className="flex items-center justify-between rounded-2xl bg-[#F9FAFB] px-4 py-3">
            <div className="flex-1">
              <ProductPriceDisplay
                price={price}
                priceVip={priceVip}
                priceWalkin={priceWalkin}
                isOutOfStock={isOutOfStock}
                className="text-xl font-semibold"
              />
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-[#6B7280]">
            <span>สต็อก: {(stock ?? 0).toLocaleString()} ชิ้น</span>
            <span className="text-[#9CA3AF]">รหัส: {product.typeId}</span>
          </div>
          <PurchaseProductButton
            typeId={product.typeId}
            productName={product.name}
            productDescription={product.details}
            price={price}
            priceVip={priceVip}
            priceWalkin={priceWalkin}
            stock={stock}
            className="w-full rounded-xl"
            disabled={isOutOfStock}
          >
            ซื้อทันที
          </PurchaseProductButton>
        </div>
      </CardContent>
    </Card>
  );
}
