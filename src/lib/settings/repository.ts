import pool from "@/lib/mysql";
import { unstable_cache } from "next/cache";
import { randomUUID } from "crypto";
import { getSiteId } from "@/lib/site";

export type Setting = {
  key: string;
  value: string | null;
  description: string | null;
  updatedAt: string;
};

function toSetting(row: any): Setting {
  return {
    key: row.key,
    value: row.value ?? null,
    description: row.description ?? null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
  };
}

export const getAllSettings = unstable_cache(
  _getAllSettings,
  ["all-settings"],
  { tags: ["settings"], revalidate: 604800 }
);

async function _getAllSettings(): Promise<Setting[]> {
  try {
    const siteId = getSiteId();
    let query = "SELECT * FROM settings WHERE site_id = ?";
    if (siteId === "main") {
      query = "SELECT * FROM settings WHERE site_id = ? OR site_id IS NULL OR site_id = ''";
    }
    const [rows] = await pool.execute(query, [siteId]);
    const settings = (rows as any[]).map(toSetting);
    return settings.sort((a, b) => a.key.localeCompare(b.key, "th"));
  } catch (error: any) {
    throw new Error(`ไม่สามารถอ่านการตั้งค่าได้: ${error.message}`);
  }
}

export const getSetting = unstable_cache(
  _getSetting,
  ["single-setting"],
  { tags: ["settings"], revalidate: 604800 }
);

async function _getSetting(key: string): Promise<Setting | null> {
  try {
    const siteId = getSiteId();
    let query = "SELECT * FROM settings WHERE `key` = ? AND site_id = ? LIMIT 1";
    if (siteId === "main") {
      query = "SELECT * FROM settings WHERE `key` = ? AND (site_id = ? OR site_id IS NULL OR site_id = '') LIMIT 1";
    }
    const [rows] = await pool.execute(query, [key, siteId]);
    const list = rows as any[];
    if (list.length === 0) return null;
    return toSetting(list[0]);
  } catch (error: any) {
    throw new Error(`ไม่สามารถอ่านการตั้งค่าได้: ${error.message}`);
  }
}

export async function updateSetting(
  key: string,
  value: string | null
): Promise<Setting> {
  try {
    const siteId = getSiteId();
    const now = new Date();
    
    // Check if key setting already exists for this site_id
    const [existing] = await pool.execute(
      "SELECT id FROM settings WHERE `key` = ? AND site_id = ? LIMIT 1",
      [key, siteId]
    );
    const list = existing as any[];

    if (list.length > 0) {
      await pool.execute(
        "UPDATE settings SET value = ?, updated_at = ? WHERE `key` = ? AND site_id = ?",
        [value, now, key, siteId]
      );
    } else {
      const id = randomUUID();
      await pool.execute(
        "INSERT INTO settings (id, `key`, value, description, created_at, updated_at, site_id) VALUES (?, ?, ?, NULL, ?, ?, ?)",
        [id, key, value, now, now, siteId]
      );
    }

    // MySQL can silently truncate oversized TEXT values when strict mode is off.
    // Verify the exact stored value so image uploads can never report a false success.
    const [savedRows] = await pool.execute(
      "SELECT value FROM settings WHERE `key` = ? AND site_id = ? LIMIT 1",
      [key, siteId]
    );
    const savedList = savedRows as Array<{ value: string | null }>;
    const savedValue = savedList[0]?.value ?? null;

    if (savedList.length === 0 || savedValue !== value) {
      throw new Error(
        `Setting "${key}" was not stored completely. Check the settings.value column capacity.`
      );
    }

    return {
      key,
      value,
      description: null,
      updatedAt: now.toISOString(),
    };
  } catch (error: any) {
    throw new Error(
      `ไม่สามารถอัปเดตการตั้งค่าได้: ${error?.message ?? "unknown error"}`
    );
  }
}

export const getSettingValue = async (key: string) => {
  return _getSettingValue(key);
};

async function _getSettingValue(key: string): Promise<string | null> {
  const setting = await getSetting(key);
  return setting?.value ?? null;
}



export const getSettingValues = async (keys: string[]) => {
  return _getSettingValues(keys);
};

async function _getSettingValues(
  keys: string[]
): Promise<Record<string, string | null>> {
  if (keys.length === 0) {
    return {};
  }

  const uniqueKeys = [...new Set(keys)];
  
  try {
    const result: Record<string, string | null> = Object.fromEntries(
      uniqueKeys.map((key) => [key, null])
    );

    const siteId = getSiteId();
    let query = `SELECT \`key\`, value FROM settings WHERE \`key\` IN (${uniqueKeys.map(() => "?").join(",")}) AND site_id = ?`;
    let params = [...uniqueKeys, siteId];

    if (siteId === "main") {
      query = `SELECT \`key\`, value FROM settings WHERE \`key\` IN (${uniqueKeys.map(() => "?").join(",")}) AND (site_id = ? OR site_id IS NULL OR site_id = '')`;
    }

    const [rows] = await pool.execute(query, params);
    const list = rows as any[];

    for (const row of list) {
      result[row.key] = row.value ?? null;
    }

    return result;
  } catch (error: any) {
    console.error("Error in getSettingValues:", error);
    throw new Error(`ไม่สามารถอ่านการตั้งค่าได้: ${error.message}`);
  }
}

// ✅ ยกเลิก unstable_cache เพราะรูป Base64 ใหญ่เกิน 2MB ทำให้ Vercel พยายามเขียนแคชรัวๆ (ISR Writes พุ่ง)
// layout ทั่วไปยังใช้ cached version สำหรับ static page generation
export const getSettingValuesCached = async (keys: string[]) => {
  return getSettingValues(keys);
};

/** Layout settings must reflect the database immediately after a save/rebuild. */
export const getSettingValuesForLayout = async (keys: string[]) => {
  return _getSettingValues(keys);
};

export const getAllSettingsCached = async () => {
  return getAllSettings();
};

/** สำหรับ Admin Panel — เรียกตรง DB ไม่ผ่าน cache เพื่อให้เห็นข้อมูลล่าสุดเสมอ */
export const getAllSettingsForAdmin = async () => {
  return _getAllSettings();
};
