const mysql = require('mysql2/promise');

async function main() {
  const connection = await mysql.createConnection({
    host: 'thsv91.hostatom.com',
    user: 'appbymari_admin',
    password: 't94e3aeh',
    database: 'appbymari_db',
    port: 3306
  });

  const key = 'login_bg_image';
  const value = '/images/login-bg.jpg';
  const siteId = 'main';
  const now = new Date();
  
  await connection.execute(
    `INSERT INTO settings (id, \`key\`, value, description, created_at, updated_at, site_id)
     VALUES (UUID(), ?, ?, 'Login Page Background Image', ?, ?, ?)
     ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = VALUES(updated_at)`,
    [key, value, now, now, siteId]
  );
  
  console.log("Successfully updated login_bg_image in settings table.");
  
  await connection.end();
}

main().catch(console.error);
