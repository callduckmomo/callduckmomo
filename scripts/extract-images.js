require('dotenv').config({ path: '.env.main' });
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

async function extractBase64ToLocal(base64String, folderName) {
  try {
    const matches = base64String.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return null;
    }
    const extension = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');
    
    const fileName = `${crypto.randomUUID()}.${extension}`;
    const targetDir = path.join(__dirname, '..', 'public', 'uploads', folderName);
    
    // Create directory if not exists
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    const targetPath = path.join(targetDir, fileName);
    fs.writeFileSync(targetPath, buffer);
    
    return `/uploads/${folderName}/${fileName}`;
  } catch (error) {
    console.error("Extract error:", error);
    return null;
  }
}

async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST.replace(/"/g, ''),
    user: process.env.DB_USER.replace(/"/g, ''),
    password: process.env.DB_PASSWORD.replace(/"/g, ''),
    database: process.env.DB_NAME.replace(/"/g, ''),
    port: parseInt(process.env.DB_PORT.replace(/"/g, '') || "3306", 10),
  });

  console.log("Extracting Settings...");
  const [settings] = await pool.query('SELECT `key`, value, site_id FROM settings WHERE value LIKE "data:image/%"');
  for (const row of settings) {
    if (row.value && row.value.length > 500) {
      console.log(`Extracting setting: ${row.key} (Length: ${row.value.length})`);
      const url = await extractBase64ToLocal(row.value, 'settings');
      if (url) {
        await pool.query('UPDATE settings SET value = ? WHERE `key` = ? AND (site_id = ? OR (site_id IS NULL AND ? IS NULL))', [url, row.key, row.site_id, row.site_id]);
        console.log(`-> Saved as ${url}`);
      }
    }
  }

  console.log("Extracting Products...");
  const [products] = await pool.query('SELECT id, image_url FROM products WHERE image_url LIKE "data:image/%"');
  for (const row of products) {
    if (row.image_url && row.image_url.length > 500) {
      console.log(`Extracting product: ${row.id} (Length: ${row.image_url.length})`);
      const url = await extractBase64ToLocal(row.image_url, 'products');
      if (url) {
        await pool.query('UPDATE products SET image_url = ? WHERE id = ?', [url, row.id]);
        console.log(`-> Saved as ${url}`);
      }
    }
  }

  console.log("Extracting Categories...");
  const [categories] = await pool.query('SELECT id, image_url FROM categories WHERE image_url LIKE "data:image/%"');
  for (const row of categories) {
    if (row.image_url && row.image_url.length > 500) {
      console.log(`Extracting category: ${row.id} (Length: ${row.image_url.length})`);
      const url = await extractBase64ToLocal(row.image_url, 'categories');
      if (url) {
        await pool.query('UPDATE categories SET image_url = ? WHERE id = ?', [url, row.id]);
        console.log(`-> Saved as ${url}`);
      }
    }
  }

  console.log("All done!");
  process.exit(0);
}

run().catch(console.error);
