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

/**
 * 词元用量统一格式（统计卡 / 卡片 / 详情共用同一规则）：
 * - 空值（null/undefined/NaN/负数）→ '—'；
 * - 0 → '0'（0 是真实值，不写作「未填写」）；
 * - < 1000 → 整数；
 * - ≥ 1000 → 一位小数的 k（8.6k / 12.5k / 24.3k，整数 k 省略 .0）。
 */
export function formatTokens(tokens: number | null | undefined): string {
  if (tokens === null || tokens === undefined) return '—';
  const value = Number(tokens);
  if (!Number.isFinite(value) || value < 0) return '—';
  if (value === 0) return '0';
  if (value < 1000) return String(Math.round(value));
  const k = Math.round((value / 1000) * 10) / 10;
  return Number.isInteger(k) ? `${k}k` : `${k.toFixed(1)}k`;
}

/** 消费金额（元）→ '¥3.20'（保留两位小数）。 */
export function formatCost(cost: number | null | undefined): string {
  const value = Number(cost ?? 0);
  if (!Number.isFinite(value)) return '¥0.00';
  return `¥${value.toFixed(2)}`;
}
