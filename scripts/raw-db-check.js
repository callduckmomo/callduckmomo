require('dotenv').config({ path: '.env.main' });
const mysql = require('mysql2/promise');

async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST.replace(/"/g, ''),
    user: process.env.DB_USER.replace(/"/g, ''),
    password: process.env.DB_PASSWORD.replace(/"/g, ''),
    database: process.env.DB_NAME.replace(/"/g, ''),
    port: parseInt(process.env.DB_PORT.replace(/"/g, '') || "3306", 10),
  });

  const [products] = await pool.query('SELECT id, name, LENGTH(image_url) as size FROM products WHERE LENGTH(image_url) > 100000');
  console.log('Products:', products);

  const [categories] = await pool.query('SELECT id, name, LENGTH(image_url) as size FROM categories WHERE LENGTH(image_url) > 100000');
  console.log('Categories:', categories);
  
  process.exit(0);
}

run().catch(console.error);
