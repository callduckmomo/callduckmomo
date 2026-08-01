require('dotenv').config({path: '.env.vercel'});
const mysql = require('mysql2/promise');

async function main() {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
  });
  const [rows] = await c.query('DESCRIBE users;');
  console.log(JSON.stringify(rows, null, 2));
  process.exit();
}
main().catch(console.error);
