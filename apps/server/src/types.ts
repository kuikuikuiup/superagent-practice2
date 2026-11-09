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
}

export interface TaskStats {
  total: number
  todo: number
  inProgress: number
  done: number
  doneRate: number
  overdue: number
}

/** 单天的新增任务数（按服务器本地日期分桶）。 */
export interface TrendPoint {
  date: string
  created: number
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
}
