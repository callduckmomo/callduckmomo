const mysql = require('mysql2/promise');
const fs = require('fs');

async function main() {
  const connection = await mysql.createConnection({
    host: 'thsv91.hostatom.com',
    user: 'appbymari_admin',
    password: 't94e3aeh',
    database: 'appbymari_db',
    port: 3306
  });

  const [rows] = await connection.query("SELECT * FROM settings");
  fs.writeFileSync('db-settings.json', JSON.stringify(rows, null, 2));
  
  process.exit(0);
}

main().catch(console.error);
