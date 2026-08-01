import pool from "@/lib/mysql";
import { getSiteId } from "@/lib/site";
import type {
  SupportCase,
  SupportCaseAttachment,
  CreateSupportCaseInput,
  UpdateSupportCaseInput,
} from "./types";
import { randomUUID } from "crypto";

function toSupportCaseAttachment(row: any): SupportCaseAttachment {
  return {
    id: row.id,
    caseId: row.case_id,
    fileUrl: row.file_url,
    fileName: row.file_name ?? null,
    fileSize: row.file_size ? Number(row.file_size) : null,
    mimeType: row.mime_type ?? null,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

function toSupportCase(row: any, attachments?: SupportCaseAttachment[]): SupportCase {
  return {
    id: row.id,
    caseCode: row.case_code,
    userId: row.user_id ?? null,
    orderId: row.order_id ?? null,
    productTypeId: row.product_type_id ?? null,
    productName: row.product_name ?? null,
    accountEmail: row.account_email ?? null,
    accountPassword: row.account_password ?? null,
    expirationDate: row.expiration_date ?? null,
    caseType: row.case_type,
    screenNumber: row.screen_number ?? null,
    problemDescription: row.problem_description,
    status: row.status,
    adminNote: row.admin_note ?? null,
    adminResponse: row.admin_response ?? null,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
    attachments: attachments || [],
    siteId: row.site_id ?? null,
  };
}

async function fetchAttachmentsByCaseIds(
  caseIds: string[]
): Promise<Map<string, SupportCaseAttachment[]>> {
  const attachmentsMap = new Map<string, SupportCaseAttachment[]>();
  if (caseIds.length === 0) return attachmentsMap;

  const placeholders = caseIds.map(() => "?").join(",");
  const [rows] = await pool.execute(
    `SELECT * FROM support_case_attachments WHERE case_id IN (${placeholders})`,
    caseIds
  );

  for (const row of rows as any[]) {
    const att = toSupportCaseAttachment(row);
    const caseId = att.caseId;
    const existing = attachmentsMap.get(caseId) || [];
    attachmentsMap.set(caseId, [...existing, att]);
  }

  return attachmentsMap;
}

export async function createSupportCase(
  input: CreateSupportCaseInput,
  userId: string
): Promise<SupportCase> {
  try {
    let caseCode = input.caseCode;
    
    if (!caseCode) {
      const year = new Date().getFullYear();
      
      // Find last case code for current year to determine sequence
      const [existingRows] = await pool.execute(
        "SELECT case_code FROM support_cases WHERE case_code LIKE ? ORDER BY case_code DESC LIMIT 1",
        [`CASE-${year}-%`]
      );
      const existingList = existingRows as any[];

      let sequenceNum = 1;
      if (existingList.length > 0) {
        const lastCode = existingList[0].case_code;
        const match = lastCode.match(/CASE-\d+-(\d+)/);
        if (match) {
          sequenceNum = parseInt(match[1], 10) + 1;
        }
      }

      caseCode = `CASE-${year}-${String(sequenceNum).padStart(5, "0")}`;
    }

    let orderData = null;
    let productData = null;

    if (input.orderId) {
      const [orderRows] = await pool.execute(
        "SELECT product_name, product_type_id FROM orders WHERE id = ? LIMIT 1",
        [input.orderId]
      );
      const orderList = orderRows as any[];
      if (orderList.length > 0) {
        orderData = {
          product_name: orderList[0].product_name ?? null,
          product_type_id: orderList[0].product_type_id ?? null
        };
      }
    }

    if (input.productTypeId) {
      const [productRows] = await pool.execute(
        "SELECT name, type_id FROM products WHERE type_id = ? LIMIT 1",
        [input.productTypeId]
      );
      const productList = productRows as any[];
      if (productList.length > 0) {
        productData = {
          name: productList[0].name ?? null,
          type_id: productList[0].type_id ?? null
        };
      }
    }

    const productName = input.productName || productData?.name || orderData?.product_name || null;

    const id = randomUUID();
    const now = new Date();

    const insertParams = [
      id,
      caseCode,
      userId,
      input.orderId || null,
      input.productTypeId || null,
      productName,
      input.accountEmail || null,
      input.accountPassword || null,
      input.expirationDate || null,
      input.caseType,
      input.screenNumber || null,
      input.problemDescription,
      "pending",
      null,
      null,
      now,
      now,
      getSiteId()
    ];

    await pool.execute(
      `INSERT INTO support_cases (
        id, case_code, user_id, order_id, product_type_id, product_name, account_email, account_password, expiration_date, case_type, screen_number, problem_description, status, admin_note, admin_response, created_at, updated_at, site_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      insertParams
    );

    return toSupportCase({
      id,
      case_code: caseCode,
      user_id: userId,
      order_id: input.orderId,
      product_type_id: input.productTypeId,
      product_name: productName,
      account_email: input.accountEmail,
      account_password: input.accountPassword,
      expiration_date: input.expirationDate,
      case_type: input.caseType,
      screen_number: input.screenNumber,
      problem_description: input.problemDescription,
      status: "pending",
      admin_note: null,
      admin_response: null,
      created_at: now,
      updated_at: now
    }, []);
  } catch (error: any) {
    throw new Error(`ไม่สามารถสร้างเคสได้: ${error.message}`);
  }
}

export async function findSupportCaseByCode(caseCode: string): Promise<SupportCase | null> {
  try {
    const [caseRows] = await pool.execute(
      "SELECT * FROM support_cases WHERE case_code = ? LIMIT 1",
      [caseCode]
    );
    const caseList = caseRows as any[];
    if (caseList.length === 0) return null;
    const caseData = caseList[0];

    const [attachmentsRows] = await pool.execute(
      "SELECT * FROM support_case_attachments WHERE case_id = ?",
      [caseData.id]
    );
    const attachmentsData = (attachmentsRows as any[]).map(toSupportCaseAttachment);

    return toSupportCase(caseData, attachmentsData);
  } catch (error) {
    console.error("Error in findSupportCaseByCode:", error);
    return null;
  }
}

export async function findSupportCaseById(id: string): Promise<SupportCase | null> {
  try {
    const [caseRows] = await pool.execute(
      "SELECT * FROM support_cases WHERE id = ? LIMIT 1",
      [id]
    );
    const caseList = caseRows as any[];
    if (caseList.length === 0) return null;
    const caseData = caseList[0];

    const [attachmentsRows] = await pool.execute(
      "SELECT * FROM support_case_attachments WHERE case_id = ?",
      [id]
    );
    const attachmentsData = (attachmentsRows as any[]).map(toSupportCaseAttachment);

    return toSupportCase(caseData, attachmentsData);
  } catch (error) {
    console.error("Error in findSupportCaseById:", error);
    return null;
  }
}

export async function getUserSupportCases(userId: string): Promise<SupportCase[]> {
  try {
    const [caseRows] = await pool.execute(
      "SELECT * FROM support_cases WHERE user_id = ? ORDER BY created_at DESC",
      [userId]
    );
    const casesData = caseRows as any[];
    if (casesData.length === 0) return [];

    const caseIds = casesData.map(c => c.id);
    const attachmentsMap = await fetchAttachmentsByCaseIds(caseIds);

    return casesData.map((caseData) =>
      toSupportCase(caseData, attachmentsMap.get(caseData.id) || [])
    );
  } catch (error: any) {
    throw new Error(`ไม่สามารถดึงข้อมูลเคสได้: ${error.message}`);
  }
}

export async function getAllSupportCases(filters?: {
  status?: string;
  productTypeId?: string;
  caseType?: string;
  searchEmail?: string;
  searchCaseCode?: string;
  siteId?: string;
}): Promise<SupportCase[]> {
  try {
    let whereClause = "1=1";
    const params: any[] = [];

    if (filters?.status) {
      whereClause += " AND status = ?";
      params.push(filters.status);
    }
    if (filters?.caseType) {
      whereClause += " AND case_type = ?";
      params.push(filters.caseType);
    }
    if (filters?.productTypeId) {
      whereClause += " AND product_type_id = ?";
      params.push(filters.productTypeId);
    }
    if (filters?.searchEmail) {
      whereClause += " AND account_email LIKE ?";
      params.push(`%${filters.searchEmail.trim()}%`);
    }
    if (filters?.searchCaseCode) {
      whereClause += " AND case_code LIKE ?";
      params.push(`%${filters.searchCaseCode.trim()}%`);
    }
    if (filters?.siteId) {
      whereClause += " AND site_id = ?";
      params.push(filters.siteId);
    }

    const [caseRows] = await pool.execute(
      `SELECT * FROM support_cases WHERE ${whereClause} ORDER BY created_at DESC`,
      params
    );
    const cases = caseRows as any[];
    if (cases.length === 0) return [];

    const caseIds = cases.map(c => c.id);
    const attachmentsMap = await fetchAttachmentsByCaseIds(caseIds);

    return cases.map((caseData) =>
      toSupportCase(caseData, attachmentsMap.get(caseData.id) || [])
    );
  } catch (error: any) {
    throw new Error(`ไม่สามารถดึงข้อมูลเคสได้: ${error.message}`);
  }
}

export async function getAllSupportCasesPaginated(
  filters?: {
    status?: string;
    productTypeId?: string;
    caseType?: string;
    searchEmail?: string;
    searchCaseCode?: string;
    siteId?: string;
  },
  options?: {
    page?: number;
    limit?: number;
    includeAttachments?: boolean;
  }
): Promise<{
  cases: SupportCase[];
  total: number;
  page: number;
  totalPages: number;
}> {
  try {
    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const offset = (page - 1) * limit;
    const includeAttachments = options?.includeAttachments ?? false;

    let whereClause = "1=1";
    const params: any[] = [];

    if (filters?.status) {
      whereClause += " AND status = ?";
      params.push(filters.status);
    }
    if (filters?.caseType) {
      whereClause += " AND case_type = ?";
      params.push(filters.caseType);
    }
    if (filters?.productTypeId) {
      whereClause += " AND product_type_id = ?";
      params.push(filters.productTypeId);
    }
    if (filters?.searchEmail) {
      whereClause += " AND account_email LIKE ?";
      params.push(`%${filters.searchEmail.trim()}%`);
    }
    if (filters?.searchCaseCode) {
      whereClause += " AND case_code LIKE ?";
      params.push(`%${filters.searchCaseCode.trim()}%`);
    }
    if (filters?.siteId) {
      whereClause += " AND site_id = ?";
      params.push(filters.siteId);
    }

    // Get total
    const [countRows] = await pool.execute(
      `SELECT COUNT(*) as count FROM support_cases WHERE ${whereClause}`,
      params
    );
    const total = (countRows as any[])[0].count;
    const totalPages = Math.ceil(total / limit);

    // Get paginated
    const selectParams = [...params, String(limit), String(offset)];
    const [caseRows] = await pool.execute(
      `SELECT * FROM support_cases 
       WHERE ${whereClause} 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      selectParams
    );
    const paginatedCases = caseRows as any[];

    let attachmentsMap = new Map<string, SupportCaseAttachment[]>();
    if (includeAttachments && paginatedCases.length > 0) {
      const caseIds = paginatedCases.map(c => c.id);
      attachmentsMap = await fetchAttachmentsByCaseIds(caseIds);
    }

    const cases = paginatedCases.map((caseData) =>
      toSupportCase(caseData, attachmentsMap.get(caseData.id) || [])
    );

    return {
      cases,
      total,
      page,
      totalPages,
    };
  } catch (error: any) {
    throw new Error(`ไม่สามารถดึงข้อมูลเคสได้: ${error.message}`);
  }
}

export async function updateSupportCase(
  id: string,
  updates: UpdateSupportCaseInput
): Promise<SupportCase> {
  try {
    const [existingRows] = await pool.execute("SELECT * FROM support_cases WHERE id = ? LIMIT 1", [id]);
    const list = existingRows as any[];
    if (list.length === 0) {
      throw new Error("ไม่พบเคสที่ต้องการอัปเดต");
    }

    const current = list[0];
    const status = updates.status !== undefined ? updates.status : current.status;
    const adminNote = updates.adminNote !== undefined ? updates.adminNote : current.admin_note;
    const adminResponse = updates.adminResponse !== undefined ? updates.adminResponse : current.admin_response;
    const now = new Date();

    await pool.execute(
      `UPDATE support_cases 
       SET status = ?, admin_note = ?, admin_response = ?, updated_at = ? 
       WHERE id = ?`,
      [status, adminNote, adminResponse, now, id]
    );

    const [attachmentsRows] = await pool.execute(
      "SELECT * FROM support_case_attachments WHERE case_id = ?",
      [id]
    );
    const attachmentsData = (attachmentsRows as any[]).map(toSupportCaseAttachment);

    return toSupportCase({
      ...current,
      status,
      admin_note: adminNote,
      admin_response: adminResponse,
      updated_at: now
    }, attachmentsData);
  } catch (error: any) {
    throw new Error(`ไม่สามารถอัปเดตเคสได้: ${error.message}`);
  }
}
