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

  const [cols] = await connection.query("SHOW COLUMNS FROM users");
  console.log(cols.map(c => c.Field));
  
  await connection.end();
}
run();
