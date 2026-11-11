import { DatabaseSync } from "node:sqlite";
import fs from "fs";
import path from "path";

let instance: DatabaseSync | null = null;

// Opened lazily, on first real use inside a request handler — never at module
// import time. Next.js imports every route module during the build's page-data
// collection step; initializing eagerly would create/open the on-disk database
// (and let production output-file-tracing copy a local dev database into the
// deployable bundle).
function ensureDb(): DatabaseSync {
  if (instance) return instance;

  const dataDir = process.env.APP_DATA_DIR || path.join(process.cwd(), "data");
  if (!fs.existsSync(/* turbopackIgnore: true */ dataDir)) {
    fs.mkdirSync(/* turbopackIgnore: true */ dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, "app.db");
  const sqlite = new DatabaseSync(dbPath);
  sqlite.exec("PRAGMA journal_mode = WAL");
  sqlite.exec("PRAGMA foreign_keys = ON");

  sqlite.exec(`
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'New chat',
  persona TEXT NOT NULL DEFAULT 'default',
  model TEXT,
  system_prompt TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  model TEXT,
  created_at INTEGER NOT NULL,
  edited INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  mime TEXT,
  size INTEGER NOT NULL,
  content TEXT NOT NULL,
  chunks TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`);

  instance = sqlite;
  return sqlite;
}

// Proxy defers every operation (`.prepare`, `.exec`, ...) to the lazily
// created database, so existing call sites (`db.prepare(...)`) stay unchanged.
const db = new Proxy({} as DatabaseSync, {
  get(_target, prop, receiver) {
    const real = ensureDb();
    const value = Reflect.get(real, prop, receiver);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export default db;

export function getSetting(key: string): string | undefined {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as unknown as
    | { value: string }
    | undefined;
  return row?.value;
}

export function setSetting(key: string, value: string) {
  db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(key, value);
}

export function getAllSettings(): Record<string, string> {
  const rows = db.prepare("SELECT key, value FROM settings").all() as unknown as {
    key: string;
    value: string;
  }[];
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}
