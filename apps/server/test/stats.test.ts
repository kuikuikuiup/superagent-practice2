import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { closeApp, createTestApp, postTask, type TestContext } from './helpers.js'
import type { TaskStats } from '../src/types.js'

const todayLocal = (): string => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

describe('GET /api/stats', () => {
  let ctx: TestContext
  beforeAll(async () => {
    ctx = await createTestApp()
    const today = todayLocal()
    const future = '2099-12-31'
    const past = '2000-01-01'
    const cases: Record<string, Parameters<typeof postTask>[1]> = {
      '今日截止的进行中任务': { title: 'a', status: 'in_progress', priority: 'high', dueDate: today },
      '已逾期：待办过截止': { title: 'b', status: 'todo', priority: 'low', dueDate: past },
      '已逾期：进行中更早截止': { title: 'c', status: 'in_progress', priority: 'medium', dueDate: past },
      '已完成的过期任务不算逾期': { title: 'd', status: 'done', priority: 'low', dueDate: past },
      '未设置截止日期的已完成': { title: 'e', status: 'done', priority: 'medium' },
      '明天截止的待办': { title: 'f', status: 'todo', priority: 'low', dueDate: future },
    }
    for (const title of Object.keys(cases)) {
      await postTask(ctx, { ...cases[title], title })
    }
  })
  afterAll(async () => { await closeApp(ctx) })

  it('统计值与真实数据一致', async () => {
    const response = await ctx.app.inject({ method: 'GET', url: '/api/stats' })
    expect(response.statusCode).toBe(200)
    const stats = response.json().data as TaskStats
    expect(stats).toEqual({
      total: 6,
      todo: 2,
      inProgress: 2,
      done: 2,
      // await: done=2 / total=6 => 33.33
      doneRate: 33.33,
      overdue: 2,
    })
  })

  it('空数据库时统计均为 0 且完成率为 0', async () => {
    const other = await createTestApp()
    const response = await other.app.inject({ method: 'GET', url: '/api/stats' })
    expect(response.json().data).toEqual({ total: 0, todo: 0, inProgress: 0, done: 0, doneRate: 0, overdue: 0 })
    await closeApp(other)
  })
})

describe('GET /api/stats/trend', () => {
  it('按本地日期分桶返回最近 N 天的新增任务趋势并补 0', async () => {
    const ctx = await createTestApp()
    for (const title of ['t1', 't2']) {
      await postTask(ctx, { title })
    }
    const response = await ctx.app.inject({ method: 'GET', url: '/api/stats/trend?days=3' })
    expect(response.statusCode).toBe(200)
    const data = response.json().data as { days: number; points: { date: string; created: number }[] }
    expect(data.days).toBe(3)
    expect(data.points).toHaveLength(3)
    // 全部任务都在刚才创建：三桶之和等于任务数，今天为 2
    expect(data.points.reduce((sum, p) => sum + p.created, 0)).toBe(2)
    expect(data.points.at(-1)?.created).toBe(2)
    // 日期按本地日期升序且最后一天是今天
    expect(data.points[0].date < data.points[2].date).toBe(true)
    expect(data.points.at(-1)?.date).toBe(todayLocal())
    await closeApp(ctx)
  })

  it('默认返回 14 天，days 非法时返回 VALIDATION_ERROR', async () => {
    const ctx = await createTestApp()
    const dflt = await ctx.app.inject({ method: 'GET', url: '/api/stats/trend' })
    expect(dflt.statusCode).toBe(200)
    expect(dflt.json().data.days).toBe(14)
    expect(dflt.json().data.points).toHaveLength(14)

    const bad = await ctx.app.inject({ method: 'GET', url: '/api/stats/trend?days=100' })
    expect(bad.statusCode).toBe(400)
    expect(bad.json().error.code).toBe('VALIDATION_ERROR')
    const frac = await ctx.app.inject({ method: 'GET', url: '/api/stats/trend?days=2.5' })
    expect(frac.statusCode).toBe(400)
    await closeApp(ctx)
  })
})

describe('健康检查与静态资源契约', () => {
  let ctx: TestContext
  beforeAll(async () => { ctx = await createTestApp() })
  afterAll(async () => { await closeApp(ctx) })

  it('GET /api/health 返回 ok', async () => {
    const response = await ctx.app.inject({ method: 'GET', url: '/api/health' })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ data: { status: 'ok' } })
  })
})
