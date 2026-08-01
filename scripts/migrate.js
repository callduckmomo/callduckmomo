const mysql = require('mysql2/promise');
const fs = require('fs');

async function runMigration() {
  const envContent = fs.readFileSync('.env', 'utf8');
  const env = {};
  envContent.split('\n').forEach(line => {
    if (line && line.includes('=')) {
      const [k, v] = line.split('=');
      env[k.trim()] = v.trim().replace(/^\"|\"$/g, '');
    }
  });

  const connection = await mysql.createConnection({
    host: env.DB_HOST,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    port: parseInt(env.DB_PORT || '3306', 10),
    multipleStatements: true
  });

  const sql = fs.readFileSync('migrations/02_add_site_id_settings.sql', 'utf8');
  
  try {
    console.log('Running migration...');
    const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0 && !s.startsWith('-- Drop') && !s.startsWith('-- CREATE UNIQUE'));
    
    for (const stmt of statements) {
      if (stmt.startsWith('--')) continue; // Skip full comment lines
      console.log('Executing: ' + stmt.substring(0, 50) + '...');
      try {
        await connection.query(stmt);
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
           console.log('Column already exists, skipping.');
        } else if (err.code === 'ER_TABLE_EXISTS_ERROR') {
           console.log('Table already exists, skipping.');
        } else if (err.code === 'ER_DUP_KEYNAME') {
           console.log('Index already exists, skipping.');
        } else {
           console.error('Error on stmt:', err.message);
        }
      }
    }
    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await connection.end();
  }
}

runMigration();
