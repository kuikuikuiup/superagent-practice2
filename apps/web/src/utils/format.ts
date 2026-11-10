import { pad2 } from './dueDate';

/** ISO 时间戳 → 本地 'YYYY-MM-DD HH:mm'（创建/更新时间展示）。 */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(
    date.getHours(),
  )}:${pad2(date.getMinutes())}`;
}

/** doneRate（0..100 的数值）→ '33.3%' / '100%'。 */
export function formatDoneRate(rate: number): string {
  if (!Number.isFinite(rate)) return '0%';
  const rounded = Math.round(rate * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${text}%`;
}

/** Token 用量 → '2.3k' / '12' / '—'（null/0 返回 '—'）。 */
export function formatTokens(tokens: number | null | undefined): string {
  const value = Number(tokens ?? 0);
  if (!Number.isFinite(value) || value <= 0) return '—';
  if (value >= 10_000) return `${Math.round((value / 1000) * 10) / 10}k`;
  return String(Math.round(value));
}

/** 消费金额（元）→ '¥3.20'（保留两位小数）。 */
export function formatCost(cost: number | null | undefined): string {
  const value = Number(cost ?? 0);
  if (!Number.isFinite(value)) return '¥0.00';
  return `¥${value.toFixed(2)}`;
}
