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

  const [tables] = await connection.query('SHOW TABLES');
  const tableNames = tables.map(t => Object.values(t)[0]);
  
  for (const t of tableNames) {
    const [cols] = await connection.query('SHOW COLUMNS FROM ' + t);
    const hasSiteId = cols.some(c => c.Field === 'site_id');
    console.log(t + ' -> has site_id: ' + hasSiteId);
  }
  
  await connection.end();
}
run();
