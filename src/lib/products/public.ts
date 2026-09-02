import type { Product } from "@/lib/products/types";

/**
 * Product fields that are safe and sufficient for the public storefront.
 *
 * Delivery credentials and stock account records intentionally do not cross
 * this boundary. Purchase routes continue to load the full Product model from
 * the database when they need it.
 */
export type PublicProduct = Pick<
  Product,
  | "id"
  | "typeId"
  | "name"
  | "imageUrl"
  | "fallbackImageUrl"
  | "typeImageUrl"
  | "details"
  | "price"
  | "priceVip"
  | "priceWalkin"
  | "stock"
  | "typeMenu"
  | "categoryId"
  | "badge"
  | "isPublished"
>;

export function toPublicProduct(product: Product): PublicProduct {
  return {
    id: product.id,
    typeId: product.typeId,
    name: product.name,
    imageUrl: product.imageUrl,
    fallbackImageUrl: product.fallbackImageUrl ?? null,
    typeImageUrl: product.typeImageUrl,
    details: product.details,
    price: product.price,
    priceVip: product.priceVip,
    priceWalkin: product.priceWalkin,
    stock: product.stock,
    typeMenu: product.typeMenu,
    categoryId: product.categoryId,
    badge: product.badge,
    isPublished: product.isPublished,
  };
}
