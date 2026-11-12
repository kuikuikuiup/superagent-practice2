import type { Task, TaskStats } from '../api/types';
import { isOverdueTask } from './dueDate';

/**
 * 由当前可见任务列表汇总统计（筛选生效时用于「当前筛选结果」）。
 * 与后端 /api/stats 口径保持一致：doneRate 为 0..100 的百分比，金额保留两位小数。
 */
export function summarizeTasks(tasks: readonly Task[], today?: string): TaskStats {
  const stats: TaskStats = {
    total: 0,
    todo: 0,
    inProgress: 0,
    done: 0,
    doneRate: 0,
    overdue: 0,
    tokens: 0,
    cost: 0,
  };

  for (const task of tasks) {
    stats.total += 1;
    if (task.status === 'todo') stats.todo += 1;
    else if (task.status === 'in_progress') stats.inProgress += 1;
    else stats.done += 1;
    if (isOverdueTask(task, today)) stats.overdue += 1;
    stats.tokens += task.tokens ?? 0;
    stats.cost += task.cost ?? 0;
  }

  stats.doneRate = stats.total === 0 ? 0 : Math.round((stats.done / stats.total) * 1000) / 10;
  stats.cost = Math.round(stats.cost * 100) / 100;
  return stats;
}
