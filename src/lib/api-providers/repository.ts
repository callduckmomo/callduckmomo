import pool from "@/lib/mysql";
import type { ApiProvider, CreateApiProviderInput, UpdateApiProviderInput } from "./types";
import { randomUUID } from "crypto";

function toApiProvider(row: any): ApiProvider {
  return {
    id: row.id,
    name: row.name,
    displayName: row.display_name,
    apiKey: row.api_key ?? null,
    apiEndpoint: row.api_endpoint,
    productEndpoint: row.product_endpoint ?? null,
    buyEndpoint: row.buy_endpoint ?? null,
    historyEndpoint: row.history_endpoint ?? null,
    isActive: row.is_active === 1 || row.is_active === true,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
  };
}

export async function getAllApiProviders(): Promise<ApiProvider[]> {
  try {
    const [rows] = await pool.execute("SELECT * FROM api_providers ORDER BY name ASC");
    return (rows as any[]).map(toApiProvider);
  } catch (error) {
    console.error("Error in getAllApiProviders:", error);
    throw new Error(`ไม่สามารถดึงข้อมูล API providers ได้: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export async function getActiveApiProviders(): Promise<ApiProvider[]> {
  try {
    const [rows] = await pool.execute("SELECT * FROM api_providers WHERE is_active = 1 ORDER BY name ASC");
    return (rows as any[]).map(toApiProvider);
  } catch (error) {
    console.error("Error in getActiveApiProviders:", error);
    throw new Error(`ไม่สามารถดึงข้อมูล API providers ได้: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export async function getApiProviderById(id: string): Promise<ApiProvider | null> {
  try {
    const [rows] = await pool.execute("SELECT * FROM api_providers WHERE id = ? LIMIT 1", [id]);
    const list = rows as any[];
    if (list.length === 0) return null;
    return toApiProvider(list[0]);
  } catch (error) {
    console.error("Error in getApiProviderById:", error);
    throw new Error(`ไม่สามารถดึงข้อมูล API provider ได้: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export async function getApiProviderByName(name: string): Promise<ApiProvider | null> {
  try {
    const [rows] = await pool.execute("SELECT * FROM api_providers WHERE name = ? LIMIT 1", [name]);
    const list = rows as any[];
    if (list.length === 0) return null;
    return toApiProvider(list[0]);
  } catch (error) {
    console.error("Error in getApiProviderByName:", error);
    throw new Error(`ไม่สามารถดึงข้อมูล API provider ได้: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export async function createApiProvider(input: CreateApiProviderInput): Promise<ApiProvider> {
  try {
    const id = randomUUID();
    const now = new Date();

    const insertParams = [
      id,
      input.name,
      input.displayName,
      input.apiKey || null,
      input.apiEndpoint,
      input.productEndpoint || null,
      input.buyEndpoint || null,
      input.historyEndpoint || null,
      input.isActive ?? true ? 1 : 0,
      now,
      now
    ];

    await pool.execute(
      `INSERT INTO api_providers (
        id, name, display_name, api_key, api_endpoint, product_endpoint, buy_endpoint, history_endpoint, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      insertParams
    );

    return {
      id,
      name: input.name,
      displayName: input.displayName,
      apiKey: input.apiKey || null,
      apiEndpoint: input.apiEndpoint,
      productEndpoint: input.productEndpoint || null,
      buyEndpoint: input.buyEndpoint || null,
      historyEndpoint: input.historyEndpoint || null,
      isActive: input.isActive ?? true,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };
  } catch (error: any) {
    throw new Error(`ไม่สามารถสร้าง API provider ได้: ${error?.message ?? "unknown error"}`);
  }
}

export async function updateApiProvider(
  id: string,
  input: UpdateApiProviderInput
): Promise<ApiProvider> {
  try {
    const [existingRows] = await pool.execute("SELECT * FROM api_providers WHERE id = ? LIMIT 1", [id]);
    const list = existingRows as any[];
    if (list.length === 0) {
      throw new Error("ไม่พบ API provider ที่ต้องการแก้ไข");
    }

    const current = list[0];
    const displayName = input.displayName !== undefined ? input.displayName : current.display_name;
    const apiKey = input.apiKey !== undefined ? (input.apiKey === "" ? null : input.apiKey) : current.api_key;
    const apiEndpoint = input.apiEndpoint !== undefined ? input.apiEndpoint : current.api_endpoint;
    const productEndpoint = input.productEndpoint !== undefined ? input.productEndpoint : current.product_endpoint;
    const buyEndpoint = input.buyEndpoint !== undefined ? input.buyEndpoint : current.buy_endpoint;
    const historyEndpoint = input.historyEndpoint !== undefined ? input.historyEndpoint : current.history_endpoint;
    const isActive = input.isActive !== undefined ? input.isActive : current.is_active;
    const now = new Date();

    await pool.execute(
      `UPDATE api_providers 
       SET display_name = ?, api_key = ?, api_endpoint = ?, product_endpoint = ?, buy_endpoint = ?, history_endpoint = ?, is_active = ?, updated_at = ? 
       WHERE id = ?`,
      [
        displayName,
        apiKey,
        apiEndpoint,
        productEndpoint,
        buyEndpoint,
        historyEndpoint,
        isActive ? 1 : 0,
        now,
        id
      ]
    );

    return {
      id,
      name: current.name,
      displayName,
      apiKey,
      apiEndpoint,
      productEndpoint,
      buyEndpoint,
      historyEndpoint,
      isActive: isActive === 1 || isActive === true,
      createdAt: new Date(current.created_at).toISOString(),
      updatedAt: now.toISOString()
    };
  } catch (error: any) {
    throw new Error(`ไม่สามารถอัปเดต API provider ได้: ${error?.message ?? "unknown error"}`);
  }
}

export async function deleteApiProvider(id: string): Promise<void> {
  try {
    await pool.execute("DELETE FROM api_providers WHERE id = ?", [id]);
  } catch (error: any) {
    throw new Error(`ไม่สามารถลบ API provider ได้: ${error.message}`);
  }
}
