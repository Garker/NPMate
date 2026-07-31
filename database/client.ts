import { join } from 'node:path'
import Database from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { app } from 'electron'
import * as schema from './schema'

let database: BetterSQLite3Database<typeof schema> | null = null

/**
 * 延迟创建数据库，确保调用发生在 Electron app ready 之后。
 */
export function getDatabase(): BetterSQLite3Database<typeof schema> {
  if (database) {
    return database
  }

  const sqlite = new Database(join(app.getPath('userData'), 'npmate.db'))
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      path TEXT NOT NULL UNIQUE,
      framework TEXT NOT NULL,
      node_version TEXT NOT NULL,
      package_manager TEXT NOT NULL,
      lock_file TEXT,
      dependencies_count INTEGER NOT NULL DEFAULT 0,
      dev_dependencies_count INTEGER NOT NULL DEFAULT 0,
      node_modules_size INTEGER NOT NULL DEFAULT 0,
      scanned_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      removed_at TEXT
    );
    CREATE TABLE IF NOT EXISTS ai_settings (
      id TEXT PRIMARY KEY NOT NULL,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      encrypted_api_key TEXT,
      base_url TEXT NOT NULL,
      temperature INTEGER NOT NULL DEFAULT 20,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS operation_history (
      id TEXT PRIMARY KEY NOT NULL,
      project_id TEXT NOT NULL,
      project_name TEXT NOT NULL,
      action TEXT NOT NULL,
      command TEXT NOT NULL,
      success INTEGER NOT NULL,
      exit_code INTEGER NOT NULL,
      output TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS operation_history_created_at_idx
      ON operation_history(created_at DESC);
  `)

  database = drizzle(sqlite, { schema })
  return database
}
