const mysql = require("mysql2/promise");
const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf8");
  content.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const firstEq = trimmed.indexOf("=");
    if (firstEq === -1) return;
    const key = trimmed.slice(0, firstEq).trim();
    let val = trimmed.slice(firstEq + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  });
}

loadEnv();

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

const formattedPrivateKey = privateKey.replace(/\\n/g, "\n");

admin.initializeApp({
  credential: admin.credential.cert({
    projectId,
    clientEmail,
    privateKey: formattedPrivateKey,
  }),
});

const db = admin.firestore();

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || "3306", 10),
  });

  // 1. Fetch all products from MySQL (main table)
  const [products] = await connection.query("SELECT * FROM products");
  console.log(`Fetched ${products.length} products from MySQL.`);

  // 2. Fetch all site prices from MySQL (child overrides)
  const [sitePrices] = await connection.query("SELECT * FROM site_product_prices");
  console.log(`Fetched ${sitePrices.length} site price overrides from MySQL.`);

  // Map overrides by product_id and site_id
  const overrides = {};
  sitePrices.forEach((row) => {
    if (!overrides[row.product_id]) {
      overrides[row.product_id] = {};
    }
    overrides[row.product_id][row.site_id] = {
      price: row.retail_price != null ? Number(row.retail_price) : null,
      priceVip: row.price_vip != null ? Number(row.price_vip) : null,
      priceWalkin: row.price_walkin != null ? Number(row.price_walkin) : null,
    };
  });

  // 3. Sync each product to Firestore
  for (const product of products) {
    const accountData = JSON.parse(product.account_data || "[]");
    let stock = 0;
    if (accountData && Array.isArray(accountData)) {
      stock = accountData.length;
    } else if (product.stock !== null && product.stock !== undefined) {
      stock = Number(product.stock);
    }

    const docRef = db.collection("products").doc(product.id);

    const payload = {
      id: product.id,
      type_id: product.type_id,
      name: product.name,
      image_url: product.image_url,
      details: product.details,
      stock: stock,
      type_menu: product.type_menu,
      is_published: Boolean(product.is_published),
      badge: product.badge,
      category_id: product.category_id,
      account_email: product.account_email,
      account_password: product.account_password,
      account_data: accountData,
      api_provider_id: product.api_provider_id,
      updated_at: new Date().toISOString(),

      // Main site prices
      price: product.price != null ? Number(product.price) : null,
      price_vip: product.price_vip != null ? Number(product.price_vip) : null,
      price_walkin: product.price_walkin != null ? Number(product.price_walkin) : null,
      price_main: product.price != null ? Number(product.price) : null,
      price_main_vip: product.price_vip != null ? Number(product.price_vip) : null,
      price_main_walkin: product.price_walkin != null ? Number(product.price_walkin) : null,
    };

    // Add child site overrides
    const productOverrides = overrides[product.id] || {};
    Object.keys(productOverrides).forEach((siteId) => {
      const o = productOverrides[siteId];
      payload[`price_${siteId}`] = o.price;
      payload[`price_${siteId}_vip`] = o.priceVip;
      payload[`price_${siteId}_walkin`] = o.priceWalkin;
    });

    await docRef.set(payload, { merge: true });
    console.log(`Synced: ${product.name} (ID: ${product.id}, Stock: ${stock}, Main Price: ${payload.price})`);
  }

  console.log("All products successfully synced to Firestore!");
  await connection.end();
}

main().catch(console.error);
