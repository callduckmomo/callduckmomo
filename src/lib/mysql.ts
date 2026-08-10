import mysql from "mysql2/promise";

const globalForMysql = globalThis as typeof globalThis & {
  __appbymariMysqlPool?: ReturnType<typeof mysql.createPool>;
  __appbymariMysqlMockPatched?: boolean;
};

const parsePoolSize = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const connectionLimit = parsePoolSize(process.env.DB_CONNECTION_LIMIT, 2);
const maxIdle = Math.min(
  connectionLimit,
  parsePoolSize(process.env.DB_MAX_IDLE, 1)
);

const pool = globalForMysql.__appbymariMysqlPool ?? mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || "3306", 10),
  waitForConnections: true,
  connectionLimit,
  maxIdle,
  idleTimeout: 30_000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  queueLimit: 0,
  timezone: "+07:00",
});

globalForMysql.__appbymariMysqlPool = pool;

// --- MOCK MODE FOR TESTING (BYPASS DB CONNECTION ERROR) ---
if (process.env.MOCK_DB === "true" && !globalForMysql.__appbymariMysqlMockPatched) {
  globalForMysql.__appbymariMysqlMockPatched = true;
  const originalExecute = pool.execute.bind(pool);

  pool.execute = async (sql: any, values?: any) => {
    const queryStr = (typeof sql === 'string' ? sql : sql?.sql || "").toString().toLowerCase();
    
    // Intercept Adminsand login directly for Mock Mode testing
    if (
      (queryStr.includes("users where email") && values && values[0]?.toLowerCase() === "goddricg@gmail.com") ||
      (queryStr.includes("users where id") && values && values[0] === "mock-admin-123")
    ) {
      return [[{
        id: "mock-admin-123",
        email: "goddricg@gmail.com",
        password_hash: "$2b$10$r1bfatVyFhF8J7AKuEVMsOYAY/bZhKzK/TmbX0tLqwwyY93WvHMO6", // t94e3aeh
        display_name: "SuperAdmin (Mock)",
        is_admin: 1,
        role: "superadmin",
        is_active: 1,
        points: 9999,
        user_tier: "vip",
        site_id: values[1] || "main",
        created_at: new Date(),
        updated_at: new Date()
      }], []] as any;
    }

    try {
      return await originalExecute(sql, values);
    } catch (error: any) {
      const queryStr = (typeof sql === 'string' ? sql : sql?.sql || "").toString().toLowerCase();
      
      // คืนค่าแบบมี 1 แถวเสมอ เพื่อป้องกัน error Cannot read properties of undefined
      const dummyRow = {
        count: 0,
        total_stock: 0,
        is_api_enabled: 1,
        category: "ทั้งหมด",
        image_url: null
      };

      if (queryStr.includes("count") || queryStr.includes("sum(")) {
        return [[dummyRow], []] as any;
      }

      if (queryStr.includes("from categories")) {
        return [[dummyRow], []] as any;
      }

      if (queryStr.includes("users where email")) {
        return [[dummyRow], []] as any;
      }

      // สำหรับตารางอื่นๆ คืนค่าเป็น Array ว่าง
      return [[], []] as any;
    }
  };
}
// -----------------------------------------------------------

export default pool;
