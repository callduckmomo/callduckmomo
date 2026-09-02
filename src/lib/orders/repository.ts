import pool from "@/lib/mysql";
import { unstable_cache } from "next/cache";
import type { CreateOrderInput, Order } from "@/lib/orders/types";
import { randomUUID } from "crypto";
import { safeParseJson } from "@/lib/products/account-parser";
import { getSiteId } from "@/lib/site";

const globalForOrderRepository = globalThis as typeof globalThis & {
  __appbymariOrdersProductDetailsEncoding?: Promise<void>;
};

/** Upgrade installations whose old orders table used utf8mb3 for details. */
async function ensureOrderProductDetailsEncoding(): Promise<void> {
  if (!globalForOrderRepository.__appbymariOrdersProductDetailsEncoding) {
    globalForOrderRepository.__appbymariOrdersProductDetailsEncoding = (async () => {
      const [columns] = await pool.execute(
        `SELECT DATA_TYPE, CHARACTER_SET_NAME
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'orders'
           AND COLUMN_NAME = 'product_details'
         LIMIT 1`
      );
      const column = (columns as any[])[0];

      if (
        column?.DATA_TYPE?.toLowerCase() === "longtext" &&
        column?.CHARACTER_SET_NAME?.toLowerCase() === "utf8mb4"
      ) {
        return;
      }

      await pool.execute(
         `ALTER TABLE orders
         MODIFY COLUMN product_details LONGTEXT
         CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL`
      );
    })()
      .then(() => undefined)
      .catch((error) => {
        globalForOrderRepository.__appbymariOrdersProductDetailsEncoding = undefined;
        throw error;
      });
  }

  await globalForOrderRepository.__appbymariOrdersProductDetailsEncoding;
}

function parseRawResponse(value: unknown): Record<string, unknown> | null {
  if (!value) return null;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object"
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }

  return typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function getRawProductDetails(rawResponse: Record<string, unknown> | null): string | null {
  const direct = rawResponse?.textdb;
  if (typeof direct === "string" && direct.length > 0) return direct;

  const data = rawResponse?.data;
  if (data && typeof data === "object") {
    const nested = (data as Record<string, unknown>).textdb;
    if (typeof nested === "string" && nested.length > 0) return nested;
  }

  return null;
}


function toOrder(row: any): Order {
  const rawResponse = parseRawResponse(row.raw_response);
  // raw_response is stored as utf8mb4 and contains the source textdb. Prefer
  // it when available so historical orders keep their original emoji/symbols
  // even if product_details was written through the old utf8mb3 column.
  const rawProductDetails = getRawProductDetails(rawResponse);

  return {
    id: row.id,
    externalUid: row.external_uid ? Number(row.external_uid) : null,
    productTypeId: row.product_type_id,
    productName: row.product_name,
    productImage: row.product_image ?? null,
    productDetails: rawProductDetails ?? row.product_details ?? null,
    accountEmail: row.account_email ?? null,
    accountPassword: row.account_password ?? null,
    price: row.price !== null ? Number(row.price) : null,
    costPrice: row.cost_price !== null ? Number(row.cost_price) : null,
    profit: row.profit !== null ? Number(row.profit) : null,
    typeMenu: row.type_menu ?? null,
    purchaseDate: row.purchase_date ? new Date(row.purchase_date).toISOString() : null,
    usernameBuy: row.username_buy ?? null,
    buyerUserId: row.buyer_user_id ?? null,
    buyerEmail: row.buyer_email ?? null,
    buyerDisplayName: row.buyer_display_name ?? null,
    apiProviderId: row.api_provider_id ?? null,
    rawResponse,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    siteId: row.site_id || 'main',
    isLocal: row.is_local === 1,
  };
}

export async function recordExternalOrder({
  typeId,
  usernameBuy,
  buyerUserId,
  salePrice,
  buyerEmail,
  buyerDisplayName,
  apiProviderId,
  costPrice: suppliedCostPrice,
  external,
}: CreateOrderInput): Promise<Order> {
  try {
    await ensureOrderProductDetailsEncoding();
    const siteId = getSiteId();
    // ดึงข้อมูลสินค้าเมตาดาต้า
    const [productRows] = await pool.execute(
      "SELECT * FROM products WHERE type_id = ? AND (is_local = 0 OR (is_local = 1 AND site_id = ?)) LIMIT 1",
      [typeId, siteId]
    );
    const productList = productRows as any[];
    const productMeta = productList.length > 0 ? productList[0] : null;

    const finalApiProviderId = apiProviderId || productMeta?.api_provider_id || null;
    const purchaseDate = external.date ? new Date(external.date) : null;

    const finalSalePrice = Number.isFinite(Number(salePrice))
      ? Number(salePrice)
      : Number.isFinite(Number(external.point))
      ? Number(external.point)
      : null;

    const costPrice = suppliedCostPrice != null
      ? Number(suppliedCostPrice)
      : productMeta?.cost_price != null
        ? Number(productMeta.cost_price)
        : 0;

    const profit = finalSalePrice != null && costPrice != null
      ? finalSalePrice - costPrice
      : null;

    let accountEmail: string | null = null;
    let accountPassword: string | null = null;
    let accountDetails: string | null = null;
    let finalProductDetails: string | null = external.textdb || null;

     if (!finalProductDetails) {
      const parsedAccountData = safeParseJson<any[]>(productMeta?.account_data) || [];

      if (parsedAccountData.length > 0) {
        const firstAccount = parsedAccountData[0] as { email?: string; password?: string; details?: string };
        accountEmail = firstAccount.email || null;
        accountPassword = firstAccount.password || null;
        accountDetails = firstAccount.details || null;
        finalProductDetails = accountDetails;
      } else {
        accountEmail = productMeta?.account_email ?? null;
        accountPassword = productMeta?.account_password ?? null;
        if (accountEmail || accountPassword) {
          accountDetails = `${accountEmail ? `Email: ${accountEmail}` : ''}\n${accountPassword ? `Pass: ${accountPassword}` : ''}`.trim();
          finalProductDetails = accountDetails;
        }
      }
    } else {
      const parsedAccountData = safeParseJson<any[]>(productMeta?.account_data) || [];

      if (parsedAccountData.length > 0) {
        const firstAccount = parsedAccountData[0] as { email?: string; password?: string; details?: string };
        accountEmail = firstAccount.email || null;
        accountPassword = firstAccount.password || null;
      } else {
        accountEmail = productMeta?.account_email ?? null;
        accountPassword = productMeta?.account_password ?? null;
      }
    }

    const id = randomUUID();
    const now = new Date();

    const insertParams = [
      id,
      external.uid ? String(external.uid) : null,
      typeId,
      external.name,
      external.imageapi || null,
      finalProductDetails,
      finalSalePrice,
      productMeta?.type_menu || null,
      purchaseDate,
      usernameBuy || null,
      buyerUserId || null,
      JSON.stringify(external),
      now,
      costPrice,
      profit,
      buyerEmail || null,
      buyerDisplayName || null,
      finalApiProviderId,
      accountEmail,
      accountPassword,
      siteId,
      productMeta?.is_local ? 1 : 0
    ];

    await pool.execute(
      `INSERT INTO orders (
        id, external_uid, product_type_id, product_name, product_image, product_details,
        price, type_menu, purchase_date, username_buy, buyer_user_id, raw_response,
        created_at, cost_price, profit, buyer_email, buyer_display_name, api_provider_id,
        account_email, account_password, site_id, is_local
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      insertParams
    );

    return toOrder({
      id,
      external_uid: external.uid ?? null,
      product_type_id: typeId,
      product_name: external.name,
      product_image: external.imageapi || null,
      product_details: finalProductDetails,
      price: finalSalePrice,
      type_menu: productMeta?.type_menu || null,
      purchase_date: purchaseDate,
      username_buy: usernameBuy || null,
      buyer_user_id: buyerUserId || null,
      raw_response: JSON.stringify(external),
      created_at: now,
      cost_price: costPrice,
      profit: profit,
      buyer_email: buyerEmail || null,
      buyer_display_name: buyerDisplayName || null,
      api_provider_id: finalApiProviderId,
      account_email: accountEmail,
      account_password: accountPassword
    });
  } catch (error: any) {
    throw new Error(error?.message ?? "บันทึกข้อมูลคำสั่งซื้อไม่สำเร็จ");
  }
}

export async function listRecentOrders(limit = 20): Promise<Order[]> {
  return _listRecentOrders(limit);
}

async function _listRecentOrders(limit = 20): Promise<Order[]> {
  try {
    const siteId = getSiteId();
    const [rows] = await pool.execute(
      "SELECT * FROM orders WHERE site_id = ? ORDER BY created_at DESC LIMIT ?",
      [siteId, String(limit)]
    );
    return (rows as any[]).map(toOrder);
  } catch (error) {
    console.error("Error in listRecentOrders:", error);
    return [];
  }
}


export async function listOrdersByUser(userId: string, limit = 20): Promise<Order[]> {
  try {
    const siteId = getSiteId();
    const [rows] = await pool.execute(
      "SELECT * FROM orders WHERE buyer_user_id = ? AND site_id = ? ORDER BY created_at DESC LIMIT ?",
      [userId, siteId, String(limit)]
    );
    return (rows as any[]).map(toOrder);
  } catch (error) {
    console.error("Error in listOrdersByUser:", error);
    return [];
  }
}

export async function countOrders(): Promise<number> {
  return _countOrders();
}

async function _countOrders(): Promise<number> {
  try {
    const siteId = getSiteId();
    const [rows] = await pool.execute("SELECT COUNT(*) as count FROM orders WHERE site_id = ?", [siteId]);
    return (rows as any[])[0].count;
  } catch (error: any) {
    throw new Error(`ไม่สามารถนับจำนวนคำสั่งซื้อได้: ${error.message}`);
  }
}


export async function listAllOrders(
  limit = 1000,
  offset = 0,
  apiProviderId?: string | null,
  searchEmail?: string | null,
  searchProductDetails?: string | null,
  startDate?: string | null,
  endDate?: string | null,
  isLocal?: boolean | null,
  targetSiteId?: string | null
): Promise<{
  orders: Order[];
  total: number;
}> {
  try {
    const siteId = getSiteId();
    let whereClause = "1=1";
    const params: any[] = [];

    if (siteId !== 'main') {
      whereClause += " AND site_id = ?";
      params.push(siteId);
    } else if (targetSiteId && targetSiteId !== 'all') {
      whereClause += " AND site_id = ?";
      params.push(targetSiteId);
    }

    if (apiProviderId) {
      whereClause += " AND api_provider_id = ?";
      params.push(apiProviderId);
    }
    
    if (isLocal === true) {
      whereClause += " AND is_local = 1";
    } else if (isLocal === false) {
      whereClause += " AND is_local = 0";
    }

    if (searchEmail) {
      whereClause += " AND account_email = ?";
      params.push(searchEmail.trim());
    }

    if (searchProductDetails) {
      whereClause += " AND product_details LIKE ?";
      params.push(`%${searchProductDetails.trim()}%`);
    }

    if (startDate) {
      whereClause += " AND created_at >= ?";
      params.push(new Date(startDate));
    }

    if (endDate) {
      whereClause += " AND created_at <= ?";
      params.push(new Date(endDate));
    }

    // Get total
    const [countRows] = await pool.execute(
      `SELECT COUNT(*) as count FROM orders WHERE ${whereClause}`,
      params
    );
    const total = (countRows as any[])[0].count;

    // Get paginated
    const selectParams = [...params, String(limit), String(offset)];
    const [rows] = await pool.execute(
      `SELECT * FROM orders 
       WHERE ${whereClause} 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      selectParams
    );

    return {
      orders: (rows as any[]).map(toOrder),
      total,
    };
  } catch (error) {
    console.error("Error in listAllOrders:", error);
    throw error;
  }
}

export async function getRevenueStatistics(
  startDate?: string | null,
  endDate?: string | null,
  apiProviderId?: string | null,
  targetSiteId?: string | null,
  isLocal?: boolean | null
): Promise<{
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  orderCount: number;
  averageOrderValue: number;
}> {
  try {
    const siteId = getSiteId();
    let whereClause = "1=1";
    const params: any[] = [];

    if (siteId !== 'main') {
      whereClause += " AND site_id = ?";
      params.push(siteId);
    } else if (targetSiteId && targetSiteId !== 'all') {
      whereClause += " AND site_id = ?";
      params.push(targetSiteId);
    }

    if (apiProviderId) {
      whereClause += " AND api_provider_id = ?";
      params.push(apiProviderId);
    }
    if (isLocal === true) {
      whereClause += " AND is_local = 1";
    } else if (isLocal === false) {
      whereClause += " AND is_local = 0";
    }

    if (startDate) {
      whereClause += " AND created_at >= ?";
      params.push(new Date(startDate));
    }
    if (endDate) {
      whereClause += " AND created_at <= ?";
      params.push(new Date(endDate));
    }

    const [rows] = await pool.execute(
      `SELECT 
         COALESCE(SUM(price), 0) as totalRevenue,
         COALESCE(SUM(cost_price), 0) as totalCost,
         COALESCE(SUM(profit), 0) as totalProfit,
         COUNT(*) as orderCount
       FROM orders 
       WHERE ${whereClause}`,
      params
    );

    const stats = (rows as any[])[0];
    const totalRevenue = Number(stats.totalRevenue);
    const totalCost = Number(stats.totalCost);
    const totalProfit = Number(stats.totalProfit);
    const orderCount = Number(stats.orderCount);
    const averageOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

    return {
      totalRevenue,
      totalCost,
      totalProfit,
      orderCount,
      averageOrderValue,
    };
  } catch (error) {
    console.error("Error in getRevenueStatistics:", error);
    return {
      totalRevenue: 0,
      totalCost: 0,
      totalProfit: 0,
      orderCount: 0,
      averageOrderValue: 0,
    };
  }
}
