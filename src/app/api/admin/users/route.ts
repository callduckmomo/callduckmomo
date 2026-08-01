import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import pool from "@/lib/mysql";
import { getCurrentUser, requireSuperAdmin, requireAdmin } from "@/lib/auth/server";
import { sendAdminAuditWebhook } from "@/lib/discord/admin-audit";
import { normalizeEmail } from "@/lib/auth/password";
import { randomUUID } from "crypto";
import { hashPassword } from "@/lib/auth/password";
import { getSiteId } from "@/lib/site";

const updateSchema = z.object({
  id: z.string(),
  displayName: z.string().min(1).max(64).optional(),
  isAdmin: z.boolean().optional(),
  role: z.enum(['user', 'admin', 'superadmin']).optional(),
  isActive: z.boolean().optional(),
  points: z.number().min(0).optional(),
  pointsDelta: z.number().optional(),
  userTier: z.enum(['normal', 'vip', 'walkin']).optional(),
  user_tier: z.enum(['normal', 'vip', 'walkin']).optional(),
  isApiEnabled: z.boolean().optional(),
});

type UserDoc = {
  id: string;
  email: string;
  display_name: string | null;
  is_admin: boolean;
  role: string;
  is_active: boolean;
  points: number;
  userTier: string;
  user_tier: string;
  site_id: string;
  is_api_enabled: boolean;
  sites?: Array<{ site_id: string, is_api_enabled: boolean, id: string }>;
  created_at: string;
};

function toUserDoc(row: any): UserDoc {
  let parsedSites;
  if (row.sites) {
    if (typeof row.sites === 'string') {
      try { parsedSites = JSON.parse(row.sites); } catch (e) {}
    } else {
      parsedSites = row.sites;
    }
  }
  if (Array.isArray(parsedSites)) {
    parsedSites = parsedSites.map(s => ({
      ...s,
      is_api_enabled: s.is_api_enabled === 1 || s.is_api_enabled === true
    }));
  }

  return {
    id: row.id,
    email: row.email,
    display_name: row.display_name ?? null,
    is_admin: row.is_admin === 1 || row.is_admin === true,
    role: row.role || 'user',
    is_active: row.is_active === 1 || row.is_active === true,
    points: Number(row.points ?? 0),
    userTier: row.user_tier || 'normal',
    user_tier: row.user_tier || 'normal',
    site_id: row.site_id || 'main',
    is_api_enabled: row.is_api_enabled === 1 || row.is_api_enabled === true,
    sites: parsedSites,
    created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

export async function GET(request: Request) {
  try {
    const me = await getCurrentUser();
    const isAuthorized = me?.role === 'superadmin' || me?.role === 'admin' || !!me?.isAdmin;
    if (!me || !isAuthorized) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.toLowerCase() ?? "";
    const limit = Number(url.searchParams.get("limit") ?? 50);
    const offset = Number(url.searchParams.get("offset") ?? 0);

    const siteId = getSiteId();
    let whereClause = "site_id = ?";
    const params: any[] = [siteId];

    if (siteId === 'main') {
      whereClause = "1=1";
      params.pop();
    }

    if (q) {
      whereClause += " AND (email LIKE ? OR display_name LIKE ?)";
      params.push(`%${q.trim()}%`, `%${q.trim()}%`);
    }

    let countQuery = `SELECT COUNT(*) as count FROM users WHERE ${whereClause}`;
    let dataQuery = `SELECT * FROM users WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`;

    if (siteId === 'main') {
      countQuery = `SELECT COUNT(DISTINCT CASE WHEN role IN ('admin', 'superadmin') OR is_admin = 1 THEN email ELSE id END) as count FROM users WHERE ${whereClause}`;
      dataQuery = `
        SELECT 
          MIN(id) as id,
          email,
          MAX(display_name) as display_name,
          MAX(is_admin) as is_admin,
          MAX(role) as role,
          MAX(is_active) as is_active,
          MAX(points) as points,
          MAX(user_tier) as user_tier,
          GROUP_CONCAT(site_id SEPARATOR ', ') as site_id,
          JSON_ARRAYAGG(JSON_OBJECT('site_id', site_id, 'is_api_enabled', is_api_enabled, 'id', id)) as sites,
          MAX(is_api_enabled) as is_api_enabled,
          MIN(created_at) as created_at
        FROM users 
        WHERE ${whereClause}
        GROUP BY email, CASE WHEN role IN ('admin', 'superadmin') OR is_admin = 1 THEN 1 ELSE id END
        ORDER BY MAX(created_at) DESC LIMIT ? OFFSET ?
      `;
    }

    // Get total count
    const [countRows] = await pool.execute(countQuery, params);
    const total = (countRows as any[])[0].count;

    // Get paginated users
    const selectParams = [...params, String(limit), String(offset)];
    const [rows] = await pool.execute(dataQuery, selectParams);

    const users = (rows as any[]).map(toUserDoc);

    return NextResponse.json({ 
      users,
      total,
      page: Math.floor(offset / limit) + 1,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const me = await requireAdmin();
    const isSuperAdminOperator = me.role === 'superadmin' || me.email?.toLowerCase() === "maripwriter@gmail.com";

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid payload" }, { status: 422 });
    }

    const { id, displayName, isAdmin, role, isActive, points, pointsDelta, userTier, user_tier, isApiEnabled } = parsed.data;

    // ตรวจสอบเบื้องต้น: ห้ามพนักงาน (admin) ตั้งซูเปอร์แอดมิน
    if (!isSuperAdminOperator) {
      if (role !== undefined && role === 'superadmin') {
        return NextResponse.json({ message: "พนักงานไม่สามารถตั้งซูเปอร์แอดมินได้" }, { status: 403 });
      }
    }
    
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const siteId = getSiteId();
      let selectQuery = "SELECT * FROM users WHERE id = ? AND site_id = ? LIMIT 1 FOR UPDATE";
      let selectParams = [id, siteId];
      if (siteId === 'main') {
        selectQuery = "SELECT * FROM users WHERE id = ? LIMIT 1 FOR UPDATE";
        selectParams = [id];
      }
      const [existingRows] = await connection.execute(selectQuery, selectParams);
      const list = existingRows as any[];
      if (list.length === 0) {
        return NextResponse.json({ message: "ไม่พบผู้ใช้" }, { status: 404 });
      }

      const currentUser = list[0];

      const targetRole = role !== undefined ? role : currentUser.role;
      const targetIsAdmin = isAdmin !== undefined ? isAdmin : currentUser.is_admin;

      // ห้ามพนักงาน (admin) แก้ไขข้อมูลผู้ดูแลระบบท่านอื่น (admin หรือ superadmin)
      if (!isSuperAdminOperator) {
        const isTargetAdmin = currentUser.role === 'admin' || currentUser.role === 'superadmin' || currentUser.is_admin === 1;
        if (isTargetAdmin) {
          return NextResponse.json({ message: "พนักงานไม่สามารถแก้ไขข้อมูลของผู้ดูแลระบบท่านอื่นได้" }, { status: 403 });
        }
      }
      const finalDisplayName = displayName !== undefined ? displayName : currentUser.display_name;
      const finalIsActive = isActive !== undefined ? (isActive ? 1 : 0) : currentUser.is_active;
      const incomingUserTier = userTier !== undefined ? userTier : user_tier;
      const finalUserTier = incomingUserTier !== undefined ? incomingUserTier : currentUser.user_tier;
      const finalIsApiEnabled = isApiEnabled !== undefined ? (isApiEnabled ? 1 : 0) : (currentUser.is_api_enabled !== undefined ? currentUser.is_api_enabled : 1);

      let finalRole = currentUser.role || 'user';
      let finalIsAdmin = currentUser.is_admin;

      if (role !== undefined) {
        finalRole = role;
        finalIsAdmin = (role === 'superadmin' || role === 'admin') ? 1 : 0;
      } else if (isAdmin !== undefined) {
        finalIsAdmin = isAdmin ? 1 : 0;
        if (isAdmin && !currentUser.role) {
          finalRole = 'superadmin';
        } else if (!isAdmin && currentUser.role === 'superadmin') {
          finalRole = 'user';
        }
      }

      // ห้ามพนักงานตั้งใครเป็น Super Admin
      if (!isSuperAdminOperator && (finalRole === 'superadmin' || (finalIsAdmin === 1 && finalRole !== 'admin'))) {
        return NextResponse.json({ message: "พนักงานไม่สามารถตั้งซูเปอร์แอดมินได้" }, { status: 403 });
      }

      let targetPoints = points !== undefined ? points : undefined;
      if (targetPoints === undefined) {
        const existingPoints = Number(currentUser.points ?? 0);
        targetPoints = existingPoints + (pointsDelta ?? 0);
      }
      const finalPoints = Math.max(0, Number(targetPoints ?? 0));
      const now = new Date();

      const isEditingAdmin = finalRole === 'admin' || finalRole === 'superadmin' || finalIsAdmin === 1;

      if (isEditingAdmin && currentUser.email) {
        await connection.execute(
          `UPDATE users 
           SET display_name = ?, is_admin = ?, role = ?, is_active = ?, points = ?, user_tier = ?, is_api_enabled = ?, updated_at = ? 
           WHERE email = ?`,
          [
            finalDisplayName,
            finalIsAdmin,
            finalRole,
            finalIsActive,
            finalPoints,
            finalUserTier,
            finalIsApiEnabled,
            now,
            currentUser.email
          ]
        );
      } else {
        await connection.execute(
          `UPDATE users 
           SET display_name = ?, is_admin = ?, role = ?, is_active = ?, points = ?, user_tier = ?, is_api_enabled = ?, updated_at = ? 
           WHERE id = ?`,
          [
            finalDisplayName,
            finalIsAdmin,
            finalRole,
            finalIsActive,
            finalPoints,
            finalUserTier,
            finalIsApiEnabled,
            now,
            id
          ]
        );
      }

      await connection.commit();

      // Send audit webhook
      const changes: Record<string, { old: string | number | null; new: string | number | null }> = {};
      if (displayName !== undefined) {
        changes["display_name"] = { old: currentUser.display_name, new: displayName };
      }
      if (isAdmin !== undefined) {
        changes["is_admin"] = { old: String(currentUser.is_admin === 1), new: String(isAdmin) };
      }
      if (role !== undefined) {
        changes["role"] = { old: currentUser.role || 'user', new: role };
      }
      if (isActive !== undefined) {
        changes["is_active"] = { old: String(currentUser.is_active === 1), new: String(isActive) };
      }
      if (userTier !== undefined) {
        changes["user_tier"] = { old: currentUser.user_tier || 'normal', new: userTier };
      }
      if (points !== undefined || pointsDelta !== undefined) {
        changes["points"] = { old: Number(currentUser.points ?? 0), new: finalPoints };
      }
      if (isApiEnabled !== undefined) {
        changes["is_api_enabled"] = { old: String(currentUser.is_api_enabled === 1), new: String(isApiEnabled) };
      }

      await sendAdminAuditWebhook({
        action: "อัปเดตผู้ใช้",
        target: `User ID: ${id}${currentUser.email ? ` (${currentUser.email})` : ""}`,
        changes: Object.keys(changes).length > 0 ? changes : undefined,
      });

      return NextResponse.json({ success: true });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

const createUserSchema = z.object({
  email: z.string().email("รูปแบบอีเมลไม่ถูกต้อง"),
  password: z.string().min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"),
  displayName: z.string().min(1, "กรุณากรอกชื่อแสดง").max(64, "ชื่อแสดงต้องไม่ยาวเกิน 64 ตัวอักษร"),
  role: z.enum(['user', 'admin', 'superadmin']).optional().default('user'),
  userTier: z.enum(['normal', 'vip', 'walkin']).optional().default('normal'),
  points: z.number().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export async function POST(request: Request) {
  try {
    const me = await requireAdmin();
    const isSuperAdminOperator = me.role === 'superadmin' || me.email?.toLowerCase() === "maripwriter@gmail.com";

    const body = await request.json();
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "ข้อมูลไม่ถูกต้อง",
          issues: parsed.error.flatten().fieldErrors,
        },
        { status: 422 }
      );
    }

    const { email, password, displayName, role, userTier, points, isActive } = parsed.data;

    // ตรวจสอบ: ห้ามพนักงาน (admin) สร้างซูเปอร์แอดมิน
    if (!isSuperAdminOperator && role === 'superadmin') {
      return NextResponse.json({ message: "พนักงานไม่สามารถสร้างซูเปอร์แอดมินได้" }, { status: 403 });
    }


    const siteId = getSiteId();
    const normalizedEmail = normalizeEmail(email);

    const [existingRows] = await pool.execute(
      "SELECT 1 FROM users WHERE email = ? AND site_id = ? LIMIT 1",
      [normalizedEmail, siteId]
    );
    const existingList = existingRows as any[];
    if (existingList.length > 0) {
      return NextResponse.json(
        { message: "อีเมลนี้ถูกใช้งานแล้ว" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const id = randomUUID();
    const now = new Date();

    const record = {
      id,
      email: normalizedEmail,
      password_hash: passwordHash,
      display_name: displayName,
      role: role,
      is_admin: role === 'admin' || role === 'superadmin' ? 1 : 0,
      user_tier: userTier,
      points: points,
      is_active: isActive ? 1 : 0,
      created_at: now,
      updated_at: now,
    };

    await pool.execute(
      `INSERT INTO users (
        id, email, password_hash, display_name, role, is_admin, user_tier, points, is_active, site_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        record.email,
        record.password_hash,
        record.display_name,
        record.role,
        record.is_admin,
        record.user_tier,
        record.points,
        record.is_active,
        siteId,
        record.created_at,
        record.updated_at
      ]
    );

    await sendAdminAuditWebhook({
      action: "สร้างผู้ใช้ใหม่",
      target: `User ID: ${record.id} (${record.email})`,
      details: `สร้างผู้ใช้ใหม่: ${record.email} (${displayName}) - Role: ${role}, Tier: ${userTier}`,
    });

    return NextResponse.json({ user: record, success: true }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const me = await requireAdmin();
    const isSuperAdminOperator = me.role === 'superadmin' || me.email?.toLowerCase() === "maripwriter@gmail.com";

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ message: "กรุณาระบุ ID ของผู้ใช้" }, { status: 422 });
    }

    const siteId = getSiteId();
    const [existingRows] = await pool.execute(
      "SELECT * FROM users WHERE id = ? AND site_id = ? LIMIT 1",
      [id, siteId]
    );
    const list = existingRows as any[];
    if (list.length === 0) {
      return NextResponse.json({ message: "ไม่พบผู้ใช้" }, { status: 404 });
    }

    const user = list[0];

    // ห้ามพนักงาน (admin) ลบผู้ดูแลระบบคนอื่น (admin หรือ superadmin)
    if (!isSuperAdminOperator) {
      const isTargetAdmin = user.role === 'admin' || user.role === 'superadmin' || user.is_admin === 1;
      if (isTargetAdmin) {
        return NextResponse.json({ message: "พนักงานไม่สามารถลบผู้ดูแลระบบได้" }, { status: 403 });
      }
    }

    if (me?.id === id) {
      return NextResponse.json({ message: "ไม่สามารถลบบัญชีของตัวเองได้" }, { status: 400 });
    }

    await pool.execute("DELETE FROM users WHERE id = ?", [id]);

    await sendAdminAuditWebhook({
      action: "ลบผู้ใช้",
      target: `User ID: ${id} (${user.email})`,
      details: `ลบผู้ใช้ "${user.email}" (${user.display_name || 'ไม่มีชื่อ'}) สำเร็จ`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
