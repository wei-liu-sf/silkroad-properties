const { DBFFile } = require('dbf');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbfFilePath = path.resolve(process.env.HOME, 'Downloads/L3_SHP_M026_Belmont/M026Assess_CY24_FY24.dbf');
const dbFilePath = path.join(__dirname, 'properties.db');

async function main() {
  const db = new sqlite3.Database(dbFilePath);
  
  console.log('Creating properties table...');
  await new Promise((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS properties (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        owner TEXT,
        street_name TEXT,
        street_number TEXT,
        city TEXT,
        zip_code TEXT,
        land_use TEXT,
        total_value REAL,
        property_id TEXT UNIQUE,
        state TEXT
      )
    `, (err) => {
      if (err) return reject(err);
      console.log('Table created or already exists.');
      resolve();
    });
  });

  const dbf = await DBFFile.open(dbfFilePath);
  console.log(`DBF file contains ${dbf.recordCount} records.`);

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO properties (property_id, owner, street_number, street_name, city, state, zip_code, land_use, total_value)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  console.log('Starting data import...');
  db.run('BEGIN TRANSACTION');
  for (const record of await dbf.readRecords()) {
    insertStmt.run(
      record.PROP_ID,
      record.OWNER1,
      record.STREET_NUM,
      record.STREET_NAM,
      record.CITY,
      record.STATE,
      record.ZIP,
      record.USE_DESC,
      record.TOTAL_VAL
    );
  }
  db.run('COMMIT');
  console.log('Data import complete.');

  insertStmt.finalize();
  db.close();
}

main().catch(console.error); 