/**
 * ทดสอบ flow อัปโหลด Logo / รูปร้าน (settings base64) ผ่าน API admin
 */
const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";

// 1x1 PNG สีแดง (เล็กมาก — จำลองผลหลัง compress)
const TEST_LOGO_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

async function loginAsAdmin() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "goddricg@gmail.com",
      password: "t94e3aeh",
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Login failed ${res.status}: ${body.message || JSON.stringify(body)}`);
  }
  const setCookie = res.headers.get("set-cookie") || "";
  const match = setCookie.match(/appmymari_session=([^;]+)/);
  if (!match) {
    throw new Error("No appmymari_session cookie in login response");
  }
  return match[1];
}

async function main() {
  console.log("=== ทดสอบอัปโหลด Logo และรูปร้าน (settings) ===\n");
  console.log("Base URL:", BASE);

  const token = await loginAsAdmin();
  console.log("✓ Login admin สำเร็จ\n");

  const cookie = `appmymari_session=${token}`;

  const keys = {
    site_logo_url: TEST_LOGO_DATA_URL,
    home_shortcut_image_1: TEST_LOGO_DATA_URL,
  };

  const patchRes = await fetch(`${BASE}/api/admin/settings`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({ settings: keys }),
  });
  const patchBody = await patchRes.json().catch(() => ({}));

  if (!patchRes.ok) {
    console.error("✗ PATCH /api/admin/settings ล้มเหลว:", patchRes.status, patchBody);
    process.exit(1);
  }
  console.log("✓ PATCH settings:", patchBody.message || patchBody);
  console.log("  อัปเดต keys:", Object.keys(keys).join(", "), "\n");

  const getRes = await fetch(`${BASE}/api/admin/settings`, {
    headers: { Cookie: cookie },
  });
  const getBody = await getRes.json().catch(() => ({}));
  if (!getRes.ok) {
    console.error("✗ GET /api/admin/settings ล้มเหลว:", getRes.status);
    process.exit(1);
  }

  const settingsMap = Object.fromEntries(
    (getBody.settings || []).map((s) => [s.key, s.value])
  );

  let ok = true;
  for (const [key, expected] of Object.entries(keys)) {
    const actual = settingsMap[key];
    const match = actual === expected;
    console.log(`${match ? "✓" : "✗"} ${key}: ${match ? "ตรงกับที่บันทึก" : `ไม่ตรง (len=${actual?.length ?? 0})`}`);
    if (!match) ok = false;
  }

  const pubRes = await fetch(
    `${BASE}/api/settings/public?keys=site_logo_url,home_shortcut_image_1`
  );
  const pubBody = await pubRes.json().catch(() => ({}));
  if (!pubRes.ok) {
    console.error("✗ GET /api/settings/public ล้มเหลว:", pubRes.status);
    process.exit(1);
  }

  const pubLogo = pubBody.site_logo_url;
  const pubShortcut = pubBody.home_shortcut_image_1;
  console.log("\nPublic API:");
  console.log(
    `${pubLogo === TEST_LOGO_DATA_URL ? "✓" : "✗"} site_logo_url แสดงใน public settings`
  );
  console.log(
    `${pubShortcut === TEST_LOGO_DATA_URL ? "✓" : "✗"} home_shortcut_image_1 แสดงใน public settings`
  );

  if (!pubLogo || pubLogo !== TEST_LOGO_DATA_URL) ok = false;
  if (!pubShortcut || pubShortcut !== TEST_LOGO_DATA_URL) ok = false;

  console.log(ok ? "\n=== ผลรวม: ผ่าน ===" : "\n=== ผลรวม: มีขั้นตอนล้มเหลว (ตรวจ DB / MOCK_DB) ===");
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
