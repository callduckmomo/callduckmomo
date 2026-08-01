require('dotenv').config({ path: '.env.main' });
const mysql = require('mysql2/promise');
const admin = require('firebase-admin');
const crypto = require('crypto');

// Initialize Firebase Admin
if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/"/g, '')
    : undefined;

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID.replace(/"/g, ''),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL.replace(/"/g, ''),
      privateKey: privateKey,
    }),
    storageBucket: 'zeriessand-46264.appspot.com',
  });
}

const bucket = admin.storage().bucket();

async function uploadBase64ToFirebase(base64String, folder) {
  try {
    const matches = base64String.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return null;
    }
    const extension = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');
    
    const fileName = `${folder}/${crypto.randomUUID()}.${extension}`;
    const file = bucket.file(fileName);
    
    await file.save(buffer, {
      metadata: { contentType: `image/${matches[1]}` },
      public: true, // Make it public
    });
    
    // Make file public
    await file.makePublic();

    // Standard Firebase public URL
    const bucketName = 'zeriessand-46264.appspot.com';
    const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;
    return publicUrl;
  } catch (error) {
    console.error("Upload error:", error);
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

  console.log("Migrating Settings...");
  const [settings] = await pool.query('SELECT `key`, value, site_id FROM settings WHERE value LIKE "data:image/%"');
  for (const row of settings) {
    if (row.value && row.value.length > 500) {
      console.log(`Uploading setting: ${row.key} (Length: ${row.value.length})`);
      const url = await uploadBase64ToFirebase(row.value, 'settings');
      if (url) {
        await pool.query('UPDATE settings SET value = ? WHERE `key` = ? AND site_id = ?', [url, row.key, row.site_id]);
        console.log(`-> Saved as ${url}`);
      }
    }
  }

  console.log("Migrating Products...");
  const [products] = await pool.query('SELECT id, image_url FROM products WHERE image_url LIKE "data:image/%"');
  for (const row of products) {
    if (row.image_url && row.image_url.length > 500) {
      console.log(`Uploading product: ${row.id} (Length: ${row.image_url.length})`);
      const url = await uploadBase64ToFirebase(row.image_url, 'products');
      if (url) {
        await pool.query('UPDATE products SET image_url = ? WHERE id = ?', [url, row.id]);
        console.log(`-> Saved as ${url}`);
      }
    }
  }

  console.log("Migrating Categories...");
  const [categories] = await pool.query('SELECT id, image_url FROM categories WHERE image_url LIKE "data:image/%"');
  for (const row of categories) {
    if (row.image_url && row.image_url.length > 500) {
      console.log(`Uploading category: ${row.id} (Length: ${row.image_url.length})`);
      const url = await uploadBase64ToFirebase(row.image_url, 'categories');
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
