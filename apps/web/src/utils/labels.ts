import type { SortField, SortOrder, TaskPriority, TaskStatus } from '../api/types';
import { SORT_FIELDS, TASK_PRIORITIES, TASK_STATUSES } from '../api/types';

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: '待认领',
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

/** 词元（Token）统一使用中文口径，避免「Token / tok」与中文混排。 */
export const TOKENS_LABEL = '词元用量';
export const TOKENS_UNIT = '词元';

/** 排序方向文案随排序字段变化：按截止日期时升序即「紧急优先」。 */
export function sortOrderLabel(sort: SortField, order: SortOrder): string {
  if (sort === 'dueDate') return order === 'asc' ? '紧急优先' : '最晚优先';
  return order === 'asc' ? '正序' : '倒序';
}

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

export const STATUS_OPTIONS: readonly SelectOption<TaskStatus>[] = TASK_STATUSES.map((status) => ({
  value: status,
  label: STATUS_LABELS[status],
}));

/** 状态筛选选项：显式的「全部」可单独恢复，不必清空其它筛选条件。 */
export const STATUS_FILTER_OPTIONS: readonly SelectOption<TaskStatus | 'all'>[] = [
  { value: 'all', label: '全部状态' },
  ...STATUS_OPTIONS,
];

export const PRIORITY_OPTIONS: readonly SelectOption<TaskPriority>[] = TASK_PRIORITIES.map((priority) => ({
  value: priority,
  label: PRIORITY_LABELS[priority],
}));

/** 优先级筛选选项：同样提供独立的「全部」。 */
export const PRIORITY_FILTER_OPTIONS: readonly SelectOption<TaskPriority | 'all'>[] = [
  { value: 'all', label: '全部优先级' },
  ...PRIORITY_OPTIONS,
];

export const SORT_FIELD_OPTIONS: readonly SelectOption<SortField>[] = SORT_FIELDS.map((field) => ({
  value: field,
  label: SORT_FIELD_LABELS[field],
}));

/** 优先级 → arco Tag 预设色（语义：高=红 / 中=橙 / 低=绿）。 */
export const PRIORITY_TAG_COLORS: Record<TaskPriority, 'red' | 'orange' | 'green'> = {
  high: 'red',
  medium: 'orange',
  low: 'green',
};
