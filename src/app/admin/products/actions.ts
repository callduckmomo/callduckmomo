"use server";

import pool from "@/lib/mysql";
import { revalidatePath, revalidateTag } from "next/cache";
import { getSiteId } from "@/lib/site";

function revalidateProductViews() {
  revalidateTag("products", { expire: 0 });
  revalidateTag("categories", { expire: 0 });
  revalidatePath("/");
  revalidatePath("/admin/products");
  revalidatePath("/products");
}

async function syncMasterProductRealtime(productId: string) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!projectId || !clientEmail || !privateKey) return;

  try {
    const { fetchProductsFromMaster } = await import("@/lib/api-master/products");
    const [masterProducts, localPrices, { db }, { FieldValue }] = await Promise.all([
      fetchProductsFromMaster(),
      getLocalProductPrices(),
      import("@/lib/firebase-admin"),
      import("firebase-admin/firestore"),
    ]);
    const product = masterProducts.find((item) => item.id === productId);
    if (!product) return;

    const local = localPrices[product.id];
    const siteId = getSiteId();
    const payload: Record<string, unknown> = {
      id: product.id,
      type_id: product.typeId,
      name: product.name,
      image_url: local?.imageUrl || product.image_url,
      stock: product.stock ?? 0,
      account_data: FieldValue.delete(),
      account_email: FieldValue.delete(),
      account_password: FieldValue.delete(),
      badge: null,
      updated_at: new Date().toISOString(),
      [`price_${siteId}`]: local?.price ?? null,
      [`price_${siteId}_vip`]: local?.price ?? null,
      [`price_${siteId}_walkin`]: local?.price ?? null,
      [`published_${siteId}`]: Boolean(
        local && local.price != null && local.isPublished
      ),
    };

    await db.collection("products").doc(product.id).set(payload, { merge: true });
  } catch (error) {
    console.error("[realtime] Failed to sync master product:", error);
  }
}

async function refreshMasterProductStorefront(productId: string) {
  revalidateProductViews();
  await syncMasterProductRealtime(productId);
}

export async function saveProductSellingPrice(productId: string, sellingPrice: number) {
  try {
    // Create the table if it doesn't exist (useful for a template setup)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS local_product_prices (
        product_id VARCHAR(255) PRIMARY KEY,
        selling_price DECIMAL(10, 2) NOT NULL,
        image_url MEDIUMTEXT DEFAULT NULL,
        is_published TINYINT(1) DEFAULT 1,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    try { await pool.query(`ALTER TABLE local_product_prices ADD COLUMN image_url MEDIUMTEXT DEFAULT NULL`); } catch (e: any) {}
    try { await pool.query(`ALTER TABLE local_product_prices ADD COLUMN is_published TINYINT(1) DEFAULT 1`); } catch (e: any) {}

    // Insert or update the selling price
    await pool.query(
      `INSERT INTO local_product_prices (product_id, selling_price, is_published)
       VALUES (?, ?, 1)
       ON DUPLICATE KEY UPDATE selling_price = ?`,
      [productId, sellingPrice, sellingPrice]
    );

    await refreshMasterProductStorefront(productId);
    return { success: true };
  } catch (error) {
    console.error("Error saving selling price:", error);
    return { success: false, error: "Failed to save selling price" };
  }
}

export async function getLocalProductPrices(): Promise<Record<string, { price: number; imageUrl: string | null; isPublished: boolean }>> {
  try {
    // Ensure table exists before querying
    await pool.query(`
      CREATE TABLE IF NOT EXISTS local_product_prices (
        product_id VARCHAR(255) PRIMARY KEY,
        selling_price DECIMAL(10, 2) NOT NULL,
        image_url MEDIUMTEXT DEFAULT NULL,
        is_published TINYINT(1) DEFAULT 1,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    try { await pool.query(`ALTER TABLE local_product_prices ADD COLUMN image_url MEDIUMTEXT DEFAULT NULL`); } catch (e: any) {}
    try { await pool.query(`ALTER TABLE local_product_prices ADD COLUMN is_published TINYINT(1) DEFAULT 1`); } catch (e: any) {}

    const [rows]: any = await pool.query(
      "SELECT product_id, selling_price, image_url, is_published FROM local_product_prices"
    );

    const prices: Record<string, { price: number; imageUrl: string | null; isPublished: boolean }> = {};
    for (const row of rows) {
      prices[row.product_id] = {
        price: parseFloat(row.selling_price),
        imageUrl: row.image_url || null,
        isPublished: row.is_published === undefined ? true : Boolean(row.is_published),
      };
    }
    
    return prices;
  } catch (error) {
    console.error("Error fetching local prices:", error);
    return {};
  }
}

export async function saveProductLocalImage(productId: string, imageUrl: string | null) {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS local_product_prices (
        product_id VARCHAR(255) PRIMARY KEY,
        selling_price DECIMAL(10, 2) NOT NULL,
        image_url MEDIUMTEXT DEFAULT NULL,
        is_published TINYINT(1) DEFAULT 1,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    try { await pool.query(`ALTER TABLE local_product_prices ADD COLUMN image_url MEDIUMTEXT DEFAULT NULL`); } catch (e: any) {}
    try { await pool.query(`ALTER TABLE local_product_prices ADD COLUMN is_published TINYINT(1) DEFAULT 1`); } catch (e: any) {}

    await pool.query(
      `INSERT INTO local_product_prices (product_id, selling_price, image_url, is_published)
       VALUES (?, 0, ?, 1)
       ON DUPLICATE KEY UPDATE image_url = ?`,
      [productId, imageUrl, imageUrl]
    );

    await refreshMasterProductStorefront(productId);
    return { success: true };
  } catch (error) {
    console.error("Error saving local image:", error);
    return { success: false, error: "Failed to save image" };
  }
}

export async function toggleMasterProductPublish(productId: string, isPublished: boolean) {
  try {
    await pool.query(
      `UPDATE local_product_prices SET is_published = ? WHERE product_id = ?`,
      [isPublished ? 1 : 0, productId]
    );
    await refreshMasterProductStorefront(productId);
    return { success: true };
  } catch (error) {
    console.error("Error toggling publish:", error);
    return { success: false, error: "Failed to toggle publish status" };
  }
}
export async function getMasterProductsData() {
  try {
    const { fetchProductsFromMaster } = await import("@/lib/api-master/products");
    const masterProducts = await fetchProductsFromMaster();
    const localPrices = await getLocalProductPrices();
    return { success: true, masterProducts, localPrices };
  } catch (error: any) {
    console.error("Error fetching master products data:", error);
    return { success: false, error: error.message, masterProducts: [], localPrices: {} };
  }
}
