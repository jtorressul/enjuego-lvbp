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
      CREATE TABLE IF NOT EXISTS editorial_articles (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        excerpt TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT NOT NULL,
        team_code TEXT,
        image_url TEXT NOT NULL,
        author TEXT NOT NULL,
        source_url TEXT,
        published_at TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_articles_created ON editorial_articles(created_at DESC);
    `);
    dbInstance = db;
    return dbInstance;
  } catch (err) {
    console.warn("[SQLite Store] Initialization warning:", err);
    return null;
  }
}

export type EditorialArticle = {
  id: string;
  title: string;
  excerpt: string;
  content: string[]; // array of paragraphs
  category: string;
  teamCode?: string;
  imageUrl: string;
  author: string;
  sourceUrl?: string;
  publishedAt: string;
  createdAt: number;
};

export function sqliteSaveArticle(article: EditorialArticle): void {
  try {
    const db = getDb();
    if (!db) return;
    const stmt = db.prepare(`
      INSERT INTO editorial_articles (id, title, excerpt, content, category, team_code, image_url, author, source_url, published_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        excerpt = excluded.excerpt,
        content = excluded.content,
        category = excluded.category,
        team_code = excluded.team_code,
        image_url = excluded.image_url,
        published_at = excluded.published_at
    `);
    stmt.run(
      article.id,
      article.title,
      article.excerpt,
      JSON.stringify(article.content),
      article.category,
      article.teamCode || null,
      article.imageUrl,
      article.author,
      article.sourceUrl || null,
      article.publishedAt,
      article.createdAt || Date.now()
    );
  } catch (err) {
    console.error(`[SQLite Store] save article error for "${article.id}":`, err);
  }
}

export function sqliteGetArticles(limit = 30): EditorialArticle[] {
  try {
    const db = getDb();
    if (!db) return [];
    const stmt = db.prepare(`
      SELECT id, title, excerpt, content, category, team_code, image_url, author, source_url, published_at, created_at
      FROM editorial_articles
      ORDER BY created_at DESC
      LIMIT ?
    `);
    const rows = stmt.all(limit) as Array<{
      id: string;
      title: string;
      excerpt: string;
      content: string;
      category: string;
      team_code: string | null;
      image_url: string;
      author: string;
      source_url: string | null;
      published_at: string;
      created_at: number;
    }>;

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      excerpt: r.excerpt,
      content: (() => {
        try {
          return JSON.parse(r.content);
        } catch {
          return [r.content];
        }
      })(),
      category: r.category,
      teamCode: r.team_code || undefined,
      imageUrl: r.image_url,
      author: r.author,
      sourceUrl: r.source_url || undefined,
      publishedAt: r.published_at,
      createdAt: r.created_at,
    }));
  } catch (err) {
    console.error("[SQLite Store] get articles error:", err);
    return [];
  }
}

export function sqliteGetArticle(id: string): EditorialArticle | null {
  try {
    const db = getDb();
    if (!db) return null;
    const stmt = db.prepare(`
      SELECT id, title, excerpt, content, category, team_code, image_url, author, source_url, published_at, created_at
      FROM editorial_articles
      WHERE id = ?
    `);
    const r = stmt.get(id) as
      | {
          id: string;
          title: string;
          excerpt: string;
          content: string;
          category: string;
          team_code: string | null;
          image_url: string;
          author: string;
          source_url: string | null;
          published_at: string;
          created_at: number;
        }
      | undefined;

    if (!r) return null;
    return {
      id: r.id,
      title: r.title,
      excerpt: r.excerpt,
      content: (() => {
        try {
          return JSON.parse(r.content);
        } catch {
          return [r.content];
        }
      })(),
      category: r.category,
      teamCode: r.team_code || undefined,
      imageUrl: r.image_url,
      author: r.author,
      sourceUrl: r.source_url || undefined,
      publishedAt: r.published_at,
      createdAt: r.created_at,
    };
  } catch (err) {
    console.error(`[SQLite Store] get article error for "${id}":`, err);
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
