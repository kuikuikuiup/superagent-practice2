import type { FieldError, Task, TaskInput, TaskPriority, TaskStatus } from '../api/types';
import { TASK_PRIORITIES, TASK_STATUSES } from '../api/types';
import { isValidDueDate } from './dueDate';

export const TITLE_MAX_LENGTH = 100;
export const DESCRIPTION_MAX_LENGTH = 2000;
/** Agent 消费数据上限，与后端 schema 保持一致 */
export const TOKENS_MAX = 100_000_000;
export const COST_MAX = 1_000_000;

export interface TaskFormValues {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  /** 空字符串表示未设置截止日期 */
  dueDate: string;
  /** Agent 执行 Token 用量（undefined 表示未填写） */
  tokens?: number;
  /** 消费金额（元，最多两位小数；undefined 表示未填写） */
  cost?: number;
}

export type TaskFormErrors = Record<string, string>;

/** 表单纯校验：返回 { 字段名: 错误文案 }，无错误则返回空对象。 */
export function validateTaskForm(values: TaskFormValues): TaskFormErrors {
  const errors: TaskFormErrors = {};

  const title = values.title.trim();
  if (title === '') errors['title'] = '请输入标题';
  else if (title.length > TITLE_MAX_LENGTH) errors['title'] = `标题不能超过 ${TITLE_MAX_LENGTH} 个字符`;

  if (values.description.trim().length > DESCRIPTION_MAX_LENGTH) {
    errors['description'] = `描述不能超过 ${DESCRIPTION_MAX_LENGTH} 个字符`;
  }

  if (values.dueDate !== '' && !isValidDueDate(values.dueDate)) {
    errors['dueDate'] = '请输入有效的日期（YYYY-MM-DD）';
  }

  if (!TASK_STATUSES.includes(values.status)) errors['status'] = '请选择有效的状态';
  if (!TASK_PRIORITIES.includes(values.priority)) errors['priority'] = '请选择有效的优先级';

  if (values.tokens !== undefined && (!Number.isInteger(values.tokens) || values.tokens < 0 || values.tokens > TOKENS_MAX)) {
    errors['tokens'] = 'Token 用量必须是不超过 100000000 的非负整数';
  }
  if (values.cost !== undefined && (!Number.isFinite(values.cost) || values.cost < 0 || values.cost > COST_MAX)) {
    errors['cost'] = '消费金额必须是 0..1000000 的数字';
  } else if (values.cost !== undefined && Math.round(values.cost * 100) !== values.cost * 100) {
    errors['cost'] = '消费金额最多保留两位小数';
  }

  return errors;
}

/** 由已有任务（或空）构造表单初始值。 */
export function createFormValues(task?: Task | null): TaskFormValues {
  return {
    title: task?.title ?? '',
    description: task?.description ?? '',
    status: task?.status ?? 'todo',
    priority: task?.priority ?? 'medium',
    dueDate: task?.dueDate ?? '',
    tokens: task?.tokens === 0 ? undefined : task?.tokens,
    cost: task?.cost === 0 ? undefined : task?.cost,
  };
}

/** 将表单值规整为 POST/PATCH 请求体：去空白、空日期 → null、未填消费 → 0。 */
export function normalizeForm(values: TaskFormValues): TaskInput {
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    status: values.status,
    priority: values.priority,
    dueDate: values.dueDate === '' ? null : values.dueDate,
    tokens: values.tokens ?? 0,
    cost: values.cost ?? 0,
  };
}

/** 把服务端 VALIDATION_ERROR 的字段级 details 合并进表单错误。 */
export function mergeServerDetails(
  details: FieldError[] | null | undefined,
  errors: TaskFormErrors,
): TaskFormErrors {
  if (!details || details.length === 0) return errors;
  const merged: TaskFormErrors = { ...errors };
  for (const detail of details) {
    merged[detail.path] = detail.message;
  }
  return merged;
}
