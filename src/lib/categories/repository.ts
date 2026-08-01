import pool from "@/lib/mysql";
import type { Category } from "@/lib/products/types";
import { randomUUID } from "crypto";

export type CategoryScope = {
  siteId: string;
  isLocal: boolean;
};

function scopedCategoryWhere(scope: CategoryScope): { clause: string; params: string[] } {
  if (scope.isLocal) {
    return {
      clause: "is_local = 1 AND site_id = ?",
      params: [scope.siteId],
    };
  }

  return {
    clause: "COALESCE(is_local, 0) = 0 AND (site_id IS NULL OR site_id = '' OR site_id = 'main')",
    params: [],
  };
}

function toCategory(row: any): Category {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    imageUrl: row.image_url ?? null,
    displayOrder: row.display_order ?? 0,
    isActive: row.is_active === 1 || row.is_active === true,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
  };
}

export async function getAllCategories(scope?: CategoryScope): Promise<Category[]> {
  try {
    const scopeSql = scope ? scopedCategoryWhere(scope) : null;
    const query = scopeSql
      ? `SELECT * FROM categories WHERE is_active = 1 AND ${scopeSql.clause} ORDER BY display_order ASC, name ASC`
      : "SELECT * FROM categories WHERE is_active = 1 ORDER BY display_order ASC, name ASC";
    const [rows] = scopeSql
      ? await pool.execute(query, scopeSql.params)
      : await pool.execute(query);
    return (rows as any[]).map(toCategory);
  } catch (error) {
    console.error("Error in getAllCategories:", error);
    return [];
  }
}

export async function getAllCategoriesIncludingInactive(scope?: CategoryScope): Promise<Category[]> {
  try {
    const scopeSql = scope ? scopedCategoryWhere(scope) : null;
    const query = scopeSql
      ? `SELECT * FROM categories WHERE ${scopeSql.clause} ORDER BY display_order ASC, name ASC`
      : "SELECT * FROM categories ORDER BY display_order ASC, name ASC";
    const [rows] = scopeSql
      ? await pool.execute(query, scopeSql.params)
      : await pool.execute(query);
    return (rows as any[]).map(toCategory);
  } catch (error) {
    console.error("Error in getAllCategoriesIncludingInactive:", error);
    return [];
  }
}

export async function getCategoryById(id: string, scope?: CategoryScope): Promise<Category | null> {
  try {
    const scopeSql = scope ? scopedCategoryWhere(scope) : null;
    const query = scopeSql
      ? `SELECT * FROM categories WHERE id = ? AND ${scopeSql.clause}`
      : "SELECT * FROM categories WHERE id = ?";
    const params = scopeSql ? [id, ...scopeSql.params] : [id];
    const [rows] = await pool.execute(query, params);
    const list = rows as any[];
    if (list.length === 0) return null;
    return toCategory(list[0]);
  } catch (error) {
    console.error("Error in getCategoryById:", error);
    return null;
  }
}

export async function createCategory(
  name: string,
  description: string | null = null,
  imageUrl: string | null = null,
  displayOrder: number = 0,
  isActive: boolean = true,
  siteId: string | null = null,
  isLocal: boolean = false
): Promise<Category> {
  try {
    const id = randomUUID();
    const now = new Date();
    
    await pool.execute(
      `INSERT INTO categories (id, name, description, image_url, display_order, is_active, created_at, updated_at, site_id, is_local) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, description, imageUrl, displayOrder, isActive ? 1 : 0, now, now, siteId, isLocal ? 1 : 0]
    );

    return {
      id,
      name,
      description,
      imageUrl,
      displayOrder,
      isActive,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
  } catch (error: any) {
    throw new Error(`ไม่สามารถสร้างหมวดหมู่ได้: ${error?.message || "Unknown error"}`);
  }
}

export async function updateCategory(
  id: string,
  updates: {
    name?: string;
    description?: string | null;
    imageUrl?: string | null;
    displayOrder?: number;
    isActive?: boolean;
  },
  scope?: CategoryScope
): Promise<Category> {
  try {
    const currentCategory = await getCategoryById(id, scope);
    if (!currentCategory) {
      throw new Error("ไม่พบหมวดหมู่ที่ต้องการแก้ไข");
    }

    const current = currentCategory;
    const name = updates.name !== undefined ? updates.name : current.name;
    const description = updates.description !== undefined ? updates.description : current.description;
    const imageUrl = updates.imageUrl !== undefined ? updates.imageUrl : current.imageUrl;
    const displayOrder = updates.displayOrder !== undefined ? updates.displayOrder : current.displayOrder;
    const isActive = updates.isActive !== undefined ? updates.isActive : current.isActive;
    const now = new Date();

    await pool.execute(
      `UPDATE categories 
       SET name = ?, description = ?, image_url = ?, display_order = ?, is_active = ?, updated_at = ? 
       WHERE id = ?`,
      [name, description, imageUrl, displayOrder, isActive ? 1 : 0, now, id]
    );

    return {
      id,
      name,
      description,
      imageUrl,
      displayOrder,
      isActive: Boolean(isActive),
      createdAt: current.createdAt,
      updatedAt: now.toISOString(),
    };
  } catch (error: any) {
    throw new Error(`ไม่สามารถอัปเดตหมวดหมู่ได้: ${error?.message || "Unknown error"}`);
  }
}

export async function deleteCategory(id: string, scope?: CategoryScope): Promise<void> {
  try {
    if (scope && !(await getCategoryById(id, scope))) {
      throw new Error("ไม่พบหมวดหมู่ที่ต้องการลบ");
    }

    // ตรวจสอบว่ามีสินค้าใช้หมวดหมู่นี้อยู่หรือไม่
    const [productRows] = await pool.execute(
      "SELECT 1 FROM products WHERE category_id = ? LIMIT 1",
      [id]
    );
    
    if ((productRows as any[]).length > 0) {
      throw new Error("ไม่สามารถลบหมวดหมู่ได้ เนื่องจากมีสินค้าใช้หมวดหมู่นี้อยู่");
    }

    await pool.execute("DELETE FROM categories WHERE id = ?", [id]);
  } catch (error: any) {
    throw new Error(`ไม่สามารถลบหมวดหมู่ได้: ${error.message}`);
  }
}
