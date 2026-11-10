import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

export const DATABASE_SCHEMA = `
CREATE TABLE IF NOT EXISTS tasks (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL CHECK (status IN ('todo','in_progress','done')),
  priority    TEXT NOT NULL CHECK (priority IN ('high','medium','low')),
  due_date    TEXT,
  tokens      INTEGER NOT NULL DEFAULT 0,
  cost        REAL NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
`

/**
 * 就地升级旧版本数据库：为已有库补齐 agent 任务板的消费字段（幂等）。
 * 由 openDatabase 与外部构造连接（如测试 helper）共同使用。
 */
export function ensureColumns(database: DatabaseSync): void {
  const columns = new Set<string>()
  const rows = database.prepare('PRAGMA table_info(tasks)').all() as unknown as { name: string }[]
  for (const row of rows) columns.add(row.name)
  if (!columns.has('tokens')) {
    database.exec('ALTER TABLE tasks ADD COLUMN tokens INTEGER NOT NULL DEFAULT 0')
  }
  if (!columns.has('cost')) {
    database.exec('ALTER TABLE tasks ADD COLUMN cost REAL NOT NULL DEFAULT 0')
  }
}

/**
 * 打开（或创建）SQLite 数据库并初始化表结构。
 * @param path 数据库文件路径；传入 ':memory:' 用于测试。
 */
export function openDatabase(path: string): DatabaseSync {
  if (path !== ':memory:') {
    const file = resolve(path)
    mkdirSync(dirname(file), { recursive: true })
    path = file
  }

  const database = new DatabaseSync(path)
  database.exec(DATABASE_SCHEMA)
  ensureColumns(database)
  return database
}
