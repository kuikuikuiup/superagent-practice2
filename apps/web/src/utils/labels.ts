import type { SortField, TaskPriority, TaskStatus } from '../api/types';
import { SORT_FIELDS, TASK_PRIORITIES, TASK_STATUSES } from '../api/types';

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: '待办',
  in_progress: '进行中',
  done: '已完成',
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

export const SORT_FIELD_LABELS: Record<SortField, string> = {
  createdAt: '按创建时间',
  updatedAt: '按更新时间',
  dueDate: '按截止日期',
};

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

export const STATUS_OPTIONS: readonly SelectOption<TaskStatus>[] = TASK_STATUSES.map((status) => ({
  value: status,
  label: STATUS_LABELS[status],
}));

export const PRIORITY_OPTIONS: readonly SelectOption<TaskPriority>[] = TASK_PRIORITIES.map((priority) => ({
  value: priority,
  label: PRIORITY_LABELS[priority],
}));

export const SORT_FIELD_OPTIONS: readonly SelectOption<SortField>[] = SORT_FIELDS.map((field) => ({
  value: field,
  label: SORT_FIELD_LABELS[field],
}));
