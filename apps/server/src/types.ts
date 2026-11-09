export type TaskStatus = 'todo' | 'in_progress' | 'done'
export type TaskPriority = 'high' | 'medium' | 'low'

export interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  dueDate: string | null
  createdAt: string
  updatedAt: string
  /** Agent 执行任务的 Token 用量 */
  tokens: number
  /** Agent 执行任务的消费金额（元，最多两位小数） */
  cost: number
}

export interface TaskStats {
  total: number
  todo: number
  inProgress: number
  done: number
  doneRate: number
  overdue: number
  /** 任务 Token 用量总和 */
  tokens: number
  /** 任务消费金额总和（元，两位小数） */
  cost: number
}

/** 单天的任务量与消费分布（按服务器本地日期分桶）。 */
export interface TrendPoint {
  date: string
  created: number
  tokens: number
  cost: number
}

/** 最近 N 天（含今天）的新增任务趋势。 */
export interface StatsTrend {
  days: number
  points: TrendPoint[]
}

export interface FieldError {
  path: string
  message: string
}

export interface ErrorBody {
  error: {
    code: string
    message: string
    details: FieldError[] | null
  }
}

export interface TaskRow {
  id: string
  title: string
  description: string
  status: string
  priority: string
  due_date: string | null
  created_at: string
  updated_at: string
  tokens: number
  cost: number
}
