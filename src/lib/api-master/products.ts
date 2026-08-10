import { MasterProduct } from "@/types/product";
import { getSettingValue } from "@/lib/settings/repository";

type JsonRecord = Record<string, unknown>;

export type MasterPurchaseAccount = {
  email?: string;
  password?: string;
  details?: string;
};

export type MasterPurchaseResult = {
  success: boolean;
  productName?: string;
  accounts?: MasterPurchaseAccount[];
  orderId?: string;
  remainingStock?: number;
  message?: string;
  retryable?: boolean;
  httpStatus?: number;
};

export type MasterPurchaseRequestOptions = {
  masterUrl: string;
  apiKey: string;
  productId: string;
  quantity: number;
  idempotencyKey: string;
  fetcher?: typeof fetch;
  wait?: (milliseconds: number) => Promise<void>;
};

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function finiteNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    const parsed = Number(value);
    if (value !== null && value !== "" && Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

export function normalizeMasterProduct(value: unknown): MasterProduct | null {
  if (!isJsonRecord(value)) return null;

  const id = nonEmptyString(value.id, value.type_id, value.typeId);
  const typeId = nonEmptyString(value.type_id, value.typeId, value.id);
  const name = nonEmptyString(value.name);

  if (!id || !typeId || !name) return null;

  return {
    id,
    typeId,
    type_id: typeId,
    name,
    description: nonEmptyString(value.description, value.details) ?? "",
    image_url: nonEmptyString(value.image_url, value.imageUrl) ?? "",
    cost_price: finiteNumber(value.cost_price, value.price) ?? 0,
    price: finiteNumber(value.price, value.cost_price),
    category:
      nonEmptyString(value.category, value.type_menu) ?? "General",
    category_id: nonEmptyString(value.category_id) ?? null,
    type_menu: nonEmptyString(value.type_menu) ?? null,
    status: nonEmptyString(value.status),
    stock: finiteNumber(value.stock),
  };
}

function extractMasterProducts(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (!isJsonRecord(value)) return [];
  if (Array.isArray(value.data)) return value.data;
  if (Array.isArray(value.products)) return value.products;
  return [];
}

function resolveMasterImageUrl(value: string, masterUrl: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    return new URL(trimmed, `${masterUrl}/`).toString();
  } catch {
    return trimmed;
  }
}

export async function fetchProductsFromMaster(): Promise<MasterProduct[]> {
  const masterUrl = (await getSettingValue("MASTER_DOMAIN_URL")) || process.env.NEXT_PUBLIC_MASTER_DOMAIN_URL;
  const apiKey = (await getSettingValue("MASTER_API_KEY")) || process.env.MASTER_API_KEY;

  if (!masterUrl || !apiKey) {
    console.error("Missing master API configuration in database or environment variables");
    return [];
  }

  try {
    const cleanUrl = masterUrl.endsWith("/") ? masterUrl.slice(0, -1) : masterUrl;
    const res = await fetch(`${cleanUrl}/api/v1/products`, {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      next: { revalidate: 60 }, // Revalidate every 60 seconds (optional caching)
    });

    if (!res.ok) {
      console.error(`Failed to fetch master products. Status: ${res.status}`);
      return [];
    }

    const data: unknown = await res.json();
    const products = extractMasterProducts(data)
      .map(normalizeMasterProduct)
      .filter((product): product is MasterProduct => product !== null);

    // The master API can return relative paths such as /uploads/products/...
    // Resolve them once so storefront fallbacks remain valid on the child site.
    return products.map((product) => ({
      ...product,
      image_url: resolveMasterImageUrl(product.image_url, cleanUrl),
    }));
  } catch (error) {
    console.error("Error fetching master products:", error);
    return [];
  }
}

function normalizePurchaseAccount(value: unknown): MasterPurchaseAccount | null {
  if (typeof value === "string") {
    return value.trim() ? { details: value } : null;
  }
  if (!isJsonRecord(value)) return null;

  const account: MasterPurchaseAccount = {
    email: nonEmptyString(value.email),
    password: nonEmptyString(value.password),
    details: nonEmptyString(value.details, value.textdb),
  };

  return account.email || account.password || account.details ? account : null;
}

export function normalizeMasterPurchaseResponse(
  value: unknown,
  httpStatus: number
): MasterPurchaseResult {
  if (!isJsonRecord(value)) {
    return {
      success: false,
      message: `Master API returned an invalid response (HTTP ${httpStatus})`,
      httpStatus,
    };
  }

  if (value.success === true && Array.isArray(value.accountData)) {
    return {
      success: true,
      productName: nonEmptyString(value.productName),
      accounts: value.accountData
        .map(normalizePurchaseAccount)
        .filter((account): account is MasterPurchaseAccount => account !== null),
      orderId: nonEmptyString(value.orderId),
      remainingStock: finiteNumber(value.remainingStock),
      httpStatus,
    };
  }

  // Backward compatibility with the former /api/v1/tenant/buy response.
  if (value.success === true && isJsonRecord(value.order)) {
    const account = normalizePurchaseAccount(value.order.textdb);
    return {
      success: true,
      productName: nonEmptyString(value.order.productName, value.order.name),
      accounts: account ? [account] : [],
      orderId: nonEmptyString(value.order.orderId),
      httpStatus,
    };
  }

  return {
    success: false,
    message:
      nonEmptyString(value.message) ??
      `Master API rejected the purchase (HTTP ${httpStatus})`,
    retryable: value.retryable === true || httpStatus === 202,
    httpStatus,
  };
}

export async function buyProductFromMaster(
  productId: string,
  quantity: number = 1,
  idempotencyKey: string
): Promise<MasterPurchaseResult> {
  const masterUrl = (await getSettingValue("MASTER_DOMAIN_URL")) || process.env.NEXT_PUBLIC_MASTER_DOMAIN_URL;
  const apiKey = (await getSettingValue("MASTER_API_KEY")) || process.env.MASTER_API_KEY;

  if (!masterUrl || !apiKey) {
    return { success: false, message: "Missing master API configuration" };
  }

  try {
    return await requestMasterPurchase({
      masterUrl,
      apiKey,
      productId,
      quantity,
      idempotencyKey,
    });
  } catch (error: unknown) {
    console.error("Error buying product from master:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Master API request failed",
      retryable: true,
      httpStatus: 502,
    };
  }
}

export async function requestMasterPurchase({
  masterUrl,
  apiKey,
  productId,
  quantity,
  idempotencyKey,
  fetcher = fetch,
  wait = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
}: MasterPurchaseRequestOptions): Promise<MasterPurchaseResult> {
  const cleanUrl = masterUrl.endsWith("/") ? masterUrl.slice(0, -1) : masterUrl;
  let lastResult: MasterPurchaseResult | null = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const res = await fetcher(`${cleanUrl}/api/v1/buy`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        typeId: productId,
        quantity,
        requestId: idempotencyKey,
      }),
      cache: "no-store",
    });

    const data: unknown = await res.json().catch(() => null);
    const result = normalizeMasterPurchaseResponse(data, res.status);
    lastResult = result;

    if (!result.retryable || attempt === 2) {
      return result;
    }

    const retryAfterSeconds = Math.min(
      2,
      Math.max(1, Number(res.headers.get("retry-after") ?? 1))
    );
    await wait(retryAfterSeconds * 1000);
  }

  return (
    lastResult ?? {
      success: false,
      message: "Master API did not return a purchase result",
      retryable: true,
    }
  );
}
