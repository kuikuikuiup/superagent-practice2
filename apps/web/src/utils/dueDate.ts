import type { TaskStatus } from '../api/types';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;
/** 距截止日期 1-2 天视为“临近截止”；0 天单独归为“今天到期”。 */
const SOON_DAYS_THRESHOLD = 2;

export function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/** 本地时区今天的 'YYYY-MM-DD'。 */
export function todayISO(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

interface DateParts {
  year: number;
  month: number;
  day: number;
}

function parseDateParts(value: string): DateParts | null {
  if (!DATE_PATTERN.test(value)) return null;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return { year, month, day };
}

/** 是否为合法的 'YYYY-MM-DD' 日期字符串。 */
export function isValidDueDate(value: string): boolean {
  return parseDateParts(value) !== null;
}

function toUtc(parts: DateParts): number {
  return Date.UTC(parts.year, parts.month - 1, parts.day);
}

/** dueDate - today 的天数；dueDate 为过去为负；非法输入返回 null。 */
export function daysUntil(dueDate: string, today: string = todayISO()): number | null {
  const a = parseDateParts(dueDate);
  const b = parseDateParts(today);
  if (a === null || b === null) return null;
  return Math.round((toUtc(a) - toUtc(b)) / DAY_MS);
}

/** 'YYYY-MM-DD' → 'MM-DD'（用于卡片展示）。 */
export function formatDueDate(dueDate: string): string {
  const parts = parseDateParts(dueDate);
  if (parts === null) return dueDate;
  return `${pad2(parts.month)}-${pad2(parts.day)}`;
}

export type DueKind = 'none' | 'normal' | 'today' | 'soon' | 'overdue';

export interface DueInfo {
  kind: DueKind;
  /** 是否应显示红色“已逾期”标签（dueDate < 今天 且状态非 done）。 */
  isOverdue: boolean;
}

/**
 * 依据状态与今天分类截止日期：
 * - 无日期 → none；已完成 → normal；
 * - 已过期（非 done）→ overdue；
 * - 今天 → today（“今天到期”，不等同于“临近截止”）；
 * - 明天/后天（1-2 天）→ soon；其余 → normal。
 */
export function classifyDue(dueDate: string | null, status: TaskStatus, today: string = todayISO()): DueInfo {
  if (dueDate === null || parseDateParts(dueDate) === null) return { kind: 'none', isOverdue: false };
  if (status === 'done') return { kind: 'normal', isOverdue: false };
  const days = daysUntil(dueDate, today);
  if (days === null) return { kind: 'none', isOverdue: false };
  if (days < 0) return { kind: 'overdue', isOverdue: true };
  if (days === 0) return { kind: 'today', isOverdue: false };
  if (days <= SOON_DAYS_THRESHOLD) return { kind: 'soon', isOverdue: false };
  return { kind: 'normal', isOverdue: false };
}

/** 截止状态的短文案（卡片与详情共用，保证文案/样式一致）：普通/已完成/无日期返回空串。 */
export function dueKindNote(kind: DueKind): string {
  switch (kind) {
    case 'overdue':
      return '已逾期';
    case 'today':
      return '今天到期';
    case 'soon':
      return '临近截止';
    default:
      return '';
  }
}

/** 任务是否逾期：dueDate < 今天 且 status != 'done'。 */
export function isOverdueTask(
  task: { dueDate: string | null; status: TaskStatus },
  today: string = todayISO(),
): boolean {
  return classifyDue(task.dueDate, task.status, today).isOverdue;
}
