const mysql = require('mysql2/promise');
const crypto = require('crypto');
const fs = require('fs');
async function run() {
  const envContent = fs.readFileSync('.env', 'utf8');
  const env = {};
  envContent.split('\n').forEach(line => {
    if (line && line.includes('=')) {
      const [k, v] = line.split('=');
      env[k.trim()] = v.trim().replace(/^"|"$/g, '');
    }
  });

  const connection = await mysql.createConnection({
    host: env.DB_HOST,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    port: parseInt(env.DB_PORT || '3306', 10),
  });

  const [users] = await connection.query("SELECT * FROM users WHERE email = 'Rungwadee2547@gmail.com'");
  
  if (users.length > 0 && users.every(u => u.site_id !== 'child1')) {
    const original = users[0];
    const newId = crypto.randomUUID();
    await connection.query(
      "INSERT INTO users (id, email, password_hash, display_name, created_at, updated_at, is_admin, is_active, points, role, user_tier, total_topup_amount, topup_count, last_topup_at, site_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        newId, original.email, original.password_hash, original.display_name, original.created_at, original.updated_at,
        original.is_admin, original.is_active, original.points, original.role, original.user_tier, original.total_topup_amount,
        original.topup_count, original.last_topup_at, 'child1'
      ]
    );
    console.log('Copied user to child1');
  } else {
     console.log('User already exists in child1 or not found in main');
  }
  
  await connection.end();
}
run();
