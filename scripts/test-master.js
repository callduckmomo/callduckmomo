require('dotenv').config({path: '.env.vercel'});
const mysql = require('mysql2/promise');

async function main() {
  const c = await mysql.createConnection({uri: process.env.DATABASE_URL});
  const [rows] = await c.query('SELECT setting_key, setting_value FROM settings WHERE setting_key IN ("MASTER_DOMAIN_URL", "MASTER_API_KEY")');
  const settings = rows.reduce((acc, row) => ({...acc, [row.setting_key]: row.setting_value}), {});
  const url = settings.MASTER_DOMAIN_URL;
  const key = settings.MASTER_API_KEY;
  console.log('URL:', url);
  
  const res = await fetch(url + '/api/v1/buy', {
    method: 'POST',
    headers: { 'x-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ typeId: 'test', quantity: 1, requestId: 'test' })
  });
  
  const text = await res.text();
  console.log('STATUS:', res.status);
  console.log('RESPONSE:', text.substring(0, 500));
  process.exit();
}
main().catch(console.error);
