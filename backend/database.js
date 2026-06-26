const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'logistics.db');

let db = null;

// ─── Persist to file ──────────────────────────────────────────────────────────

function saveDB() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// ─── Synchronous-style wrapper (mirrors better-sqlite3 API) ───────────────────

function run(sql, params = []) {
  db.run(sql, params);
  saveDB();
  return db;
}

function get(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

function all(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

// ─── Init database ────────────────────────────────────────────────────────────

async function initDatabase() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS truck_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      truck_number TEXT NOT NULL,
      driver_name TEXT NOT NULL,
      transporter_name TEXT NOT NULL DEFAULT '',
      material_type TEXT NOT NULL,
      quantity REAL NOT NULL,
      entry_time TEXT NOT NULL,
      created_by TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);
  saveDB();

  // Migration: add transporter_name column if it doesn't exist
  try {
    db.run(`ALTER TABLE truck_entries ADD COLUMN transporter_name TEXT NOT NULL DEFAULT ''`);
    saveDB();
    console.log('✅ Migration: transporter_name column added.');
  } catch (e) {
    // Column already exists — ignore
  }

  // Seed users
  const adminExists = get('SELECT id FROM users WHERE username = ?', ['admin']);
  if (!adminExists) {
    run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', ['admin', 'admin123', 'admin']);
    run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', ['supervisor', 'supervisor123', 'supervisor']);
  }

  // Migration / Seed refresh: check if old-style TRK- numbers are present
  const oldDataCheck = get("SELECT id FROM truck_entries WHERE truck_number LIKE 'TRK-%' LIMIT 1");
  if (oldDataCheck) {
    console.log('🔄 Old-style mock entries detected. Reseeding database with professional Indian names...');
    run('DELETE FROM truck_entries');
    run("DELETE FROM sqlite_sequence WHERE name='truck_entries'");
  }

  // Seed entries
  const countRow = get('SELECT COUNT(*) as cnt FROM truck_entries');
  if (!countRow || countRow.cnt === 0) {
    const trucks = [
      'MH-12-PQ-8821', 'DL-01-A-4932', 'KA-03-MB-6677', 'HR-26-Z-1024', 'GJ-01-XX-9022',
      'MH-43-AR-4491', 'UP-16-AT-3321', 'TN-09-CQ-5044', 'KA-51-AB-1209', 'GJ-03-BC-4411',
      'MH-14-GH-7890', 'DL-3C-BF-5566', 'HR-55-XY-8811', 'GJ-05-ZZ-9900', 'UP-80-AB-4455',
      'MH-04-DE-2345', 'WB-20-AB-6789', 'AP-16-TJ-1122', 'TS-07-UD-4433', 'KL-07-CB-9090'
    ];
    const drivers = [
      'Baldev Singh', 'Satnam Singh', 'Rajesh Kumar', 'Jagdish Patel', 'Mandeep Sharma',
      'Amit Yadav', 'Jaspreet Singh', 'Sanjay Dutt', 'Vijay Mistry', 'Gurpreet Singh',
      'Ramesh Pal', 'Suresh Nair', 'Devendra Prasad', 'Dinesh Karthik', 'Vikas Gowda',
      'Harpreet Singh', 'Sunil Yadav', 'Rajinder Prasad', 'Amrit Singh', 'Karanvir Singh'
    ];
    const materials = ['Cement', 'Sand', 'Steel', 'Gravel', 'Bricks', 'Other'];
    const quantities = [500, 750, 1000, 1200, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000];
    const transporters = [
      'Delhivery SafeExpress', 'Gati KWE Logistics', 'Mahadev Roadways',
      'VRL Logistics Ltd', 'Patel Roadlines', 'TCI Freight',
      'Blue Dart Express', 'Tata Logistics Corp', 'Jai Maharashtra Transport',
      'DTC Logistics India'
    ];

    for (let i = 0; i < 60; i++) {
      const daysAgo    = Math.floor(Math.random() * 30);
      const hoursAgo   = Math.floor(Math.random() * 24);
      const minutesAgo = Math.floor(Math.random() * 60);

      const entryDate = new Date();
      entryDate.setDate(entryDate.getDate() - daysAgo);
      entryDate.setHours(hoursAgo, minutesAgo, 0, 0);

      const truck     = trucks[Math.floor(Math.random() * trucks.length)];
      const driver    = drivers[Math.floor(Math.random() * drivers.length)];
      const material  = materials[Math.floor(Math.random() * materials.length)];
      const quantity  = quantities[Math.floor(Math.random() * quantities.length)];
      const entryTime = entryDate.toISOString().replace('T',' ').slice(0,19);
      const createdBy = Math.random() > 0.5 ? 'admin' : 'supervisor';
      const transporter = transporters[Math.floor(Math.random() * transporters.length)];

      run(
        'INSERT INTO truck_entries (truck_number, driver_name, transporter_name, material_type, quantity, entry_time, created_by) VALUES (?,?,?,?,?,?,?)',
        [truck, driver, transporter, material, quantity, entryTime, createdBy]
      );
    }
    console.log('✅ Database seeded with 60 sample Indian-style entries.');
  }

  console.log('✅ Database initialized.');
}

// ─── Last insert id helper ────────────────────────────────────────────────────

function lastInsertId() {
  const row = get('SELECT last_insert_rowid() as id');
  return row ? row.id : null;
}

module.exports = { initDatabase, run, get, all, saveDB, lastInsertId };
