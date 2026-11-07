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
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
`

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
  return database
}
