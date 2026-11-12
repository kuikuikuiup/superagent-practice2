import { describe, expect, it } from 'vitest';
import { summarizeTasks } from '../../src/utils/stats';
import type { Task } from '../../src/api/types';

function buildTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1',
    title: '任务',
    description: '',
    status: 'todo',
    priority: 'medium',
    dueDate: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    tokens: 0,
    cost: 0,
    ...overrides,
  };
}

const TODAY = '2026-11-11';

describe('summarizeTasks（筛选后统计，与 /api/stats 口径一致）', () => {
  it('counts statuses / doneRate / tokens / cost for the visible tasks', () => {
    const stats = summarizeTasks(
      [
        buildTask({ id: 'a', status: 'todo' }),
        buildTask({ id: 'b', status: 'in_progress' }),
        buildTask({ id: 'c', status: 'done' }),
        buildTask({ id: 'd', status: 'done' }),
      ],
      TODAY,
    );
    expect(stats).toMatchObject({
      total: 4,
      todo: 1,
      inProgress: 1,
      done: 2,
      doneRate: 50,
      overdue: 0,
      tokens: 0,
      cost: 0,
    });
  });

  it('counts overdue as dueDate < today and not done', () => {
    const stats = summarizeTasks(
      [
        buildTask({ id: 'a', dueDate: '2026-11-10' }),
        buildTask({ id: 'b', status: 'done', dueDate: '2026-11-01' }),
        buildTask({ id: 'c', dueDate: '2026-11-11' }),
        buildTask({ id: 'd', dueDate: null }),
      ],
      TODAY,
    );
    expect(stats.overdue).toBe(1);
  });

  it('sums tokens and costs with two-decimal cost precision', () => {
    const stats = summarizeTasks(
      [
        buildTask({ id: 'a', tokens: 8640, cost: 1.24 }),
        buildTask({ id: 'b', tokens: 3200, cost: 0.32 }),
        buildTask({ id: 'c', tokens: 0, cost: 0 }),
      ],
      TODAY,
    );
    expect(stats.tokens).toBe(11840);
    expect(stats.cost).toBe(1.56);
  });

  it('returns zeroed stats for an empty visible list (筛选后无匹配)', () => {
    expect(summarizeTasks([], TODAY)).toEqual({
      total: 0,
      todo: 0,
      inProgress: 0,
      done: 0,
      doneRate: 0,
      overdue: 0,
      tokens: 0,
      cost: 0,
    });
  });
});
