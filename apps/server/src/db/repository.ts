import { randomUUID } from 'node:crypto'
import type { DatabaseSync } from 'node:sqlite'
import type {
  Task,
  TaskPriority,
  TaskRow,
  TaskStats,
  TaskStatus,
  StatsTrend,
  TrendPoint,
} from '../types.js'
import { notFoundError } from '../errors.js'

export interface ListFilters {
  keyword?: string
  status?: TaskStatus
  priority?: TaskPriority
  sort: 'createdAt' | 'updatedAt' | 'dueDate'
  order: 'asc' | 'desc'
}

export interface CreateInput {
  title: string
  description?: string | null
  status?: TaskStatus
  priority?: TaskPriority
  dueDate?: string | null
  tokens?: number
  cost?: number
}

export type UpdateInput = Partial<CreateInput>

const COLUMN_BY_SORT: Record<ListFilters['sort'], string> = {
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  dueDate: 'due_date',
}

export class TaskRepository {
  constructor(private readonly db: DatabaseSync) {}

  list(filters: ListFilters): Task[] {
    const conditions: string[] = []
    const params: Record<string, string> = {}

    if (filters.keyword !== undefined) {
      conditions.push('(title LIKE @keyword OR description LIKE @keyword)')
      params.keyword = `%${escapeLike(filters.keyword)}%`
    }
    if (filters.status !== undefined) {
      conditions.push('status = @status')
      params.status = filters.status
    }
    if (filters.priority !== undefined) {
      conditions.push('priority = @priority')
      params.priority = filters.priority
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const direction = filters.order === 'asc' ? 'ASC' : 'DESC'
    const column = COLUMN_BY_SORT[filters.sort]

    const orderTerms: string[] = []
    if (filters.sort === 'dueDate') {
      // 无截止日期的任务始终排在最后
      orderTerms.push('(due_date IS NULL)')
    }
    orderTerms.push(`${column} ${direction}`, `id ${direction}`)

    const sql = `
      SELECT id, title, description, status, priority, due_date, tokens, cost, created_at, updated_at
      FROM tasks
      ${where}
      ORDER BY ${orderTerms.join(', ')}
      LIMIT 500
    `
    const rows = this.db.prepare(sql).all(params) as unknown as TaskRow[]
    return rows.map((row) => toTask(row))
  }

  getById(id: string): Task {
    const row = this.db
      .prepare('SELECT id, title, description, status, priority, due_date, tokens, cost, created_at, updated_at FROM tasks WHERE id = ?')
      .get(id) as unknown as TaskRow | undefined

    if (row === undefined) {
      throw notFoundError(`未找到 ID 为 ${id} 的任务`)
    }
    return toTask(row)
  }

  create(input: CreateInput): Task {
    const now = nowIso()
    const task: TaskRow = {
      id: randomUUID(),
      title: input.title,
      description: input.description ?? '',
      status: input.status ?? 'todo',
      priority: input.priority ?? 'medium',
      due_date: input.dueDate ?? null,
      tokens: input.tokens ?? 0,
      cost: roundCost(input.cost ?? 0),
      created_at: now,
      updated_at: now,
    }
    this.db
      .prepare(`INSERT INTO tasks (id, title, description, status, priority, due_date, tokens, cost, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(
        task.id,
        task.title,
        task.description,
        task.status,
        task.priority,
        task.due_date,
        task.tokens,
        task.cost,
        task.created_at,
        task.updated_at
      )
    return toTask(task)
  }

  update(id: string, input: UpdateInput): Task {
    const current = this.getById(id)
    const next = {
      title: input.title ?? current.title,
      description: input.description ?? current.description,
      status: input.status ?? current.status,
      priority: input.priority ?? current.priority,
      dueDate: input.dueDate === undefined ? current.dueDate : input.dueDate,
      tokens: input.tokens ?? current.tokens,
      cost: input.cost === undefined ? current.cost : roundCost(input.cost),
    }
    const updatedAt = nowIso()
    this.db
      .prepare(`UPDATE tasks
        SET title = ?, description = ?, status = ?, priority = ?, due_date = ?, tokens = ?, cost = ?, updated_at = ?
        WHERE id = ?`)
      .run(next.title, next.description, next.status, next.priority, next.dueDate, next.tokens, next.cost, updatedAt, id)

    return this.getById(id)
  }

  remove(id: string): void {
    const result = this.db.prepare('DELETE FROM tasks WHERE id = ?').run(id)
    if (result.changes === 0) {
      throw notFoundError(`未找到 ID 为 ${id} 的任务`)
    }
  }

  stats(): TaskStats {
    const today = todayLocal()
    const row = this.db
      .prepare(`
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN status = 'todo' THEN 1 ELSE 0 END) AS todo,
          SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS inProgress,
          SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS done,
          SUM(CASE WHEN due_date IS NOT NULL AND due_date < @today AND status != 'done' THEN 1 ELSE 0 END) AS overdue,
          SUM(tokens) AS tokens,
          SUM(cost) AS cost
        FROM tasks
      `)
      .get({ today }) as unknown as {
      total: number
      todo: number | null
      inProgress: number | null
      done: number | null
      overdue: number | null
      tokens: number | null
      cost: number | null
    }

    const total = Number(row.total ?? 0)
    const done = Number(row.done ?? 0)
    const doneRate = total === 0 ? 0 : Math.round((done / total) * 10000) / 100
    return {
      total,
      todo: Number(row.todo ?? 0),
      inProgress: Number(row.inProgress ?? 0),
      done,
      doneRate,
      overdue: Number(row.overdue ?? 0),
      tokens: Number(row.tokens ?? 0),
      cost: roundCost(Number(row.cost ?? 0)),
    }
  }
  /** 仅取原始值（不设 LIMIT），趋势分桶在 JS 内完成，避免 SQL 时区差异。 */
  listTasksForTrend(): Array<{ created_at: string; tokens: number; cost: number }> {
    const rows = this.db
      .prepare('SELECT created_at, tokens, cost FROM tasks')
      .all() as unknown as Array<{ created_at: string; tokens: number; cost: number }>
    return rows
  }

  /**
   * 最近 days 天（含今天）的新增任务趋势与消费分布，按 GET /api/stats 同款
   * 的服务器本地日期分桶；无任务的日期补 0，保证前端图表按日连续。
   */
  createdAtTrend(days: number): StatsTrend {
    const points: TrendPoint[] = []
    for (let offset = days - 1; offset >= 0; offset -= 1) {
      const d = new Date()
      d.setDate(d.getDate() - offset)
      points.push({ date: toLocalDate(d), created: 0, tokens: 0, cost: 0 })
    }
    const byDate = new Map(points.map((point) => [point.date, point]))
    for (const task of this.listTasksForTrend()) {
      const parsed = new Date(task.created_at)
      if (Number.isNaN(parsed.getTime())) continue
      const point = byDate.get(toLocalDate(parsed))
      if (point === undefined) continue
      point.created += 1
      point.tokens += Number(task.tokens ?? 0)
      point.cost += Number(task.cost ?? 0)
    }
    for (const point of points) point.cost = roundCost(point.cost)
    return { days, points }
  }
}

export function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status as TaskStatus,
    priority: row.priority as TaskPriority,
    dueDate: row.due_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tokens: Number(row.tokens ?? 0),
    cost: roundCost(Number(row.cost ?? 0)),
  }
}

/** 消费金额统一保留两位小数，避免浮点尾差进入 API 输出。 */
export function roundCost(value: number): number {
  return Math.round(value * 100) / 100
}

function nowIso(): string {
  return new Date().toISOString()
}

export function todayLocal(): string {
  return toLocalDate(new Date())
}

export function toLocalDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function escapeLike(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_')
}
