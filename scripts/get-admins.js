require('dotenv').config({path: '.env.vercel'});
const mysql = require('mysql2/promise');

async function main() {
  const c = await mysql.createConnection({uri: process.env.DATABASE_URL});
  const [rows] = await c.query('SELECT id, email, display_name, role, is_admin, is_active, site_id FROM users WHERE role IN ("admin", "superadmin") OR is_admin = 1');
  console.log(JSON.stringify(rows, null, 2));
  process.exit();
}
main().catch(console.error);
