import { DatabaseSync } from 'node:sqlite'
import { buildApp } from '../src/app.js'
import { ensureColumns } from '../src/db/database.js'
import type { FastifyInstance } from 'fastify'
import type { Task } from '../src/types.js'

export interface InjectResult {
  status: number
  json: unknown
}

export interface TestContext {
  app: FastifyInstance
  database: DatabaseSync
  repo: import('../src/db/repository.js').TaskRepository
}

export async function createTestApp(): Promise<TestContext> {
  const database = new DatabaseSync(':memory:')
  database.exec(`CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL, priority TEXT NOT NULL, due_date TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`)
  // 模拟旧版本库接表结构的就地升级（tokens/cost 默认 0）
  ensureColumns(database)
  const app = await buildApp({ database, logger: false })
  const repo = new (await import('../src/db/repository.js')).TaskRepository(database)
  return { app, database, repo }
}

export async function closeApp(ctx: TestContext): Promise<void> {
  await ctx.app.close()
  ctx.database.close()
}

export async function postTask(ctx: TestContext, body: unknown): Promise<InjectResult> {
  const response = await ctx.app.inject({ method: 'POST', url: '/api/tasks', payload: body })
  return { status: response.statusCode, json: response.json() }
}

export function taskOf(json: unknown): Task {
  return (json as { data: Task }).data
}

export function errorOf(json: unknown): { code: string; message: string; details: unknown } {
  return (json as { error: { code: string; message: string; details: unknown } }).error
}
