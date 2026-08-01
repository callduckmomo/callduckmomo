import { getEffectiveStockFromRecord } from "@/lib/products/stock-utils";
import type { ProductRecord } from "@/lib/products/types";
import { getSiteId } from "@/lib/site";

export type ProductLivePatch = {
  id: string;
  typeId: string;
  stock: number;
  badge: "hot_sale" | "recommended" | null;
  isPublished: boolean;
  price?: number | null;
  priceVip?: number | null;
  priceWalkin?: number | null;
};

export type ProductRealtimeRow = {
  id: string;
  type_id: string;
  stock: number | null;
  account_data: unknown;
  badge: "hot_sale" | "recommended" | null;
  is_published: boolean;
  price?: number | null;
  price_vip?: number | null;
  price_walkin?: number | null;

  price_main?: number | null;
  price_main_vip?: number | null;
  price_main_walkin?: number | null;

  price_child1?: number | null;
  price_child1_vip?: number | null;
  price_child1_walkin?: number | null;

  price_child2?: number | null;
  price_child2_vip?: number | null;
  price_child2_walkin?: number | null;
  [key: string]: unknown;
};

export function rowToProductLivePatch(
  row: ProductRealtimeRow
): ProductLivePatch | null {
  if (!row?.id || !row?.type_id) {
    return null;
  }

  const siteId = getSiteId();
  let price = row.price;
  let priceVip = row.price_vip;
  let priceWalkin = row.price_walkin;
  let isPublished = Boolean(row.is_published);

  if (siteId === "main") {
    price = row.price_main !== undefined ? row.price_main : row.price;
    priceVip = row.price_main_vip !== undefined ? row.price_main_vip : row.price_vip;
    priceWalkin = row.price_main_walkin !== undefined ? row.price_main_walkin : row.price_walkin;
  } else {
    // Never leak the main shop's prices into a child shop. A missing scoped
    // price means "keep the rendered fallback" until the live API reconciles.
    price = undefined;
    priceVip = undefined;
    priceWalkin = undefined;
    const childPriceKey = `price_${siteId}`;
    const childVipKey = `price_${siteId}_vip`;
    const childWalkinKey = `price_${siteId}_walkin`;
    const childPublishedKey = `published_${siteId}`;

    if (row[childPriceKey] !== undefined && row[childPriceKey] !== null) {
      price = row[childPriceKey] as number;
    }
    if (row[childVipKey] !== undefined && row[childVipKey] !== null) {
      priceVip = row[childVipKey] as number;
    }
    if (row[childWalkinKey] !== undefined && row[childWalkinKey] !== null) {
      priceWalkin = row[childWalkinKey] as number;
    }
    if (row[childPublishedKey] !== undefined) {
      isPublished = Boolean(row[childPublishedKey]);
    }
  }

  return {
    id: row.id,
    typeId: row.type_id,
    stock: getEffectiveStockFromRecord({
      stock: row.stock,
      account_data: row.account_data as ProductRecord["account_data"],
    }),
    badge: row.badge ?? null,
    isPublished,
    price: price !== undefined ? (price != null ? Number(price) : null) : undefined,
    priceVip: priceVip !== undefined ? (priceVip != null ? Number(priceVip) : null) : undefined,
    priceWalkin: priceWalkin !== undefined ? (priceWalkin != null ? Number(priceWalkin) : null) : undefined,
  };
}
