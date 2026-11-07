import type { TaskFilter } from '../api/types';

/** 将过滤条件映射为 GET /api/tasks 的查询串；未提供的可选条件不会出现在查询串里。 */
export function buildTaskQuery(filter: TaskFilter): string {
  const params = new URLSearchParams();
  const keyword = filter.keyword.trim();
  if (keyword !== '') params.set('keyword', keyword);
  if (filter.status !== '') params.set('status', filter.status);
  if (filter.priority !== '') params.set('priority', filter.priority);
  params.set('sort', filter.sort);
  params.set('order', filter.order);
  const query = params.toString();
  return query === '' ? '' : `?${query}`;
}

/** 是否有生效的关键词/状态/优先级筛选（用于区分“没有任务”与“筛选后为空”）。 */
export function hasActiveFilters(filter: TaskFilter): boolean {
  return (
    filter.keyword.trim() !== '' || filter.status !== '' || filter.priority !== ''
  );
}
