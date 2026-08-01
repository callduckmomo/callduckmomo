import pool from "@/lib/mysql";
import type { SlipHistory } from "./types";
import { randomUUID } from "crypto";
import { getSiteId } from "@/lib/site";

function toSlipHistory(row: any): SlipHistory {
  return {
    id: row.id,
    userId: row.user_id,
    transactionId: row.transaction_id ?? null,
    amount: Number(row.amount),
    qrPayload: row.qr_payload,
    status: row.status as "success" | "failed" | "pending",
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

export async function saveSlipHistory(
  data: Omit<SlipHistory, "id" | "createdAt">
): Promise<SlipHistory> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const id = randomUUID();
    const now = new Date();
    const siteId = getSiteId();

    await connection.execute(
      `INSERT INTO slip_history (id, user_id, transaction_id, amount, qr_payload, status, site_id, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.userId, data.transactionId, data.amount, data.qrPayload, data.status, siteId, now, now]
    );



    await connection.commit();

    return {
      id,
      userId: data.userId,
      transactionId: data.transactionId,
      amount: data.amount,
      qrPayload: data.qrPayload,
      status: data.status,
      createdAt: now.toISOString(),
    };
  } catch (error: any) {
    await connection.rollback();
    throw new Error(`ไม่สามารถบันทึกประวัติได้: ${error?.message ?? "unknown error"}`);
  } finally {
    connection.release();
  }
}

export async function checkDuplicateSlip(
  transactionId: string
): Promise<boolean> {
  try {
    const siteId = getSiteId();
    const [rows] = await pool.execute(
      "SELECT 1 FROM slip_history WHERE transaction_id = ? AND site_id = ? LIMIT 1",
      [transactionId, siteId]
    );
    return (rows as any[]).length > 0;
  } catch (error: any) {
    throw new Error(`ไม่สามารถตรวจสอบสลิปซ้ำได้: ${error.message}`);
  }
}

export async function listSlipHistoryByUser(
  userId: string,
  limit = 20
): Promise<SlipHistory[]> {
  try {
    const siteId = getSiteId();
    const [rows] = await pool.execute(
      "SELECT * FROM slip_history WHERE user_id = ? AND site_id = ? ORDER BY created_at DESC LIMIT ?",
      [userId, siteId, String(limit)]
    );
    return (rows as any[]).map(toSlipHistory);
  } catch (error) {
    console.error("Error in listSlipHistoryByUser:", error);
    return [];
  }
}
