import type { ExternalProduct } from "@/lib/products/types";
import type { ApiProvider } from "@/lib/api-providers/types";
import {
  fetchGafiwShopProducts,
  fetchPeamSub24hrProducts,
  buyGafiwShopProduct,
  buyPeamSub24hrProduct,
  fetchGafiwShopOrderHistory,
  fetchPeamSub24hrOrderHistory,
} from "./external-adapters";

/**
 * Fetch products from external API based on provider type
 */
export async function fetchExternalProducts(provider: ApiProvider): Promise<ExternalProduct[]> {
  // Determine API format based on provider name or endpoint
  if (provider.name === "peamsub24hr" || provider.productEndpoint?.includes("peamsub24hr.com")) {
    return fetchPeamSub24hrProducts(provider);
  }
  
  // Default to GafiwShop format
  return fetchGafiwShopProducts(provider);
}

/**
 * Buy product from external API based on provider type
 */
export async function buyExternalProduct({
  typeId,
  usernameBuy,
  provider,
  reference,
}: {
  typeId: string;
  usernameBuy?: string | null;
  provider: ApiProvider;
  reference?: string;
}) {
  // Determine API format based on provider name or endpoint
  if (provider.name === "peamsub24hr" || provider.buyEndpoint?.includes("peamsub24hr.com")) {
    return buyPeamSub24hrProduct({
      typeId,
      usernameBuy,
      provider,
      reference,
    });
  }
  
  // Default to GafiwShop format
  return buyGafiwShopProduct({
    typeId,
    usernameBuy,
    provider,
  });
}

/**
 * Fetch order history from external API based on provider type
 */
export async function fetchExternalOrderHistory({
  usernameBuy,
  limit,
  provider,
  references,
}: {
  usernameBuy?: string | null;
  limit?: number | "all";
  provider: ApiProvider;
  references?: string[];
}) {
  // Determine API format based on provider name or endpoint
  if (provider.name === "peamsub24hr" || provider.historyEndpoint?.includes("peamsub24hr.com")) {
    return fetchPeamSub24hrOrderHistory({
      usernameBuy,
      limit,
      provider,
      references,
    });
  }
  
  // Default to GafiwShop format
  return fetchGafiwShopOrderHistory({
    usernameBuy,
    limit,
    provider,
  });
}

export type ExternalPurchaseResult = Awaited<ReturnType<typeof buyExternalProduct>>;
export type ExternalOrderHistoryResult = Awaited<
  ReturnType<typeof fetchExternalOrderHistory>
>;
