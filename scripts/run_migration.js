require('dotenv').config({path: '.env.main'});
const mysql = require('mysql2/promise');

async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  const query = "INSERT IGNORE INTO settings (id, `key`, value, description, site_id) VALUES (UUID(), 'main_site_api_key', '', 'API Key สำหรับเชื่อมต่อดึงข้อมูลจากเว็บหลัก', 'main')";
  await pool.query(query);
  console.log('Migration completed.');
  process.exit(0);
}

run().catch(console.error);
