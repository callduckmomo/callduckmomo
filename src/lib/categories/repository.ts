import pool from "@/lib/mysql";
import type { Category } from "@/lib/products/types";
import { randomUUID } from "crypto";

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

export async function getAllCategories(): Promise<Category[]> {
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM categories WHERE is_active = 1 ORDER BY display_order ASC, name ASC"
    );
    return (rows as any[]).map(toCategory);
  } catch (error) {
    console.error("Error in getAllCategories:", error);
    return [];
  }
}

export async function getAllCategoriesIncludingInactive(): Promise<Category[]> {
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM categories ORDER BY display_order ASC, name ASC"
    );
    return (rows as any[]).map(toCategory);
  } catch (error) {
    console.error("Error in getAllCategoriesIncludingInactive:", error);
    return [];
  }
}

export async function getCategoryById(id: string): Promise<Category | null> {
  try {
    const [rows] = await pool.execute("SELECT * FROM categories WHERE id = ?", [id]);
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
  }
): Promise<Category> {
  try {
    const [existingRows] = await pool.execute("SELECT * FROM categories WHERE id = ?", [id]);
    const list = existingRows as any[];
    if (list.length === 0) {
      throw new Error("ไม่พบหมวดหมู่ที่ต้องการแก้ไข");
    }

    const current = list[0];
    const name = updates.name !== undefined ? updates.name : current.name;
    const description = updates.description !== undefined ? updates.description : current.description;
    const imageUrl = updates.imageUrl !== undefined ? updates.imageUrl : current.image_url;
    const displayOrder = updates.displayOrder !== undefined ? updates.displayOrder : current.display_order;
    const isActive = updates.isActive !== undefined ? updates.isActive : current.is_active;
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
      isActive: isActive === 1 || isActive === true,
      createdAt: new Date(current.created_at).toISOString(),
      updatedAt: now.toISOString(),
    };
  } catch (error: any) {
    throw new Error(`ไม่สามารถอัปเดตหมวดหมู่ได้: ${error?.message || "Unknown error"}`);
  }
}

export async function deleteCategory(id: string): Promise<void> {
  try {
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
