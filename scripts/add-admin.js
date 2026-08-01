const mysql = require('mysql2/promise');
const fs = require('fs');

async function run() {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const env = {};
  envContent.split('\n').forEach(line => {
    if (line && line.includes('=')) {
      const [k, v] = line.split('=');
      env[k.trim()] = v.trim().replace(/^\"|\"$/g, '');
    }
  });

  const connection = await mysql.createConnection({
    host: env.DB_HOST,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    port: parseInt(env.DB_PORT || '3306', 10),
  });

  try {
    const uuid = require('crypto').randomUUID();
    const hash = '$2b$10$3DM7lCYRcN1gRAZtxdXrY.xFBM03Os5azAWqmsJQlKfmfzoIQg3na'; // Hash of 'Midnightsun'
    
    await connection.execute(
      `INSERT INTO users (id, email, password_hash, display_name, is_admin, role, is_active, site_id, is_api_enabled) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), is_admin = VALUES(is_admin), role = VALUES(role)`,
      [
        uuid,
        'apichayacom.038n@gmail.com',
        hash,
        'Admin Apichaya',
        1,
        'superadmin',
        1,
        env.NEXT_PUBLIC_SITE_ID || 'main',
        1
      ]
    );
    console.log('Admin account created successfully.');
  } catch (err) {
    console.error('Failed:', err);
  } finally {
    await connection.end();
  }
}

run();
