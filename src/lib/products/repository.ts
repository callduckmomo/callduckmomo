import pool from "@/lib/mysql";
import type { ExternalProduct, Product, ProductAccount } from "@/lib/products/types";
import { randomUUID } from "crypto";
import { safeParseJson } from "@/lib/products/account-parser";
import { getProductImageFallbackUrl } from "@/lib/products/image-fallback";
import { getSiteId } from "@/lib/site";
import { unstable_cache } from "next/cache";

// Cache for category name -> id mapping
const categoryCache = new Map<string, string | null>();
let categoryCacheExpiry = 0;
const CACHE_DURATION = 0; // 0 minutes (Realtime)

async function getCategoryIdByName(categoryName: string): Promise<string | null> {
  const now = Date.now();
  if (categoryCache.has(categoryName) && now < categoryCacheExpiry) {
    return categoryCache.get(categoryName) ?? null;
  }
  
  try {
    const [rows] = await pool.execute(
      "SELECT id FROM categories WHERE name = ? AND is_active = 1 LIMIT 1",
      [categoryName]
    );
    const list = rows as any[];
    const categoryId = list.length > 0 ? list[0].id : null;
    
    categoryCache.set(categoryName, categoryId);
    categoryCacheExpiry = now + CACHE_DURATION;
    return categoryId;
  } catch (error) {
    console.error("Error in getCategoryIdByName:", error);
    return null;
  }
}

function toProduct(row: any): Product {
  const accountData = safeParseJson<ProductAccount[]>(row.account_data);

  let stock = 0;
  if (row.stock !== null && row.stock !== undefined) {
    stock = Number(row.stock);
  } else if (accountData && Array.isArray(accountData)) {
    stock = accountData.length;
  }

  return {
    id: row.id,
    typeId: row.type_id,
    name: row.name,
    imageUrl: row.site_image_url ?? row.image_url ?? null,
    fallbackImageUrl: getProductImageFallbackUrl({
      name: row.name,
      typeId: row.type_id,
      typeMenu: row.type_menu,
    }),
    typeImageUrl: row.site_image_url ?? row.image_url ?? null,
    details: row.details ?? null,
    price: row.site_retail_price != null ? Number(row.site_retail_price) : (row.price != null ? Number(row.price) : null),
    mainPrice: row.price != null ? Number(row.price) : null,
    priceVip: row.site_price_vip != null ? Number(row.site_price_vip) : (row.price_vip != null ? Number(row.price_vip) : null),
    costPrice: row.cost_price != null ? Number(row.cost_price) : null,
    priceWalkin: row.site_price_walkin != null ? Number(row.site_price_walkin) : (row.price_walkin != null ? Number(row.price_walkin) : null),
    stock,
    typeMenu: row.type_menu ?? null,
    categoryId: row.category_id ?? null,
    accountEmail: row.account_email ?? null,
    accountPassword: row.account_password ?? null,
    accountData,
    isPublished: row.is_published === 1 || row.is_published === true,
    apiProviderId: row.api_provider_id ?? null,
    badge: row.badge ?? null,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
  };
}


export async function getAllCategoriesCached(onlyPublishedWithStock: boolean = false) {
  return getAllCategories(onlyPublishedWithStock);
}

export async function upsertProductsFromExternal(
  items: ExternalProduct[],
  apiProviderId: string
): Promise<void> {
  if (items.length === 0) return;

  const now = new Date();

  for (const item of items) {
    const rawCost = Number(item.pricevip);
    const priceVip = Number.isFinite(rawCost) ? rawCost : null;
    const salePrice = priceVip != null ? Math.max(0, priceVip) : null;

    // Check if product already exists by type_id
    const [existingRows] = await pool.execute(
      "SELECT id FROM products WHERE type_id = ? LIMIT 1",
      [item.type_id]
    );
    const list = existingRows as any[];

    if (list.length > 0) {
      // Update
      await pool.execute(
        `UPDATE products 
         SET name = ?, image_url = ?, details = ?, price = ?, price_vip = ?, price_walkin = ?, stock = ?, type_menu = ?, api_provider_id = ?, updated_at = ? 
         WHERE type_id = ?`,
        [
          item.name,
          item.imageapi,
          item.details,
          salePrice,
          priceVip,
          item.pricewalkin ? Number(item.pricewalkin) : null,
          item.stock,
          item.type_menu,
          apiProviderId,
          now,
          item.type_id
        ]
      );
    } else {
      // Insert
      const id = randomUUID();
      await pool.execute(
        `INSERT INTO products (id, type_id, name, image_url, details, price, price_vip, cost_price, price_walkin, stock, type_menu, api_provider_id, is_published, badge, created_at, updated_at, account_data) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          item.type_id,
          item.name,
          item.imageapi,
          item.details,
          salePrice,
          priceVip,
          null, // cost_price starts as null
          item.pricewalkin ? Number(item.pricewalkin) : null,
          item.stock,
          item.type_menu,
          apiProviderId,
          0, // is_published = false
          null, // badge
          now,
          now,
          JSON.stringify([])
        ]
      );
    }

    const updatedProduct = await findProductByTypeId(item.type_id);
    if (updatedProduct) {
      syncProductToFirestore(updatedProduct).catch(err => console.error("Firestore sync error:", err));
    }
  }
}
export async function isChildSiteApiEnabled(): Promise<boolean> {
  // In the detached tenant template, this is always true as long as MASTER_API_KEY is configured in settings.
  // We don't block local products from showing.
  return true;
}
export async function fetchAllProducts(): Promise<Product[]> {
  try {
    if (!(await isChildSiteApiEnabled())) return [];

    const siteId = getSiteId();
    const [rows] = await pool.execute(
      `SELECT p.*, spp.retail_price as site_retail_price, spp.price_vip as site_price_vip, spp.price_walkin as site_price_walkin, spp.image_url as site_image_url 
       FROM products p 
       LEFT JOIN site_product_prices spp ON p.id = spp.product_id AND spp.site_id = ? 
       WHERE (p.is_local = 0 OR (p.is_local = 1 AND p.site_id = ?))
       ORDER BY p.created_at DESC`,
      [siteId, siteId]
    );
    return (rows as any[]).map(toProduct);
  } catch (error) {
    console.error("Error in fetchAllProducts:", error);
    return [];
  }
}

export async function fetchAllProductsPaginated(
  limit: number = 50,
  offset: number = 0,
  category?: string | null,
  searchTerm?: string | null,
  isLocalFilter?: boolean | null
): Promise<{ products: Product[]; total: number }> {
  try {
    if (!(await isChildSiteApiEnabled())) return { products: [], total: 0 };
    let whereClause = "1=1";
    const params: any[] = [];

    if (category && category !== "ทั้งหมด") {
      const categoryId = await getCategoryIdByName(category);
      if (categoryId) {
        whereClause += " AND p.category_id = ?";
        params.push(categoryId);
      } else {
        return { products: [], total: 0 };
      }
    }

    if (searchTerm && searchTerm.trim().length > 0) {
      whereClause += " AND p.name LIKE ?";
      params.push(`%${searchTerm.trim()}%`);
    }

    const siteId = getSiteId();
    if (isLocalFilter === true) {
      whereClause += " AND p.is_local = 1 AND p.site_id = ?";
      params.push(siteId);
    } else if (isLocalFilter === false) {
      whereClause += " AND p.is_local = 0";
    } else {
      whereClause += " AND (p.is_local = 0 OR (p.is_local = 1 AND p.site_id = ?))";
      params.push(siteId);
    }

    // Get total
    const [countRows] = await pool.execute(
      `SELECT COUNT(*) as count FROM products p WHERE ${whereClause}`,
      params
    );
    const total = (countRows as any[])[0].count;

    const selectParams = [siteId, ...params, limit, offset];
    const [rows] = await pool.execute(
      `SELECT p.*, spp.retail_price as site_retail_price, spp.price_vip as site_price_vip, spp.price_walkin as site_price_walkin, spp.image_url as site_image_url, COALESCE(JSON_LENGTH(p.account_data), p.stock, 0) as effective_stock 
       FROM products p 
       LEFT JOIN site_product_prices spp ON p.id = spp.product_id AND spp.site_id = ? 
       WHERE ${whereClause} 
       ORDER BY effective_stock DESC, 
                CASE WHEN p.badge = 'hot_sale' THEN 3 WHEN p.badge = 'recommended' THEN 2 ELSE 1 END DESC, 
                p.created_at DESC 
       LIMIT ? OFFSET ?`,
      selectParams
    );

    return {
      products: (rows as any[]).map(toProduct),
      total,
    };
  } catch (error) {
    console.error("Error in fetchAllProductsPaginated:", error);
    return { products: [], total: 0 };
  }
}

export async function bulkUpdatePublishStatus(
  isPublished: boolean,
  onlyWithStock: boolean = false
): Promise<number> {
  try {
    const now = new Date();
    const siteId = getSiteId();
    let query = "UPDATE products SET is_published = ?, updated_at = ?";
    const params: any[] = [isPublished ? 1 : 0, now];

    if (onlyWithStock) {
      query += " WHERE COALESCE(JSON_LENGTH(account_data), stock, 0) > 0 AND (is_local = 0 OR (is_local = 1 AND site_id = ?))";
      params.push(siteId);
    } else {
      query += " WHERE (is_local = 0 OR (is_local = 1 AND site_id = ?))";
      params.push(siteId);
    }

    const [result] = await pool.execute(query, params);
    const affected = (result as any).affectedRows;

    // Sync updated products to Firestore
    try {
      const [updatedRows] = await pool.execute(
        "SELECT * FROM products WHERE (is_local = 0 OR (is_local = 1 AND site_id = ?))",
        [siteId]
      );
      await Promise.allSettled(
        (updatedRows as any[]).map((row) =>
          syncProductToFirestore(toProduct(row))
        )
      );
    } catch (e) {}

    return affected;
  } catch (error) {
    console.error("Error in bulkUpdatePublishStatus:", error);
    throw error;
  }
}

export async function getAllCategories(
  onlyPublishedWithStock: boolean = false
): Promise<Array<{ category: string; imageUrl: string | null; fallbackImageUrl: string | null; count: number }>> {
  try {
    if (!(await isChildSiteApiEnabled())) return [];
    const siteId = getSiteId();

    // 1. Fetch Categories defined in DB
    const [catRows] = await pool.execute(
      `SELECT id, name, image_url, display_order
       FROM categories
       WHERE is_active = 1
         AND (
           (COALESCE(is_local, 0) = 0 AND (site_id IS NULL OR site_id = '' OR site_id = 'main'))
           OR (is_local = 1 AND site_id = ?)
         )
       ORDER BY display_order ASC, name ASC`,
      [siteId]
    );
    const catList = catRows as any[];

    const catById = new Map<string, { name: string; imageUrl: string | null; fallbackImageUrl: string; displayOrder: number }>();
    const catByName = new Map<string, { id: string; imageUrl: string | null; fallbackImageUrl: string; displayOrder: number }>();

    catList.forEach(c => {
      const fallbackImageUrl = getProductImageFallbackUrl({ name: c.name, typeMenu: c.name });
      catById.set(c.id, { name: c.name, imageUrl: c.image_url ?? null, fallbackImageUrl, displayOrder: c.display_order ?? 0 });
      catByName.set(c.name, { id: c.id, imageUrl: c.image_url ?? null, fallbackImageUrl, displayOrder: c.display_order ?? 0 });
    });

    // 2. Fetch Local Published Products
    let localQuery = `
      SELECT p.id, p.name, p.type_id, p.category_id, p.type_menu, p.stock, p.account_data, p.is_published
      FROM products p
      WHERE p.is_published = 1 AND (p.is_local = 0 OR (p.is_local = 1 AND p.site_id = ?))
    `;
    const [localRows] = await pool.execute(localQuery, [siteId]);
    let localProducts = (localRows as any[]).map(p => {
      const accountData = safeParseJson<any[]>(p.account_data);
      const stock = p.stock !== null && p.stock !== undefined ? Number(p.stock) : (Array.isArray(accountData) ? accountData.length : 0);
      return {
        id: p.id,
        categoryId: p.category_id ?? null,
        typeMenu: p.type_menu ?? null,
        imageUrl: null,
        fallbackImageUrl: getProductImageFallbackUrl({ name: p.name, typeId: p.type_id, typeMenu: p.type_menu }),
        stock,
      };
    });

    if (onlyPublishedWithStock) {
      localProducts = localProducts.filter(p => p.stock > 0);
    }

    // 3. Fetch Master API Products (if available)
    let masterProducts: any[] = [];
    try {
      const { fetchProductsFromMaster } = await import("@/lib/api-master/products");
      const [masterProductsRes, pricesRows] = await Promise.all([
        fetchProductsFromMaster(),
        pool.query("SELECT product_id, selling_price, is_published FROM local_product_prices")
      ]);

      const prices = (pricesRows[0] as any[]).reduce((acc, row) => {
        acc[row.product_id] = {
          price: parseFloat(row.selling_price),
          isPublished: row.is_published === undefined ? true : Boolean(row.is_published)
        };
        return acc;
      }, {} as Record<string, any>);

      masterProducts = masterProductsRes.map(p => {
        const localData = prices[p.id];
        if (!localData || localData.price == null || !localData.isPublished) return null;
        return {
          id: p.id,
          categoryId: null,
          typeMenu: p.category || "General",
          imageUrl: p.image_url || null,
          fallbackImageUrl: getProductImageFallbackUrl({ name: p.name, typeId: p.typeId, typeMenu: p.category }),
          stock: p.stock ?? 999,
        };
      }).filter(Boolean);

      if (onlyPublishedWithStock) {
        masterProducts = masterProducts.filter(p => p.stock > 0);
      }
    } catch (e) {
      // Ignore master API fetch error if unavailable
    }

    const allProducts = [...localProducts, ...masterProducts];

    // 4. Count products per category
    const categoryCounts = new Map<string, { imageUrl: string | null; fallbackImageUrl: string; displayOrder: number; count: number }>();

    // Pre-populate with defined categories
    catList.forEach(c => {
      categoryCounts.set(c.name, {
        imageUrl: c.image_url ?? null,
        fallbackImageUrl: getProductImageFallbackUrl({ name: c.name, typeMenu: c.name }),
        displayOrder: c.display_order ?? 0,
        count: 0,
      });
    });

    allProducts.forEach(p => {
      let catName: string | null = null;
      let catImg: string | null = null;
      let catFallbackImg: string = p.fallbackImageUrl;

      if (p.categoryId && catById.has(p.categoryId)) {
        const meta = catById.get(p.categoryId)!;
        catName = meta.name;
        catImg = meta.imageUrl;
        catFallbackImg = meta.fallbackImageUrl;
      } else if (p.typeMenu) {
        catName = p.typeMenu;
        if (catByName.has(p.typeMenu)) {
          catImg = catByName.get(p.typeMenu)!.imageUrl;
          catFallbackImg = catByName.get(p.typeMenu)!.fallbackImageUrl;
        }
      } else {
        catName = "General";
      }

      if (catName) {
        if (!categoryCounts.has(catName)) {
          categoryCounts.set(catName, {
            imageUrl: catImg,
            fallbackImageUrl: catFallbackImg,
            displayOrder: 999,
            count: 0,
          });
        }
        const current = categoryCounts.get(catName)!;
        current.count += 1;
      }
    });

    // 5. Convert to result array
    const result = Array.from(categoryCounts.entries()).map(([category, info]) => ({
      category,
      imageUrl: info.imageUrl,
      fallbackImageUrl: info.fallbackImageUrl,
      count: info.count,
    }));

    result.sort((a, b) => {
      const orderA = categoryCounts.get(a.category)?.displayOrder ?? 999;
      const orderB = categoryCounts.get(b.category)?.displayOrder ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      if (b.count !== a.count) return b.count - a.count;
      return a.category.localeCompare(b.category, "th");
    });

    return result;
  } catch (error) {
    console.error("Error in getAllCategories:", error);
    return [];
  }
}

export async function fetchPublishedProducts(): Promise<Product[]> {
  try {
    if (!(await isChildSiteApiEnabled())) return [];
    const siteId = getSiteId();
    const [rows] = await pool.execute(
      `SELECT p.*, spp.retail_price as site_retail_price, spp.image_url as site_image_url, COALESCE(JSON_LENGTH(p.account_data), p.stock, 0) as effective_stock 
       FROM products p
       LEFT JOIN site_product_prices spp ON p.id = spp.product_id AND spp.site_id = ?
       WHERE p.is_published = 1 AND (p.is_local = 0 OR (p.is_local = 1 AND p.site_id = ?))
       ORDER BY CASE WHEN p.badge = 'hot_sale' THEN 3 WHEN p.badge = 'recommended' THEN 2 ELSE 1 END DESC, 
                p.name ASC`,
      [siteId, siteId]
    );
    return (rows as any[]).map(toProduct);
  } catch (error) {
    console.error("Error in fetchPublishedProducts:", error);
    return [];
  }
}

export async function fetchPublishedProductsPaginated(
  limit: number = 12,
  offset: number = 0,
  category?: string | null,
  searchTerm?: string | null
) {
  return _fetchPublishedProductsPaginated(limit, offset, category, searchTerm);
}

/** Uncached storefront read used by realtime reconciliation and polling fallback. */
export async function fetchPublishedProductsPaginatedLive(
  limit: number = 12,
  offset: number = 0,
  category?: string | null,
  searchTerm?: string | null
): Promise<{ products: Product[]; total: number }> {
  return _fetchPublishedProductsPaginated(limit, offset, category, searchTerm);
}

async function _fetchPublishedProductsPaginated(
  limit: number = 12,
  offset: number = 0,
  category?: string | null,
  searchTerm?: string | null
): Promise<{ products: Product[]; total: number }> {
  try {
    if (!(await isChildSiteApiEnabled())) return { products: [], total: 0 };
    const siteId = getSiteId();
    
    // 1. Fetch Local Published Products
    const [localRows] = await pool.execute(
      `SELECT p.*, spp.retail_price as site_retail_price, spp.price_vip as site_price_vip, spp.price_walkin as site_price_walkin, spp.image_url as site_image_url, COALESCE(JSON_LENGTH(p.account_data), p.stock, 0) as effective_stock 
       FROM products p
       LEFT JOIN site_product_prices spp ON p.id = spp.product_id AND spp.site_id = ?
       WHERE p.is_published = 1 AND (p.is_local = 0 OR (p.is_local = 1 AND p.site_id = ?))`,
      [siteId, siteId]
    );
    let allProducts = (localRows as any[]).map(toProduct);

    // 2. Fetch Master Products and inject them
    try {
      const { fetchProductsFromMaster } = await import("@/lib/api-master/products");
      const [masterProductsRes, pricesRows] = await Promise.all([
        fetchProductsFromMaster(),
        pool.query("SELECT product_id, selling_price, image_url, is_published FROM local_product_prices")
      ]);
      
      const prices = (pricesRows[0] as any[]).reduce((acc, row) => {
        acc[row.product_id] = {
          price: parseFloat(row.selling_price),
          imageUrl: row.image_url,
          isPublished: row.is_published === undefined ? true : Boolean(row.is_published)
        };
        return acc;
      }, {} as Record<string, any>);

      const mappedMasterProducts = masterProductsRes.map(p => {
         const localData = prices[p.id];
         if (!localData || localData.price == null || !localData.isPublished) return null; // Only show if local price is set and published
         
         const price = localData.price;
         const img = localData.imageUrl || p.image_url;
         const costPrice = (p as any).price ?? (p as any).cost_price ?? p.cost_price;
         const fallbackImageUrl = p.image_url || getProductImageFallbackUrl({
           name: p.name,
           typeId: p.typeId,
           typeMenu: p.category,
         });
         
         return {
            id: p.id,
            typeId: p.typeId,
            name: p.name,
            imageUrl: img,
            fallbackImageUrl,
            typeImageUrl: img,
            details: p.description,
            price: price,
            mainPrice: costPrice,
            priceVip: price,
            costPrice: costPrice,
            priceWalkin: price,
            stock: p.stock ?? 0, // Fallback to 0 if master doesn't return stock yet
            typeMenu: p.category || "General",
            categoryId: null, // Will use typeMenu for filtering
            accountEmail: null,
            accountPassword: null,
            accountData: [],
            isPublished: true,
            apiProviderId: null,
            badge: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
         } as Product;
      }).filter(Boolean) as Product[];

      allProducts = [...allProducts, ...mappedMasterProducts];
    } catch (e) {
      console.error("Failed to fetch master products for storefront", e);
    }

    // 3. Apply Filters
    if (category && category !== "ทั้งหมด") {
       // Support matching by typeMenu string since master products don't have categoryId
       // We'll also try to match category ID if we have it
       const categoryId = await getCategoryIdByName(category);
       allProducts = allProducts.filter(p => p.typeMenu === category || (categoryId && p.categoryId === categoryId));
    }

    if (searchTerm && searchTerm.trim().length > 0) {
       const s = searchTerm.trim().toLowerCase();
       allProducts = allProducts.filter(p => p.name.toLowerCase().includes(s));
    }

    // 4. Sort (Stock > Badge > Name)
    allProducts.sort((a, b) => {
       const stockA = a.stock ?? 0;
       const stockB = b.stock ?? 0;
       if (stockB !== stockA) return stockB - stockA; // Descending stock

       const getBadgeValue = (badge: string | null) => badge === 'hot_sale' ? 3 : badge === 'recommended' ? 2 : 1;
       const badgeA = getBadgeValue(a.badge);
       const badgeB = getBadgeValue(b.badge);
       if (badgeB !== badgeA) return badgeB - badgeA;

       return a.name.localeCompare(b.name);
    });

    const total = allProducts.length;

    // 5. Paginate
    const paginatedProducts = allProducts.slice(offset, offset + limit);

    return {
      products: paginatedProducts,
      total,
    };
  } catch (error) {
    console.error("Error in _fetchPublishedProductsPaginated:", error);
    throw error;
  }
}


export async function findProductByTypeId(typeId: string): Promise<Product | null> {
  try {
    if (!(await isChildSiteApiEnabled())) return null;
    const siteId = getSiteId();
    const [rows] = await pool.execute(
      `SELECT p.*, spp.retail_price as site_retail_price, spp.image_url as site_image_url 
       FROM products p
       LEFT JOIN site_product_prices spp ON p.id = spp.product_id AND spp.site_id = ?
       WHERE p.type_id = ? AND (p.is_local = 0 OR (p.is_local = 1 AND p.site_id = ?)) LIMIT 1`, 
      [siteId, typeId, siteId]
    );
    const list = rows as any[];
    if (list.length === 0) return null;
    return toProduct(list[0]);
  } catch (error) {
    console.error("Error in findProductByTypeId:", error);
    throw error;
  }
}

export async function applyGlobalProfit(mode: "amount" | "percent", value: number): Promise<Product[]> {
  try {
    const now = new Date();
    const siteId = getSiteId();
    const [rows] = await pool.execute(
      "SELECT id, price_vip FROM products WHERE (is_local = 0 OR (is_local = 1 AND site_id = ?))",
      [siteId]
    );
    
    for (const row of rows as any[]) {
      const cost = row.price_vip !== null ? Number(row.price_vip) : null;
      if (cost !== null && Number.isFinite(cost)) {
        const computed = mode === "amount" ? cost + value : cost * (1 + value / 100);
        const finalPrice = Number.isFinite(computed) ? Math.max(0, Number(computed.toFixed(2))) : cost;
        
        await pool.execute(
          "UPDATE products SET price = ?, updated_at = ? WHERE id = ?",
          [finalPrice, now, row.id]
        );
      }
    }

    return fetchAllProducts();
  } catch (error) {
    console.error("Error in applyGlobalProfit:", error);
    throw error;
  }
}

export async function fetchCheapestProductsByCategory(): Promise<Product[]> {
  try {
    const siteId = getSiteId();
    const [rows] = await pool.execute(
      `SELECT p.* 
       FROM products p
       INNER JOIN (
         SELECT COALESCE(type_menu, 'อื่นๆ') as category, MIN(price) as min_price
         FROM products
         WHERE is_published = 1 AND (is_local = 0 OR (is_local = 1 AND site_id = ?))
         GROUP BY COALESCE(type_menu, 'อื่นๆ')
       ) grouped ON COALESCE(p.type_menu, 'อื่นๆ') = grouped.category AND p.price = grouped.min_price
       WHERE p.is_published = 1 AND (p.is_local = 0 OR (p.is_local = 1 AND p.site_id = ?))
       ORDER BY p.price ASC, p.name ASC`,
      [siteId, siteId]
    );

    // Filter duplicates per category in case there are multiple with same min_price
    const seen = new Set<string>();
    const result: Product[] = [];
    for (const r of rows as any[]) {
      const cat = r.type_menu ?? "อื่นๆ";
      if (!seen.has(cat)) {
        seen.add(cat);
        result.push(toProduct(r));
      }
    }
    return result;
  } catch (error) {
    console.error("Error in fetchCheapestProductsByCategory:", error);
    return [];
  }
}

export async function fetchRecommendedProducts(): Promise<Product[]> {
  return _fetchRecommendedProducts();
}

async function _fetchRecommendedProducts(): Promise<Product[]> {
  try {
    const siteId = getSiteId();
    const [rows] = await pool.execute(
      `SELECT p.*, spp.retail_price as site_retail_price, spp.price_vip as site_price_vip, spp.price_walkin as site_price_walkin, spp.image_url as site_image_url, COALESCE(JSON_LENGTH(p.account_data), p.stock, 0) as effective_stock 
       FROM products p
       LEFT JOIN site_product_prices spp ON p.id = spp.product_id AND spp.site_id = ?
       WHERE p.is_published = 1 AND p.badge IN ('recommended', 'hot_sale') AND (p.is_local = 0 OR (p.is_local = 1 AND p.site_id = ?))
       ORDER BY CASE WHEN COALESCE(JSON_LENGTH(p.account_data), p.stock, 0) <= 0 THEN 1 ELSE 0 END ASC, 
                CASE WHEN p.badge = 'hot_sale' THEN 1 ELSE 2 END ASC`,
      [siteId, siteId]
    );
    return (rows as any[]).map(toProduct);
  } catch (error) {
    console.error("Error in fetchRecommendedProducts:", error);
    return [];
  }
}


export async function updateProductPublishStatus(typeId: string, isPublished: boolean): Promise<void> {
  try {
    const now = new Date();
    const [result] = await pool.execute(
      "UPDATE products SET is_published = ?, updated_at = ? WHERE type_id = ?",
      [isPublished ? 1 : 0, now, typeId]
    );
    if ((result as any).affectedRows === 0) throw new Error("ไม่พบสินค้า");
    const p = await findProductByTypeId(typeId);
    if (p) syncProductToFirestore(p).catch(() => {});
  } catch (error: any) {
    throw new Error(`อัปเดตสถานะสินค้าไม่สำเร็จ: ${error.message}`);
  }
}

export async function updateProductPrice(typeId: string, price: number): Promise<void> {
  try {
    const now = new Date();
    const [result] = await pool.execute(
      "UPDATE products SET price = ?, updated_at = ? WHERE type_id = ?",
      [price, now, typeId]
    );
    if ((result as any).affectedRows === 0) throw new Error("ไม่พบสินค้า");
    const p = await findProductByTypeId(typeId);
    if (p) syncProductToFirestore(p).catch(() => {});
  } catch (error: any) {
    throw new Error(`อัปเดตราคาสินค้าไม่สำเร็จ: ${error.message}`);
  }
}

export async function updateProductBadge(
  typeId: string,
  badge: 'hot_sale' | 'recommended' | null
): Promise<void> {
  try {
    const now = new Date();
    const [result] = await pool.execute(
      "UPDATE products SET badge = ?, updated_at = ? WHERE type_id = ?",
      [badge, now, typeId]
    );
    if ((result as any).affectedRows === 0) throw new Error("ไม่พบสินค้า");
    const p = await findProductByTypeId(typeId);
    if (p) syncProductToFirestore(p).catch(() => {});
  } catch (error: any) {
    throw new Error(`อัปเดต badge สินค้าไม่สำเร็จ: ${error.message}`);
  }
}

export async function updateProductInventoryAfterPurchase(
  typeId: string,
  updates: {
    accountData?: ProductAccount[] | null;
    stock?: number | null;
  }
): Promise<void> {
  try {
    const siteId = getSiteId();
    const now = new Date();
    const fields: string[] = [];
    const params: (string | number | Date | null)[] = [];

    if (updates.accountData !== undefined) {
      const accountData = updates.accountData ?? [];
      fields.push("account_data = ?", "stock = ?");
      params.push(JSON.stringify(accountData), accountData.length);
    } else if (updates.stock !== undefined) {
      fields.push("stock = ?");
      params.push(updates.stock);
    }

    if (fields.length === 0) {
      return;
    }

    fields.push("updated_at = ?");
    params.push(now, typeId, siteId);

    const [result] = await pool.execute(
      `UPDATE products
       SET ${fields.join(", ")}
       WHERE type_id = ? AND (is_local = 0 OR (is_local = 1 AND site_id = ?))`,
      params
    );

    if ((result as any).affectedRows === 0) {
      throw new Error("ไม่พบสินค้าที่ต้องการอัปเดตสต็อก");
    }

    findProductByTypeId(typeId)
      .then((product) => {
        if (product) syncProductToFirestore(product).catch(() => {});
      })
      .catch(() => {});
  } catch (error: any) {
    throw new Error(`ไม่สามารถอัปเดตสต็อกสินค้าได้: ${error?.message || "Unknown error"}`);
  }
}

export async function createProduct(
  typeId: string,
  name: string,
  imageUrl: string | null = null,
  details: string | null = null,
  price: number | null = null,
  priceVip: number | null = null,
  costPrice: number | null = null,
  priceWalkin: number | null = null,
  stock: number | null = null,
  categoryId: string | null = null,
  accountEmail: string | null = null,
  accountPassword: string | null = null,
  isPublished: boolean = false,
  badge: 'hot_sale' | 'recommended' | null = null,
  isLocal: boolean = false
): Promise<Product> {
  const existing = await findProductByTypeId(typeId);
  if (existing) {
    throw new Error(`สินค้าที่มี Type ID "${typeId}" มีอยู่แล้ว`);
  }

  try {
    const id = randomUUID();
    const now = new Date();
    const siteId = getSiteId();
    await pool.execute(
      `INSERT INTO products (id, type_id, name, image_url, details, price, price_vip, cost_price, price_walkin, stock, type_menu, category_id, account_email, account_password, account_data, is_published, api_provider_id, badge, created_at, updated_at, site_id, is_local) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        typeId,
        name,
        imageUrl,
        details,
        price,
        priceVip,
        costPrice,
        priceWalkin,
        stock,
        "", // type_menu defaults to empty, categories query sets category
        categoryId,
        accountEmail,
        accountPassword,
        JSON.stringify([]), // account_data starts empty
        isPublished ? 1 : 0,
        null,
        badge,
        now,
        now,
        siteId,
        (siteId !== 'main' || isLocal) ? 1 : 0
      ]
    );

    const productObj = {
      id,
      typeId,
      name,
      imageUrl,
      typeImageUrl: imageUrl,
      details,
      price,
      priceVip,
      costPrice,
      priceWalkin,
      stock: stock ?? 0,
      typeMenu: "",
      categoryId,
      accountEmail,
      accountPassword,
      accountData: [],
      isPublished,
      apiProviderId: null,
      badge,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    await syncProductToFirestore(productObj);

    return productObj;
  } catch (error: any) {
    throw new Error(`ไม่สามารถสร้างสินค้าได้: ${error?.message || "Unknown error"}`);
  }
}

export async function updateProduct(
  typeId: string,
  updates: {
    name?: string;
    imageUrl?: string | null;
    details?: string | null;
    price?: number | null;
    priceVip?: number | null;
    costPrice?: number | null;
    priceWalkin?: number | null;
    stock?: number | null;
    categoryId?: string | null;
    accountEmail?: string | null;
    accountPassword?: string | null;
    accountData?: ProductAccount[] | null;
    isPublished?: boolean;
    badge?: 'hot_sale' | 'recommended' | null;
  },
  forceStockUpdate: boolean = false
): Promise<Product> {
  try {
    const [existingRows] = await pool.execute("SELECT * FROM products WHERE type_id = ? LIMIT 1", [typeId]);
    const list = existingRows as any[];
    if (list.length === 0) {
      throw new Error("ไม่พบสินค้าที่ต้องการแก้ไข");
    }

    const current = list[0];
    
    const siteId = getSiteId();
    const isMainSite = siteId === 'main';
    const isLocalProduct = current.is_local === 1;
    const canUpdateFully = isMainSite || isLocalProduct;
    const canUpdateStock = canUpdateFully || forceStockUpdate;

    // If it's a child site and NOT a local product, only update prices and image in site_product_prices
    if (!canUpdateFully) {
      if (updates.price !== undefined || updates.priceVip !== undefined || updates.priceWalkin !== undefined || updates.imageUrl !== undefined) {
        // Fetch existing site prices to merge
        const [sppRows] = await pool.execute(
          "SELECT retail_price, price_vip, price_walkin, image_url FROM site_product_prices WHERE site_id = ? AND product_id = ?",
          [siteId, current.id]
        );
        const sppList = sppRows as any[];
        const currentSpp = sppList.length > 0 ? sppList[0] : null;

        const newRetailPrice = updates.price !== undefined ? updates.price : (currentSpp?.retail_price ?? current.price);
        const newPriceVip = updates.priceVip !== undefined ? updates.priceVip : (currentSpp?.price_vip ?? current.price_vip);
        const newPriceWalkin = updates.priceWalkin !== undefined ? updates.priceWalkin : (currentSpp?.price_walkin ?? current.price_walkin);
        const newImageUrl = updates.imageUrl !== undefined ? updates.imageUrl : (currentSpp?.image_url ?? null);

        await pool.execute(
          `INSERT INTO site_product_prices (site_id, product_id, retail_price, price_vip, price_walkin, image_url) 
           VALUES (?, ?, ?, ?, ?, ?) 
           ON DUPLICATE KEY UPDATE retail_price = ?, price_vip = ?, price_walkin = ?, image_url = ?`,
          [siteId, current.id, newRetailPrice, newPriceVip, newPriceWalkin, newImageUrl, newRetailPrice, newPriceVip, newPriceWalkin, newImageUrl]
        );
      }
    }

    // For main site or local products, use updates if provided. For child site, force using current values to prevent overwriting main site data.
    const name = (canUpdateFully && updates.name !== undefined) ? updates.name : current.name;
    const imageUrl = (canUpdateFully && updates.imageUrl !== undefined) ? updates.imageUrl : current.image_url;
    const details = (canUpdateFully && updates.details !== undefined) ? updates.details : current.details;
    
    // For main site or local products, update the prices in main table. For child site, keep the current main prices.
    const price = (canUpdateFully && updates.price !== undefined) ? updates.price : current.price;
    const priceVip = (canUpdateFully && updates.priceVip !== undefined) ? updates.priceVip : current.price_vip;
    const costPrice = (canUpdateFully && updates.costPrice !== undefined) ? updates.costPrice : current.cost_price;
    const priceWalkin = (canUpdateFully && updates.priceWalkin !== undefined) ? updates.priceWalkin : current.price_walkin;
    
    let accountDataObj: ProductAccount[] = [];
    let stock = current.stock;
    if (canUpdateStock && updates.accountData !== undefined) {
      accountDataObj = updates.accountData || [];
      stock = updates.accountData ? updates.accountData.length : 0;
    } else {
      accountDataObj = safeParseJson<ProductAccount[]>(current.account_data) || [];
      if (canUpdateStock && updates.stock !== undefined) {
        stock = updates.stock;
      }
    }

    const categoryId = (canUpdateFully && updates.categoryId !== undefined) ? updates.categoryId : current.category_id;
    const accountEmail = (canUpdateFully && updates.accountEmail !== undefined) ? updates.accountEmail : current.account_email;
    const accountPassword = (canUpdateFully && updates.accountPassword !== undefined) ? updates.accountPassword : current.account_password;
    const isPublished = (canUpdateFully && updates.isPublished !== undefined) ? updates.isPublished : current.is_published;
    const badge = (canUpdateFully && updates.badge !== undefined) ? updates.badge : current.badge;
    const now = new Date();

    await pool.execute(
      `UPDATE products 
       SET name = ?, image_url = ?, details = ?, price = ?, price_vip = ?, cost_price = ?, price_walkin = ?, stock = ?, category_id = ?, account_email = ?, account_password = ?, account_data = ?, is_published = ?, badge = ?, updated_at = ? 
       WHERE type_id = ?`,
      [
        name,
        imageUrl,
        details,
        price,
        priceVip,
        costPrice,
        priceWalkin,
        stock,
        categoryId,
        accountEmail,
        accountPassword,
        JSON.stringify(accountDataObj),
        isPublished ? 1 : 0,
        badge,
        now,
        typeId
      ]
    );

    const updatedProduct = toProduct({
      ...current,
      name,
      image_url: imageUrl,
      details,
      price,
      price_vip: priceVip,
      cost_price: costPrice,
      price_walkin: priceWalkin,
      stock,
      category_id: categoryId,
      account_email: accountEmail,
      account_password: accountPassword,
      account_data: accountDataObj,
      is_published: isPublished ? 1 : 0,
      badge,
      updated_at: now
    });

    await syncProductToFirestore(updatedProduct);

    // ถ้าเป็นเว็บลูก ให้ส่ง Webhook ไปแจ้งเว็บแม่ให้ล้าง Cache และอัปเดต Firebase ด้วย
    const currentSiteId = getSiteId();
    if (currentSiteId !== 'main' && process.env.NEXT_PUBLIC_MAIN_SITE_URL && process.env.MAIN_SITE_SYNC_SECRET) {
      fetch(`${process.env.NEXT_PUBLIC_MAIN_SITE_URL}/api/admin/products/sync-main`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ typeId, secret: process.env.MAIN_SITE_SYNC_SECRET })
      }).catch(err => console.error("Failed to trigger main site sync:", err));
    }

    return updatedProduct;
  } catch (error: any) {
    throw new Error(`ไม่สามารถอัปเดตสินค้าได้: ${error?.message || "Unknown error"}`);
  }
}

export async function deleteProduct(typeId: string): Promise<void> {
  try {
    const product = await findProductByTypeId(typeId);
    if (!product) {
      throw new Error("ไม่พบสินค้า");
    }

    // Check orders
    const [orderRows] = await pool.execute(
      "SELECT 1 FROM orders WHERE product_type_id = ? LIMIT 1",
      [typeId]
    );

    if ((orderRows as any[]).length > 0) {
      throw new Error("ไม่สามารถลบสินค้าได้ เนื่องจากมีคำสั่งซื้อที่เกี่ยวข้อง");
    }

    await pool.execute("DELETE FROM products WHERE type_id = ?", [typeId]);

    // Delete from Firestore
    const projectId = process.env.FIREBASE_PROJECT_ID;
    if (projectId) {
      const { db } = await import("@/lib/firebase-admin");
      await db.collection("products").doc(product.id).delete().catch(err => console.error("Firestore delete error:", err));
    }
  } catch (error: any) {
    throw new Error(`ไม่สามารถลบสินค้าได้: ${error.message}`);
  }
}

export async function countTotalStockAndProducts(): Promise<{ totalStock: number; productCount: number }> {
  return _countTotalStockAndProducts();
}

async function _countTotalStockAndProducts(): Promise<{ totalStock: number; productCount: number }> {
  try {
    const siteId = getSiteId();
    const [rows] = await pool.execute(
      `SELECT SUM(COALESCE(JSON_LENGTH(account_data), stock, 0)) as totalStock, COUNT(id) as productCount 
       FROM products 
       WHERE is_published = 1 AND (is_local = 0 OR (is_local = 1 AND site_id = ?))`,
      [siteId]
    );
    const result = (rows as any[])[0];
    return {
      totalStock: Number(result.totalStock) || 0,
      productCount: Number(result.productCount) || 0,
    };
  } catch (error) {
    console.error("Error in countTotalStockAndProducts:", error);
    return { totalStock: 0, productCount: 0 };
  }
}

export async function syncProductToFirestore(product: Product): Promise<void> {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      return;
    }

    const [{ db }, { FieldValue }] = await Promise.all([
      import("@/lib/firebase-admin"),
      import("firebase-admin/firestore"),
    ]);
    const docRef = db.collection("products").doc(product.id);
    
    const siteId = getSiteId();
    
    const payload: any = {
      id: product.id,
      type_id: product.typeId,
      name: product.name,
      image_url: product.imageUrl,
      details: product.details,
      stock: product.stock,
      type_menu: product.typeMenu,
      is_published: product.isPublished,
      badge: product.badge,
      category_id: product.categoryId,
      // Delivery credentials must never be copied to the client-readable
      // realtime channel. Stock is already represented by the stock field.
      account_email: FieldValue.delete(),
      account_password: FieldValue.delete(),
      account_data: FieldValue.delete(),
      api_provider_id: product.apiProviderId,
      updated_at: new Date().toISOString(),
    };

    if (siteId === "main") {
      payload.price = product.price;
      payload.price_vip = product.priceVip;
      payload.price_walkin = product.priceWalkin;
      payload.price_main = product.price;
      payload.price_main_vip = product.priceVip;
      payload.price_main_walkin = product.priceWalkin;
    } else {
      payload[`price_${siteId}`] = product.price;
      payload[`price_${siteId}_vip`] = product.priceVip;
      payload[`price_${siteId}_walkin`] = product.priceWalkin;
      payload[`published_${siteId}`] = product.isPublished;
    }

    await docRef.set(payload, { merge: true });
    
    console.log(`[realtime] Successfully synced product ${product.id} (site: ${siteId}) to Firestore`);
  } catch (error: any) {
    console.error("[realtime] Failed to sync product to Firestore:", error.message);
  }
}
