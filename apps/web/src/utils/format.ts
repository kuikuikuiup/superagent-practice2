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
