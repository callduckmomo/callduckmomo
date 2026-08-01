import type { ProductRecord } from "@/lib/products/types";
import { safeParseJson } from "@/lib/products/account-parser";

export type ProductStockRow = Pick<
  ProductRecord,
  "stock" | "account_data"
>;

/** คำนวณสต็อกจริงจากคอลัมน์ stock หรือจำนวนบัญชีใน account_data */
export function getEffectiveStockFromRecord(
  record: ProductStockRow
): number {
  if (record.stock !== null && record.stock !== undefined) {
    const value =
      typeof record.stock === "number" ? record.stock : Number(record.stock);
    if (Number.isFinite(value)) {
      return value;
    }
  }

  if (record.account_data) {
    const parsed = safeParseJson<any[]>(record.account_data);
    if (parsed && Array.isArray(parsed) && parsed.length > 0) {
      return parsed.length;
    }
  }

  return 0;
}
