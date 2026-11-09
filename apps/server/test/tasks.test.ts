import { beforeAll, describe, expect, it } from 'vitest'
import { createTestApp, postTask, taskOf, type TestContext } from './helpers.js'
import type { Task } from '../src/types.js'

describe('POST /api/tasks', () => {
  let ctx: TestContext
  beforeAll(async () => { ctx = await createTestApp() })
  it('创建任务时返回 201 与完整字段', async () => {
    const { status, json } = await postTask(ctx, {
      title: '  编写设计文档  ',
      description: '包含数据模型与 API 契约',
      status: 'in_progress',
      priority: 'high',
      dueDate: '2026-11-30',
    })
    expect(status).toBe(201)
    const task = taskOf(json)
    expect(task.id).toBeTruthy()
    expect(task.title).toBe('编写设计文档')
    expect(task.description).toBe('包含数据模型与 API 契约')
    expect(task.status).toBe('in_progress')
    expect(task.priority).toBe('high')
    expect(task.dueDate).toBe('2026-11-30')
    expect(task.createdAt).toBeTruthy()
    expect(task.updatedAt).toBe(task.createdAt)
  })

  it('省略可选字段时使用默认值', async () => {
    const { status, json } = await postTask(ctx, { title: '默认值任务' })
    expect(status).toBe(201)
    const task = taskOf(json)
    expect(task.status).toBe('todo')
    expect(task.priority).toBe('medium')
    expect(task.description).toBe('')
    expect(task.dueDate).toBeNull()
    expect(task.tokens).toBe(0)
    expect(task.cost).toBe(0)
  })

  it('接受 Agent 消费字段 tokens/cost 并校验非法值', async () => {
    const ctx = await createTestApp()
    const ok = await postTask(ctx, { title: 'agent 消费任务', tokens: 12480, cost: 1.24 })
    expect(ok.status).toBe(201)
    const saved = taskOf(ok.json)
    expect(saved.tokens).toBe(12480)
    expect(saved.cost).toBe(1.24)

    const negTokens = await postTask(ctx, { title: '负数 tokens', tokens: -1 })
    expect(negTokens.status).toBe(400)
    console.log("NEGTOKENS", negTokens.status, JSON.stringify(negTokens.json))
    expect(negTokens.json.error!.code).toBe('VALIDATION_ERROR')

    const precision = await postTask(ctx, { title: ' cost 精度', cost: 1.234 })
    expect(precision.status).toBe(400)

    const patched = await ctx.app.inject({
      method: 'PATCH',
      url: `/api/tasks/${saved.id}`,
      payload: { tokens: 500, cost: 10 },
    })
    expect(patched.statusCode).toBe(200)
    const patchedTask = JSON.parse(String(patched.body)) as unknown as { data: { tokens: number; cost: number; description: string } }
    expect(patchedTask.data.tokens).toBe(500)
    expect(patchedTask.data.cost).toBe(10)
  })

  it('title 为空返回 400 且字段级 details', async () => {
    const { status, json } = await postTask(ctx, { title: '   ' })
    expect(status).toBe(400)
    const body = json as { error: { code: string; details: unknown[] } }
    expect(body.error.code).toBe('VALIDATION_ERROR')
    expect(body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: 'title' })])
    )
  })

  it.each([
    [{}, '缺少 title'],
    [{ title: 42 }, 'title 非字符串'],
    [{ title: 'x'.repeat(101) }, 'title 超长'],
    [{ title: 'ok', description: 'd'.repeat(2001) }, 'description 超长'],
    [{ title: 'ok', status: 'paused' }, 'status 非法'],
    [{ title: 'ok', priority: 'urgent' }, 'priority 非法'],
    [{ title: 'ok', dueDate: '2026-13-01' }, 'dueDate 月份非法'],
    [{ title: 'ok', dueDate: '2026-02-30' }, 'dueDate 日期不存在'],
    [{ title: 'ok', dueDate: '30-11-2026' }, 'dueDate 格式非法'],
  ])('非法输入 %j (%s) 返回 400 VALIDATION_ERROR', async (body) => {
    const { status, json } = await postTask(ctx, body)
    expect(status).toBe(400)
    expect((json as { error: { code: string } }).error.code).toBe('VALIDATION_ERROR')
  })

  it('缺少请求体返回 400（等同空对象校验失败）', async () => {
    const response = await ctx.app.inject({ method: 'POST', url: '/api/tasks' })
    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } })
  })

  it('JSON 格式错误返回 400 INVALID_JSON', async () => {
    const response = await ctx.app.inject({
      method: 'POST',
      url: '/api/tasks',
      payload: '{"title": "oops"',
      headers: { 'content-type': 'application/json' },
    })
    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({ error: { code: 'INVALID_JSON' } })
  })
})

describe('GET /api/tasks 与筛选排序', () => {
  let ctx: TestContext
  const seedTasks: Array<Parameters<typeof postTask>[1]> = [
    { title: '前端组件库调研', description: '评估 Vue 组件与拖拽方案', status: 'todo', priority: 'low', dueDate: '2026-12-05' },
    { title: '后端接口联调', description: '需要对齐 API 契约', status: 'in_progress', priority: 'high', dueDate: '2026-11-20' },
    { title: '部署脚本标记', description: '注意部署脚本回滚', status: 'done', priority: 'medium', dueDate: null },
  ]

  beforeAll(async () => {
    ctx = await createTestApp()
    for (const t of seedTasks) {
      await postTask(ctx, t)
      // 保证 createdAt 严格递增
      await new Promise((r) => setTimeout(r, 5))
    }
  })

  it('返回全部任务并带 total', async () => {
    const response = await ctx.app.inject({ method: 'GET', url: '/api/tasks' })
    expect(response.statusCode).toBe(200)
    const { items, total } = response.json().data as { items: Task[]; total: number }
    expect(total).toBe(seedTasks.length)
    expect(items).toHaveLength(seedTasks.length)
  })

  it('keyword 大小写不敏感匹配标题与描述', async () => {
    const response = await ctx.app.inject({ method: 'GET', url: '/api/tasks?keyword=vue' })
    const { items } = response.json().data
    expect(items).toHaveLength(1)
    expect(items[0].title).toBe('前端组件库调研')
  })

  it('status 与 priority 筛选可组合', async () => {
    const response = await ctx.app.inject({ method: 'GET', url: '/api/tasks?status=in_progress&priority=high' })
    const { items, total } = response.json().data
    expect(total).toBe(1)
    expect(items[0].status).toBe('in_progress')
  })

  it('按 dueDate 升序排序，无 dueDate 的排最后', async () => {
    const response = await ctx.app.inject({ method: 'GET', url: '/api/tasks?sort=dueDate&order=asc' })
    const { items } = response.json().data
    expect(items.map((t: Task) => t.title)).toEqual([
      '后端接口联调',
      '前端组件库调研',
      '部署脚本标记',
    ])
  })

  it('默认按 createdAt 降序', async () => {
    const response = await ctx.app.inject({ method: 'GET', url: '/api/tasks' })
    const { items } = response.json().data as { items: Task[] }
    expect(items.map((t) => t.title)).toEqual(['部署脚本标记', '后端接口联调', '前端组件库调研'])
  })

  it('非法查询参数返回 400', async () => {
    const response = await ctx.app.inject({ method: 'GET', url: '/api/tasks?sort=bogus' })
    expect(response.statusCode).toBe(400)
    expect(response.json().error.code).toBe('VALIDATION_ERROR')
  })

  it('详情查看单个任务', async () => {
    const created = taskOf((await postTask(ctx, { title: 'loner' })).json)
    const response = await ctx.app.inject({ method: 'GET', url: `/api/tasks/${created.id}` })
    expect(response.statusCode).toBe(200)
    expect(response.json().data.title).toBe('loner')
  })
})

describe('GET /api/tasks/:id 异常路径', () => {
  let ctx: TestContext
  beforeAll(async () => { ctx = await createTestApp() })

  it('不存在的任务返回 404 TASK_NOT_FOUND', async () => {
    const response = await ctx.app.inject({ method: 'GET', url: '/api/tasks/missing-id' })
    expect(response.statusCode).toBe(404)
    expect(response.json()).toMatchObject({ error: { code: 'TASK_NOT_FOUND' } })
  })
})

describe('PATCH /api/tasks/:id', () => {
  let ctx: TestContext
  beforeAll(async () => { ctx = await createTestApp() })

  it('部分字段可更新且 updated_at 变化', async () => {
    const created = taskOf((await postTask(ctx, { title: '旧标题', dueDate: '2026-11-01' })).json)
    const response = await ctx.app.inject({
      method: 'PATCH',
      url: `/api/tasks/${created.id}`,
      payload: { title: '新标题', status: 'done' },
    })
    expect(response.statusCode).toBe(200)
    const updated = response.json().data as Task
    expect(updated.title).toBe('新标题')
    expect(updated.status).toBe('done')
    expect(updated.priority).toBe('medium')
    expect(updated.dueDate).toBe('2026-11-01')
    expect(updated.updatedAt >= updated.createdAt).toBe(true)
  })

  it('拖拽场景：仅改状态', async () => {
    const created = taskOf((await postTask(ctx, { title: '被拖拽的任务' })).json)
    for (const target of ['in_progress', 'done', 'todo'] as const) {
      const response = await ctx.app.inject({
        method: 'PATCH',
        url: `/api/tasks/${created.id}`,
        payload: { status: target },
      })
      expect(response.statusCode).toBe(200)
      expect(response.json().data.status).toBe(target)
    }
  })

  it('空更新体返回 400', async () => {
    const created = taskOf((await postTask(ctx, { title: 'kept' })).json)
    const response = await ctx.app.inject({ method: 'PATCH', url: `/api/tasks/${created.id}`, payload: {} })
    expect(response.statusCode).toBe(400)
    expect(response.json().error.code).toBe('VALIDATION_ERROR')
  })

  it('非法字段返回 400 且不修改数据', async () => {
    const created = taskOf((await postTask(ctx, { title: 'keep-me' })).json)
    const response = await ctx.app.inject({
      method: 'PATCH',
      url: `/api/tasks/${created.id}`,
      payload: { priority: 'severe' },
    })
    expect(response.statusCode).toBe(400)
    const after = await ctx.app.inject({ method: 'GET', url: `/api/tasks/${created.id}` })
    expect(after.json().data.priority).toBe('medium')
  })

  it('不存在的任务返回 404', async () => {
    const response = await ctx.app.inject({ method: 'PATCH', url: '/api/tasks/ghost', payload: { title: 'x' } })
    expect(response.statusCode).toBe(404)
    expect(response.json().error.code).toBe('TASK_NOT_FOUND')
  })
})

describe('DELETE /api/tasks/:id', () => {
  let ctx: TestContext
  beforeAll(async () => { ctx = await createTestApp() })

  it('删除成功返回 204 且列表中消失', async () => {
    const created = taskOf((await postTask(ctx, { title: '待删除' })).json)
    const del = await ctx.app.inject({ method: 'DELETE', url: `/api/tasks/${created.id}` })
    expect(del.statusCode).toBe(204)
    expect(del.body).toBe('')
    const gone = await ctx.app.inject({ method: 'GET', url: `/api/tasks/${created.id}` })
    expect(gone.statusCode).toBe(404)
  })

  it('重复删除同一任务返回 404', async () => {
    const created = taskOf((await postTask(ctx, { title: '仅一次' })).json)
    await ctx.app.inject({ method: 'DELETE', url: `/api/tasks/${created.id}` })
    const again = await ctx.app.inject({ method: 'DELETE', url: `/api/tasks/${created.id}` })
    expect(again.statusCode).toBe(404)
  })
})

describe('API 契约细节', () => {
  let ctx: TestContext
  beforeAll(async () => { ctx = await createTestApp() })

  it('未知路由返回 404 ROUTE_NOT_FOUND', async () => {
    const response = await ctx.app.inject({ method: 'GET', url: '/api/unknown' })
    expect(response.statusCode).toBe(404)
    expect(response.json().error.code).toBe('ROUTE_NOT_FOUND')
  })

  it('响应统一包含 data 或 error 结构', async () => {
    const ok = await ctx.app.inject({ method: 'GET', url: '/api/tasks' })
    expect(Object.keys(ok.json())).toEqual(['data'])
    const bad = await postTask(ctx, { title: '' })
    expect(Object.keys(bad.json as object)).toEqual(['error'])
  })

  it('CORS 允许跨域请求', async () => {
    const response = await ctx.app.inject({
      method: 'OPTIONS',
      url: '/api/tasks',
      headers: { origin: 'http://localhost:5173', 'access-control-request-method': 'POST' },
    })
    expect(response.statusCode).toBe(204)
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173')
  })
})
