"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ProductLivePatch } from "@/lib/products/realtime-types";
import { subscribeProductStockRealtime } from "@/lib/products/realtime-hub";

type LiveMap = Map<string, ProductLivePatch>;

type ProductStockRealtimeContextValue = {
  getLiveStock: (productId: string, fallback: number | null) => number | null;
  getLiveBadge: (
    productId: string,
    fallback: "hot_sale" | "recommended" | null
  ) => "hot_sale" | "recommended" | null;
  isLivePublished: (productId: string, fallbackPublished?: boolean) => boolean;
  getLivePrice: (productId: string, fallback: number | null) => number | null;
  getLivePriceVip: (productId: string, fallback: number | null) => number | null;
  getLivePriceWalkin: (productId: string, fallback: number | null) => number | null;
  version: number;
};

const ProductStockRealtimeContext =
  createContext<ProductStockRealtimeContextValue | null>(null);

export function ProductStockRealtimeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [liveById, setLiveById] = useState<LiveMap>(() => new Map());
  const [version, setVersion] = useState(0);

  useEffect(() => {
    return subscribeProductStockRealtime((patch) => {
      setLiveById((prev) => {
        const next = new Map(prev);
        const currentLive = next.get(patch.id);
        next.set(patch.id, {
          ...currentLive,
          ...patch,
          // If the patch doesn't contain prices (e.g. they are undefined), preserve current prices
          price: patch.price !== undefined ? patch.price : currentLive?.price,
          priceVip: patch.priceVip !== undefined ? patch.priceVip : currentLive?.priceVip,
          priceWalkin: patch.priceWalkin !== undefined ? patch.priceWalkin : currentLive?.priceWalkin,
        } as ProductLivePatch);
        return next;
      });
      setVersion((v) => v + 1);

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent<ProductLivePatch>("products:stock-changed", {
            detail: patch,
          })
        );
      }
    });
  }, []);

  const getLiveStock = useCallback(
    (productId: string, fallback: number | null) => {
      const live = liveById.get(productId);
      if (live) {
        return live.stock;
      }
      return fallback;
    },
    [liveById]
  );

  const getLiveBadge = useCallback(
    (
      productId: string,
      fallback: "hot_sale" | "recommended" | null
    ) => {
      const live = liveById.get(productId);
      if (live) {
        return live.badge;
      }
      return fallback;
    },
    [liveById]
  );

  const isLivePublished = useCallback(
    (productId: string, fallbackPublished = true) => {
      const live = liveById.get(productId);
      if (live) {
        return live.isPublished;
      }
      return fallbackPublished;
    },
    [liveById]
  );

  const getLivePrice = useCallback(
    (productId: string, fallback: number | null) => {
      const live = liveById.get(productId);
      if (live && live.price !== undefined) {
        return live.price;
      }
      return fallback;
    },
    [liveById]
  );

  const getLivePriceVip = useCallback(
    (productId: string, fallback: number | null) => {
      const live = liveById.get(productId);
      if (live && live.priceVip !== undefined) {
        return live.priceVip;
      }
      return fallback;
    },
    [liveById]
  );

  const getLivePriceWalkin = useCallback(
    (productId: string, fallback: number | null) => {
      const live = liveById.get(productId);
      if (live && live.priceWalkin !== undefined) {
        return live.priceWalkin;
      }
      return fallback;
    },
    [liveById]
  );

  const value = useMemo(
    () => ({
      getLiveStock,
      getLiveBadge,
      isLivePublished,
      getLivePrice,
      getLivePriceVip,
      getLivePriceWalkin,
      version,
    }),
    [getLiveStock, getLiveBadge, isLivePublished, getLivePrice, getLivePriceVip, getLivePriceWalkin, version]
  );

  return (
    <ProductStockRealtimeContext.Provider value={value}>
      {children}
    </ProductStockRealtimeContext.Provider>
  );
}

export function useProductStockRealtime() {
  const ctx = useContext(ProductStockRealtimeContext);
  if (!ctx) {
    throw new Error(
      "useProductStockRealtime must be used within ProductStockRealtimeProvider"
    );
  }
  return ctx;
}

export function useLiveProductStock(
  productId: string,
  fallbackStock: number | null,
  fallbackBadge: "hot_sale" | "recommended" | null = null,
  fallbackPrice: number | null = null,
  fallbackPriceVip: number | null = null,
  fallbackPriceWalkin: number | null = null
) {
  const { getLiveStock, getLiveBadge, isLivePublished, getLivePrice, getLivePriceVip, getLivePriceWalkin, version } =
    useProductStockRealtime();

  const stock = getLiveStock(productId, fallbackStock);
  const badge = getLiveBadge(productId, fallbackBadge);
  const isPublished = isLivePublished(productId, true);
  const isOutOfStock = !isPublished || (stock ?? 0) <= 0;
  const price = getLivePrice(productId, fallbackPrice);
  const priceVip = getLivePriceVip(productId, fallbackPriceVip);
  const priceWalkin = getLivePriceWalkin(productId, fallbackPriceWalkin);

  return {
    stock,
    badge,
    isPublished,
    isOutOfStock,
    price,
    priceVip,
    priceWalkin,
    version,
  };
}
