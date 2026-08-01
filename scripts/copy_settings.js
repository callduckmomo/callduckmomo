const mysql = require('mysql2/promise');
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

  const [settingsRows] = await connection.query("SELECT * FROM settings WHERE site_id='child1'");
  console.log('child1 settings: ' + settingsRows.length);
  
  if (settingsRows.length === 0) {
    const [mainRows] = await connection.query("SELECT * FROM settings WHERE site_id='main'");
    for (const r of mainRows) {
        await connection.query("INSERT INTO settings (id, `key`, value, description, created_at, updated_at, site_id) VALUES (UUID(), ?, ?, ?, NOW(), NOW(), 'child1')", [r.key, r.value, r.description]);
    }
    console.log('copied main settings to child1');
  }
  
  await connection.end();
}
run();
