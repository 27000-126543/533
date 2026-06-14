import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'agri_sim.db');

let SQL: SqlJsStatic;
let db: Database;

export async function initDatabase(): Promise<void> {
  if (db) return;

  SQL = await initSqlJs({
    locateFile: (file) =>
      path.join(__dirname, '..', '..', 'node_modules', 'sql.js', 'dist', file),
  });

  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
    console.log('Database loaded from disk');
  } else {
    db = new SQL.Database();
    createTables();
    seedData();
    saveDatabase();
    console.log('Database created with seed data');
  }
}

export function saveDatabase(): void {
  if (!db) return;
  const buffer = db.export();
  fs.writeFileSync(dbPath, Buffer.from(buffer));
}

function createTables() {
  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('agronomist','expert','chief_scientist','admin')),
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE varieties (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      is_suspended INTEGER NOT NULL DEFAULT 0,
      consecutive_deviations INTEGER NOT NULL DEFAULT 0,
      last_yield_deviation REAL,
      suspended_at TEXT,
      suspended_reason TEXT
    );

    CREATE TABLE simulation_tasks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending_validation',
      variety_id TEXT NOT NULL REFERENCES varieties(id),
      created_by TEXT NOT NULL REFERENCES users(id),
      progress REAL NOT NULL DEFAULT 0,
      yield_prediction REAL,
      soil_params TEXT NOT NULL,
      weather_data TEXT NOT NULL,
      fertilizer_plan TEXT NOT NULL,
      lai_series TEXT,
      soil_moisture_series TEXT,
      mineral_nitrogen_series TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE alerts (
      id TEXT PRIMARY KEY,
      simulation_id TEXT NOT NULL REFERENCES simulation_tasks(id),
      level INTEGER NOT NULL CHECK(level IN (1,2,3)),
      type TEXT NOT NULL CHECK(type IN ('water_deficit','nitrogen_leaching')),
      message TEXT NOT NULL,
      threshold REAL NOT NULL,
      current_value REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      reviewed_by TEXT REFERENCES users(id),
      review_note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE adjustment_logs (
      id TEXT PRIMARY KEY,
      alert_id TEXT NOT NULL REFERENCES alerts(id),
      previous_irrigation REAL NOT NULL,
      new_irrigation REAL NOT NULL,
      previous_fertilizer REAL NOT NULL,
      new_fertilizer REAL NOT NULL,
      reason TEXT NOT NULL,
      adjusted_by TEXT NOT NULL REFERENCES users(id),
      adjusted_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE approvals (
      id TEXT PRIMARY KEY,
      simulation_id TEXT NOT NULL REFERENCES simulation_tasks(id),
      level INTEGER NOT NULL CHECK(level IN (1,2)),
      status TEXT NOT NULL DEFAULT 'pending',
      reviewer_id TEXT REFERENCES users(id),
      comment TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      reviewed_at TEXT
    );

    CREATE TABLE reports (
      id TEXT PRIMARY KEY,
      simulation_id TEXT NOT NULL UNIQUE REFERENCES simulation_tasks(id),
      variety_name TEXT NOT NULL,
      lai_series TEXT,
      biomass_distribution TEXT,
      yield_contour TEXT,
      nitrogen_balance TEXT,
      carbon_footprint TEXT,
      wue REAL,
      nue REAL,
      final_yield REAL,
      pdf_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE recommendations (
      id TEXT PRIMARY KEY,
      variety_id TEXT NOT NULL REFERENCES varieties(id),
      variety_name TEXT NOT NULL,
      strategy TEXT NOT NULL,
      expected_yield REAL NOT NULL,
      expected_wue REAL NOT NULL,
      expected_nue REAL NOT NULL,
      confidence REAL NOT NULL,
      based_on_simulations TEXT NOT NULL
    );

    CREATE TABLE daily_stats (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL UNIQUE,
      completion_rate REAL NOT NULL DEFAULT 0,
      avg_wue REAL NOT NULL DEFAULT 0,
      avg_nue REAL NOT NULL DEFAULT 0,
      active_alerts INTEGER NOT NULL DEFAULT 0,
      yield_trends TEXT
    );
  `);
}

function seedData() {
  db.exec(`
    INSERT INTO users (id, username, password, role) VALUES
    ('u1', '李农艺师', '123456', 'agronomist'),
    ('u2', '王专家', '123456', 'expert'),
    ('u3', '张首席', '123456', 'chief_scientist'),
    ('u4', '系统管理员', '123456', 'admin');

    INSERT INTO varieties (id, name, type, is_suspended, consecutive_deviations, last_yield_deviation, suspended_at, suspended_reason) VALUES
    ('v1', '郑单958', '玉米', 0, 0, NULL, NULL, NULL),
    ('v2', '先玉335', '玉米', 0, 0, NULL, NULL, NULL),
    ('v3', '登海605', '玉米', 1, 3, 18.2, '2026-06-10 09:30:00', '连续三次模拟产量预测偏差超过15%'),
    ('v4', '济麦22', '小麦', 0, 1, 12.3, NULL, NULL),
    ('v5', '鲁原502', '小麦', 0, 0, NULL, NULL, NULL),
    ('v6', '南粳9108', '水稻', 0, 2, 13.8, NULL, NULL);
  `);
}

export function getDb(): Database {
  if (!db) throw new Error('Database not initialized');
  return db;
}

export function queryAll<T = any>(sql: string, params: any[] = []): T[] {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

export function queryOne<T = any>(sql: string, params: any[] = []): T | null {
  const results = queryAll<T>(sql, params);
  return results.length > 0 ? results[0] : null;
}

export function execute(sql: string, params: any[] = []): number {
  db.run(sql, params);
  saveDatabase();
  const res = db.exec('SELECT last_insert_rowid() as id');
  return res.length > 0 ? (res[0].values[0][0] as number) : 0;
}

export function runTransaction(statements: Array<{ sql: string; params: any[] }>): void {
  db.exec('BEGIN TRANSACTION');
  try {
    for (const s of statements) {
      db.run(s.sql, s.params);
    }
    db.exec('COMMIT');
    saveDatabase();
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}
