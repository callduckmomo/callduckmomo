/**
 * Adapters for different API provider formats
 */

import type { ExternalProduct } from "@/lib/products/types";
import type { ApiProvider } from "@/lib/api-providers/types";
import { createBasicAuthHeader } from "@/lib/api-providers/utils";

// GafiwShop API Format
type GafiwShopProductResponse = {
  ok: boolean;
  count: number;
  data: Array<{
    name: string;
    imageapi: string;
    details: string;
    price: number | string;
    pricevip: number | string;
    stock: number | string;
    type_menu: string;
    type_id: string;
  }>;
};

type GafiwShopPurchaseResponse = {
  ok: boolean;
  status: string;
  message: string;
  data: {
    uid: number;
    name: string;
    imageapi: string;
    textdb: string;
    point: number;
    date: string;
  };
};

type GafiwShopHistoryResponse = {
  ok: boolean;
  ref: string;
  owner: string;
  username_buy?: string;
  limit: number | string;
  count: number;
  data: Array<{
    id: string;
    name: string;
    image: string;
    details: string;
    price: string | number;
    date: string;
    type: string;
  }>;
};

// PeamSub24hr API Format
type PeamSub24hrProductResponse = {
  statusCode: number;
  data: Array<{
    id: number;
    name: string;
    price: number;
    pricevip: number;
    agent_price: number;
    stock: number;
    img: string;
    des: string;
  }>;
};

type PeamSub24hrPurchaseResponse = {
  statusCode: number;
  data?: string; // Product data as string
  error?: string;
  message?: string;
};

type PeamSub24hrHistoryResponse = {
  statusCode: number;
  data?: Array<{
    id: number;
    productName: string;
    productId: string;
    prize: string;
    img: string;
    price: string;
    refId: string;
    resellerId: string;
    status: string;
    date: string;
  }>;
  error?: string;
  message?: string;
};

/**
 * Fetch products from GafiwShop API
 */
export async function fetchGafiwShopProducts(
  provider: ApiProvider
): Promise<ExternalProduct[]> {
  if (!provider.productEndpoint) {
    throw new Error(`API provider ${provider.name} ไม่มี product endpoint`);
  }

  const response = await fetch(provider.productEndpoint, {
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("เกิดความผิดพลาด กรุณาติดต่อแอดมินและลองใหม่ภายหลัง");
  }

  const json = (await response.json()) as GafiwShopProductResponse;
  if (!json.ok || !Array.isArray(json.data)) {
    throw new Error("เกิดความผิดพลาด กรุณาติดต่อแอดมินและลองใหม่ภายหลัง");
  }

  return json.data.map((item) => ({
    name: item.name,
    imageapi: item.imageapi,
    details: item.details,
    price: Number(item.price ?? 0),
    pricevip: Number(item.pricevip ?? 0),
    stock: Number(item.stock ?? 0),
    type_menu: item.type_menu,
    type_id: item.type_id,
  }));
}

/**
 * Category mapping for PeamSub24hr products
 * Maps various product name patterns to standardized category names
 */
const CATEGORY_MAPPING: Record<string, string[]> = {
  "Netflix": ["Netflix", "NF", "น็อกซ์"],
  "Disney": ["Disney", "Disney+", "ดิสนีย์"],
  "Spotify": ["Spotify", "SPOTIFY"],
  "Prime Video": ["Prime", "Amazon Prime", "Prime Video"],
  "Bilibili": ["Bilibili", "BILIBILI"],
  "Canva": ["Canva", "CANVA"],
  "CAPCUT": ["CAPCUT", "CapCut", "Cap Cut"],
  "iQiyi": ["iQiyi", "IQIYI", "IQiyi"],
  "Drama Box": ["Drama Box", "DramaBox", "DRAMA BOX"],
  "Kalos TV": ["Kalos TV", "KalosTV", "KALOS TV"],
  "Max": ["Max", "MAX", "HBO Max"],
  "Mail": ["Mail", "MAIL", "Email"],
  "MonoMax": ["MonoMax", "MONOMAX", "Mono Max"],
  "NetShort": ["NetShort", "NETSHORT", "Net Short"],
  "Viu": ["Viu", "VIU"],
  "WeTV": ["WeTV", "WETV", "We TV"],
};

/**
 * Extract category (type_menu) from product name for PeamSub24hr
 * PeamSub24hr includes app name in product name (e.g., "NETFLIX Premium 1 Month", "Disney+ Annual")
 * We extract the app name from the product name and map it to standardized category
 */
function extractCategoryFromName(productName: string): string {
  const name = productName.trim();
  
  if (!name) {
    return "อื่นๆ";
  }

  const upperName = name.toUpperCase();
  const words = name.split(/\s+/);

  // Check against category mapping (case-insensitive)
  for (const [category, patterns] of Object.entries(CATEGORY_MAPPING)) {
    for (const pattern of patterns) {
      const upperPattern = pattern.toUpperCase();
      
      // Check if name starts with pattern
      if (upperName.startsWith(upperPattern)) {
        return category;
      }
      
      // Check if pattern appears in the name (with word boundaries)
      // Remove spaces from pattern for matching
      const patternNoSpace = upperPattern.replace(/\s+/g, "");
      const nameNoSpace = upperName.replace(/\s+/g, "");
      
      if (nameNoSpace.includes(patternNoSpace)) {
        return category;
      }
      
      // Check first 2-3 words for multi-word patterns
      if (pattern.includes(" ")) {
        const firstWords = words.slice(0, 3).join(" ").toUpperCase();
        if (firstWords.includes(upperPattern)) {
          return category;
        }
      }
      
      // Check individual words
      for (const word of words) {
        if (word.toUpperCase() === upperPattern || word.toUpperCase().includes(upperPattern)) {
          return category;
        }
      }
    }
  }

  // If no match, try to extract first word(s) that might be app name
  // Check first word
  if (words.length > 0) {
    const firstWord = words[0];
    // If first word is all uppercase and has more than 1 character, use it
    if (firstWord === firstWord.toUpperCase() && firstWord.length > 1 && /^[A-Z]+$/.test(firstWord)) {
      return firstWord;
    }
  }

  // Check first 2 words combined (for cases like "DISNEY PLUS")
  if (words.length >= 2) {
    const firstTwo = `${words[0]} ${words[1]}`;
    const firstTwoUpper = firstTwo.toUpperCase();
    
    // Check if combined words match any category pattern
    for (const [category, patterns] of Object.entries(CATEGORY_MAPPING)) {
      for (const pattern of patterns) {
        const patternUpper = pattern.toUpperCase();
        if (firstTwoUpper.includes(patternUpper) || patternUpper.includes(firstTwoUpper.replace(/\s+/g, ""))) {
          return category;
        }
      }
    }
    
    // If first two words are uppercase, use them
    if (firstTwo === firstTwoUpper && firstTwo.length > 2) {
      return firstTwo.replace(/\s+/g, ""); // Remove spaces
    }
  }

  // Fallback: use first word capitalized
  return words[0] ? words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase() : "อื่นๆ";
}

/**
 * Fetch products from PeamSub24hr API
 */
export async function fetchPeamSub24hrProducts(
  provider: ApiProvider
): Promise<ExternalProduct[]> {
  if (!provider.productEndpoint) {
    throw new Error(`API provider ${provider.name} ไม่มี product endpoint`);
  }

  if (!provider.apiKey) {
    throw new Error(`ไม่พบ API key สำหรับ ${provider.displayName}`);
  }

  const response = await fetch(provider.productEndpoint, {
    headers: {
      Accept: "application/json",
      Authorization: createBasicAuthHeader(provider.apiKey),
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("เกิดความผิดพลาด กรุณาติดต่อแอดมินและลองใหม่ภายหลัง");
  }

  const json = (await response.json()) as PeamSub24hrProductResponse;
  if (json.statusCode !== 200 || !Array.isArray(json.data)) {
    throw new Error("เกิดความผิดพลาด กรุณาติดต่อแอดมินและลองใหม่ภายหลัง");
  }

  return json.data.map((item) => {
    // Extract category from product name
    const category = extractCategoryFromName(item.name);
    
    return {
      name: item.name, // Keep full name
      imageapi: item.img,
      details: item.des || "",
      price: Number(item.price ?? 0),
      pricevip: Number(item.pricevip ?? 0), // ใช้ pricevip เป็นต้นทุน
      stock: Number(item.stock ?? 0),
      type_menu: category, // Use extracted category
      type_id: String(item.id), // ใช้ id เป็น type_id
    };
  });
}

/**
 * Buy product from GafiwShop API
 */
export async function buyGafiwShopProduct({
  typeId,
  usernameBuy,
  provider,
}: {
  typeId: string;
  usernameBuy?: string | null;
  provider: ApiProvider;
}) {
  if (!provider.buyEndpoint) {
    throw new Error(`API provider ${provider.name} ไม่มี buy endpoint`);
  }

  if (!provider.apiKey) {
    throw new Error(`ไม่พบ API key สำหรับ ${provider.displayName}`);
  }

  const formData = new URLSearchParams();
  formData.append("keyapi", provider.apiKey);
  formData.append("type_id", typeId);

  if (usernameBuy && usernameBuy.trim().length > 0) {
    formData.append("username_buy", usernameBuy.trim());
  }

  const response = await fetch(provider.buyEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      Accept: "application/json",
    },
    body: formData.toString(),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("เกิดความผิดพลาด กรุณาติดต่อแอดมินและลองใหม่ภายหลัง");
  }

  const json = (await response.json().catch(() => undefined)) as
    | GafiwShopPurchaseResponse
    | undefined;

  if (!json || !json.ok) {
    throw new Error("เกิดความผิดพลาด กรุณาติดต่อแอดมินและลองใหม่ภายหลัง");
  }

  return {
    ok: true,
    status: json.status,
    message: json.message,
    usernameBuy: usernameBuy ?? null,
    data: json.data,
  };
}

/**
 * Buy product from PeamSub24hr API
 */
export async function buyPeamSub24hrProduct({
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
  if (!provider.buyEndpoint) {
    throw new Error(`API provider ${provider.name} ไม่มี buy endpoint`);
  }

  if (!provider.apiKey) {
    throw new Error(`ไม่พบ API key สำหรับ ${provider.displayName}`);
  }

  const response = await fetch(provider.buyEndpoint, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: createBasicAuthHeader(provider.apiKey),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: Number(typeId),
      reference: reference || usernameBuy || `ORDER_${Date.now()}`,
    }),
    cache: "no-store",
  });

  const json = (await response.json().catch(() => undefined)) as
    | PeamSub24hrPurchaseResponse
    | undefined;

  // Check for error response (statusCode !== 200)
  if (!json || json.statusCode !== 200) {
    const errorMessage =
      json?.message || json?.error || "เกิดความผิดพลาด กรุณาติดต่อแอดมินและลองใหม่ภายหลัง";
    throw new Error(errorMessage);
  }

  // Check if data exists (should be a string according to API spec)
  if (!json.data || typeof json.data !== "string") {
    throw new Error("ไม่ได้รับข้อมูลสินค้าจาก API");
  }

  // PeamSub24hr returns product data as string in data field
  return {
    ok: true,
    status: "success",
    message: "ซื้อสินค้าสำเร็จ",
    usernameBuy: usernameBuy ?? null,
    data: {
      uid: Number(typeId),
      name: json.data,
      imageapi: "",
      textdb: json.data, // Store the full product data string
      point: 0,
      date: new Date().toISOString(),
    },
  };
}

/**
 * Fetch order history from GafiwShop API
 */
export async function fetchGafiwShopOrderHistory({
  usernameBuy,
  limit,
  provider,
}: {
  usernameBuy?: string | null;
  limit?: number | "all";
  provider: ApiProvider;
}) {
  if (!provider.historyEndpoint) {
    throw new Error(`API provider ${provider.name} ไม่มี history endpoint`);
  }

  if (!provider.apiKey) {
    throw new Error(`ไม่พบ API key สำหรับ ${provider.displayName}`);
  }

  const url = new URL(provider.historyEndpoint);
  url.searchParams.set("keyapi", provider.apiKey);

  if (usernameBuy && usernameBuy.trim().length > 0) {
    url.searchParams.set("username_buy", usernameBuy.trim());
  }

  if (limit && limit !== "all") {
    url.searchParams.set("limit", String(limit));
  }

  if (limit === "all") {
    url.searchParams.set("limit", "all");
  }

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("เกิดความผิดพลาด กรุณาติดต่อแอดมินและลองใหม่ภายหลัง");
  }

  const json = (await response.json().catch(() => undefined)) as
    | GafiwShopHistoryResponse
    | undefined;

  if (!json || !json.ok || !Array.isArray(json.data)) {
    throw new Error("เกิดความผิดพลาด กรุณาติดต่อแอดมินและลองใหม่ภายหลัง");
  }

  return {
    ok: true,
    ref: json.ref,
    owner: json.owner,
    username_buy: json.username_buy,
    limit: json.limit,
    count: json.count,
    data: json.data.map((item) => ({
      ...item,
      price: Number(item.price ?? 0),
    })),
  };
}

/**
 * Fetch order history from PeamSub24hr API
 */
export async function fetchPeamSub24hrOrderHistory({
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
  if (!provider.historyEndpoint) {
    throw new Error(`API provider ${provider.name} ไม่มี history endpoint`);
  }

  if (!provider.apiKey) {
    throw new Error(`ไม่พบ API key สำหรับ ${provider.displayName}`);
  }

  const response = await fetch(provider.historyEndpoint, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: createBasicAuthHeader(provider.apiKey),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      references: references || [],
    }),
    cache: "no-store",
  });

  const json = (await response.json().catch(() => undefined)) as
    | PeamSub24hrHistoryResponse
    | undefined;

  // Check for error response (statusCode !== 200)
  if (!json || json.statusCode !== 200) {
    const errorMessage =
      json?.message || json?.error || "เกิดความผิดพลาด กรุณาติดต่อแอดมินและลองใหม่ภายหลัง";
    throw new Error(errorMessage);
  }

  // Check if data is an array
  if (!Array.isArray(json.data)) {
    throw new Error("ไม่ได้รับข้อมูลประวัติการซื้อจาก API");
  }

  // Convert PeamSub24hr format to GafiwShop format for consistency
  return {
    ok: true,
    ref: provider.name,
    owner: provider.name,
    username_buy: usernameBuy || undefined,
    limit: limit || "all",
    count: json.data.length,
    data: json.data.map((item) => ({
      id: String(item.id),
      name: item.productName,
      image: item.img,
      details: item.prize,
      price: Number(item.price ?? 0),
      date: item.date,
      type: item.productId,
    })),
  };
}

