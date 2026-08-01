const mysql = require("mysql2/promise");
const { config } = require("dotenv");

config({ path: ".env.local" });

async function migrateSettingsImageStorage() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT || 3306),
  });

  try {
    await connection.execute(
      "ALTER TABLE settings MODIFY COLUMN value MEDIUMTEXT NULL"
    );

    const [columns] = await connection.execute("SHOW COLUMNS FROM settings");
    const valueColumn = columns.find((column) => column.Field === "value");

    if (valueColumn?.Type !== "mediumtext") {
      throw new Error(
        `Unexpected settings.value type: ${valueColumn?.Type ?? "missing"}`
      );
    }

    console.log("settings.value is MEDIUMTEXT and ready for image data URLs.");
  } finally {
    await connection.end();
  }
}

migrateSettingsImageStorage().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
