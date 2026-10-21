import path from "node:path";
import fs from "node:fs";

let dbInstance: any = null;

function getDb() {
  if (dbInstance) return dbInstance;
  try {
    // Dynamic require so webpack doesn't try to bundle it into edge/client
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { DatabaseSync } = require("node:sqlite");
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const dbPath = path.join(dataDir, "enjuego.sqlite");
    const db = new DatabaseSync(dbPath);
    db.exec("PRAGMA journal_mode = WAL;");
    db.exec("PRAGMA synchronous = NORMAL;");
    db.exec(`
      CREATE TABLE IF NOT EXISTS kv_store (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at INTEGER
      );
    `);
    dbInstance = db;
    return dbInstance;
  } catch (err) {
    console.warn("[SQLite Store] Initialization warning:", err);
    return null;
  }
}

export function sqliteGet(key: string): string | null {
  try {
    const db = getDb();
    if (!db) return null;
    const stmt = db.prepare("SELECT value FROM kv_store WHERE key = ?");
    const row = stmt.get(key) as { value: string } | undefined;
    return row?.value ?? null;
  } catch (err) {
    console.error(`[SQLite Store] get error for key "${key}":`, err);
    return null;
  }
}

export function sqlitePut(key: string, value: string): void {
  try {
    const db = getDb();
    if (!db) return;
    const stmt = db.prepare(
      "INSERT INTO kv_store (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"
    );
    stmt.run(key, value, Date.now());
  } catch (err) {
    console.error(`[SQLite Store] put error for key "${key}":`, err);
  }
}

export function sqliteDelete(key: string): void {
  try {
    const db = getDb();
    if (!db) return;
    const stmt = db.prepare("DELETE FROM kv_store WHERE key = ?");
    stmt.run(key);
  } catch (err) {
    console.error(`[SQLite Store] delete error for key "${key}":`, err);
  }
}
