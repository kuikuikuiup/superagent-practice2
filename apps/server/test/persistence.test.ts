import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../src/app.js'
import { openDatabase } from '../src/db/database.js'
import type { Task } from '../src/types.js'

let dir: string

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'kanban-persist-'))
})

describe('SQLite 持久化（服务重启后数据保留）', () => {
  const dbPath = (): string => join(dir, `data-${Math.random().toString(16).slice(2)}.db`)

  it('写入 -> 关闭连接 -> 重新打开后数据仍在', async () => {
    const path = dbPath()
    const firstDb = openDatabase(path)
    const firstApp = await buildApp({ database: firstDb, logger: false })
    const created = await firstApp.inject({
      method: 'POST',
      url: '/api/tasks',
      payload: { title: '持久化任务', status: 'in_progress', priority: 'high', dueDate: '2026-11-30' },
    })
    expect(created.statusCode).toBe(201)
    const taskId = (created.json() as { data: Task }).data.id
    await firstApp.close()
    firstDb.close()

    const secondDb = openDatabase(path)
    const secondApp = await buildApp({ database: secondDb, logger: false })
    const reread = await secondApp.inject({ method: 'GET', url: `/api/tasks/${taskId}` })
    expect(reread.statusCode).toBe(200)
    expect((reread.json() as { data: Task }).data.title).toBe('持久化任务')
    await secondApp.close()
    secondDb.close()
  })

  it('首次启动自动初始化空表结构', async () => {
    const path = dbPath()
    const db = openDatabase(path)
    const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='tasks'").get() as
      | { name: string }
      | undefined
    expect(row?.name).toBe('tasks')
    db.close()
  })

  it('数据库目录不存在时自动创建', async () => {
    const path = join(dir, 'nested/level/data.db')
    const db = openDatabase(path)
    expect(() => db.prepare('SELECT COUNT(*) AS n FROM tasks').get()).not.toThrow()
    db.close()
  })
})
