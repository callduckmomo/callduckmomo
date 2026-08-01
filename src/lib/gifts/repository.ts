import pool from "@/lib/mysql";
import type { GiftOption, OrderGift } from "@/lib/gifts/types";
import { randomUUID } from "crypto";
import { safeParseJson } from "@/lib/products/account-parser";
import { findProductByTypeId, syncProductToFirestore } from "@/lib/products/repository";

function toGiftOption(row: any): GiftOption {
  return {
    id: row.id,
    baseProductTypeId: row.base_product_type_id,
    giftProductTypeId: row.gift_product_type_id,
    isActive: row.is_active === 1 || row.is_active === true,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
  };
}

function toOrderGift(row: any): OrderGift {
  return {
    id: row.id,
    orderId: row.order_id,
    giftProductTypeId: row.gift_product_type_id,
    giftProductName: row.gift_product_name,
    giftProductDetails: row.gift_product_details ?? null,
    giftAccountEmail: row.gift_account_email ?? null,
    giftAccountPassword: row.gift_account_password ?? null,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

export async function listGiftOptionsByBaseProduct(
  baseTypeId: string
): Promise<GiftOption[]> {
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM product_gift_options WHERE base_product_type_id = ? AND is_active = 1 ORDER BY created_at DESC",
      [baseTypeId]
    );
    return (rows as any[]).map(toGiftOption);
  } catch (error) {
    console.error("Error in listGiftOptionsByBaseProduct:", error);
    return [];
  }
}

export async function listAllGiftOptions(): Promise<GiftOption[]> {
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM product_gift_options ORDER BY created_at DESC"
    );
    return (rows as any[]).map(toGiftOption);
  } catch (error) {
    console.error("Error in listAllGiftOptions:", error);
    return [];
  }
}

export async function createGiftOption(
  baseTypeId: string,
  giftTypeId: string
): Promise<GiftOption> {
  try {
    const id = randomUUID();
    const now = new Date();

    await pool.execute(
      `INSERT INTO product_gift_options (id, base_product_type_id, gift_product_type_id, is_active, created_at, updated_at) 
       VALUES (?, ?, ?, 1, ?, ?)`,
      [id, baseTypeId, giftTypeId, now, now]
    );

    return {
      id,
      baseProductTypeId: baseTypeId,
      giftProductTypeId: giftTypeId,
      isActive: true,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
  } catch (error: any) {
    throw new Error(error?.message ?? "ไม่สามารถเพิ่มของแถมได้");
  }
}

export async function setGiftOptionActive(
  id: string,
  isActive: boolean
): Promise<void> {
  try {
    const now = new Date();
    await pool.execute(
      "UPDATE product_gift_options SET is_active = ?, updated_at = ? WHERE id = ?",
      [isActive ? 1 : 0, now, id]
    );
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function deleteGiftOption(id: string): Promise<void> {
  try {
    await pool.execute("DELETE FROM product_gift_options WHERE id = ?", [id]);
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function deliverGiftsAndRecord({
  orderIds,
  giftTypeId,
}: {
  orderIds: string[];
  giftTypeId: string;
}): Promise<OrderGift[]> {
  if (!orderIds.length) {
    return [];
  }

  const quantity = orderIds.length;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Fetch product with row locking
    const [productRows] = await connection.execute(
      "SELECT * FROM products WHERE type_id = ? FOR UPDATE",
      [giftTypeId]
    );
    const productList = productRows as any[];
    if (productList.length === 0) {
      throw new Error("ไม่พบสินค้าของแถม");
    }
    const giftProduct = productList[0];

    if (giftProduct.api_provider_id) {
      throw new Error("ของแถมนี้เป็นสินค้าจาก API ภายนอก ยังไม่รองรับ");
    }

    const parsedAccountData = safeParseJson<any[]>(giftProduct.account_data) || [];

    const hasAccountData = parsedAccountData.length > 0;
    const rowsToInsert: any[] = [];
    const now = new Date();

    if (hasAccountData) {
      if (parsedAccountData.length < quantity) {
        throw new Error(
          `ของแถม "${giftProduct.name}" มีบัญชีไม่เพียงพอ (ต้องการ ${quantity} แต่มี ${parsedAccountData.length})`
        );
      }

      const usedAccounts = parsedAccountData.slice(0, quantity);
      const remainingAccounts = parsedAccountData.slice(quantity);

      usedAccounts.forEach((used, index) => {
        const giftAccountEmail = used.email || null;
        const giftAccountPassword = used.password || null;
        const giftDetails =
          used.details ||
          (used.email || used.password
            ? `${used.email ? `Email: ${used.email}` : ""}\n${used.password ? `Pass: ${used.password}` : ""}`.trim()
            : null);

        rowsToInsert.push({
          id: randomUUID(),
          order_id: orderIds[index],
          gift_product_type_id: giftTypeId,
          gift_product_name: giftProduct.name,
          gift_product_details: giftDetails,
          gift_account_email: giftAccountEmail,
          gift_account_password: giftAccountPassword,
          created_at: now,
        });
      });

      await connection.execute(
        "UPDATE products SET account_data = ?, stock = ?, updated_at = ? WHERE type_id = ?",
        [JSON.stringify(remainingAccounts), remainingAccounts.length, now, giftTypeId]
      );
    } else {
      const giftStock = typeof giftProduct.stock === "number" ? giftProduct.stock : 0;
      if (giftStock < quantity) {
        throw new Error(
          `ของแถม "${giftProduct.name}" มีสต็อกไม่เพียงพอ (ต้องการ ${quantity} แต่มี ${giftStock})`
        );
      }

      const giftAccountEmail = giftProduct.account_email ?? null;
      const giftAccountPassword = giftProduct.account_password ?? null;
      const giftDetails = giftProduct.details ?? null;

      orderIds.forEach((orderId) => {
        rowsToInsert.push({
          id: randomUUID(),
          order_id: orderId,
          gift_product_type_id: giftTypeId,
          gift_product_name: giftProduct.name,
          gift_product_details: giftDetails,
          gift_account_email: giftAccountEmail,
          gift_account_password: giftAccountPassword,
          created_at: now,
        });
      });

      await connection.execute(
        "UPDATE products SET stock = ?, updated_at = ? WHERE type_id = ?",
        [Math.max(0, giftStock - quantity), now, giftTypeId]
      );
    }

    findProductByTypeId(giftTypeId).then(p => {
      if (p) syncProductToFirestore(p).catch(() => {});
    }).catch(() => {});

    for (const row of rowsToInsert) {
      await connection.execute(
        `INSERT INTO order_gifts (
          id, order_id, gift_product_type_id, gift_product_name, gift_product_details, gift_account_email, gift_account_password, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          row.id,
          row.order_id,
          row.gift_product_type_id,
          row.gift_product_name,
          row.gift_product_details,
          row.gift_account_email,
          row.gift_account_password,
          row.created_at,
        ]
      );
    }

    await connection.commit();
    return rowsToInsert.map(toOrderGift);
  } catch (error: any) {
    await connection.rollback();
    throw new Error(error?.message ?? "ไม่สามารถบันทึกของแถมได้");
  } finally {
    connection.release();
  }
}
