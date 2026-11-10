export const TASK_STATUSES = ['todo', 'in_progress', 'done'] as const;
export const TASK_PRIORITIES = ['high', 'medium', 'low'] as const;
export const SORT_FIELDS = ['createdAt', 'updatedAt', 'dueDate'] as const;
export const SORT_ORDERS = ['asc', 'desc'] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export type SortField = (typeof SORT_FIELDS)[number];
export type SortOrder = (typeof SORT_ORDERS)[number];

/** 任务对象，与后端 JSON 契约一致。 */
export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  /** 'YYYY-MM-DD' 或 null */
  dueDate: string | null;
  /** ISO8601 UTC 字符串 */
  createdAt: string;
  updatedAt: string;
  /** Agent 执行 Token 用量 */
  tokens: number;
  /** Agent 执行消费金额（元，最多两位小数） */
  cost: number;
}

/** 新建任务的请求体。 */
export interface TaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
  tokens?: number;
  cost?: number;
}

/** 编辑任务的请求体（PATCH，任意字段子集）。 */
export type TaskPatch = Partial<TaskInput>;

export interface TaskPage {
  items: Task[];
  total: number;
}

export interface TaskStats {
  total: number;
  todo: number;
  inProgress: number;
  done: number;
  /** 百分比数值 0..100 */
  doneRate: number;
  overdue: number;
  /** Token 用量总和 */
  tokens: number;
  /** 累计消费金额（元） */
  cost: number;
}

/** 单天的任务量与消费分布（服务器本地日期分桶）。 */
export interface TrendPoint {
  /** 'YYYY-MM-DD' */
  date: string;
  created: number;
  tokens: number;
  cost: number;
}

/** 最近 N 天（含今天）新增任务趋势。 */
export interface StatsTrend {
  days: number;
  points: TrendPoint[];
}

export interface FieldError {
  path: string;
  message: string;
}

/** 后端统一错误码。 */
export type ApiErrorCode = 'VALIDATION_ERROR' | 'TASK_NOT_FOUND' | 'INVALID_JSON' | 'INTERNAL_ERROR';
/** 后端错误码 + 客户端本地错误码（网络故障等）。 */
export type ClientErrorCode = ApiErrorCode | 'NETWORK_ERROR';

/** 看板过滤条件（对应 GET /api/tasks 查询参数）。 */
export interface TaskFilter {
  keyword: string;
  status: TaskStatus | '';
  priority: TaskPriority | '';
  sort: SortField;
  order: SortOrder;
}

export function createDefaultFilter(): TaskFilter {
  return {
    keyword: '',
    status: '',
    priority: '',
    sort: 'createdAt',
    order: 'desc',
  };
}
