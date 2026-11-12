import { describe, expect, it } from 'vitest';
import {
  classifyDue,
  daysUntil,
  dueKindNote,
  formatDueDate,
  isOverdueTask,
  isValidDueDate,
  pad2,
  todayISO,
} from '../../src/utils/dueDate';

describe('pad2', () => {
  it('pads single digits', () => {
    expect(pad2(3)).toBe('03');
    expect(pad2(12)).toBe('12');
  });
});

describe('todayISO', () => {
  it('returns local YYYY-MM-DD for a fixed date', () => {
    // 按本地时区构造 2026-03-05 某时刻
    const date = new Date(2026, 2, 5, 23, 59, 59);
    expect(todayISO(date)).toBe('2026-03-05');
  });
});

describe('isValidDueDate', () => {
  it('accepts valid YYYY-MM-DD dates', () => {
    expect(isValidDueDate('2026-02-28')).toBe(true);
    expect(isValidDueDate('2024-02-29')).toBe(true);
  });

  it('rejects malformed or impossible dates', () => {
    expect(isValidDueDate('')).toBe(false);
    expect(isValidDueDate('2026-2-3')).toBe(false);
    expect(isValidDueDate('2026-13-01')).toBe(false);
    expect(isValidDueDate('2026-02-30')).toBe(false);
    expect(isValidDueDate('2026-00-10')).toBe(false);
  });
});

describe('daysUntil', () => {
  it('computes signed difference in days ignoring timezone', () => {
    expect(daysUntil('2026-03-05', '2026-03-05')).toBe(0);
    expect(daysUntil('2026-03-06', '2026-03-05')).toBe(1);
    expect(daysUntil('2026-03-04', '2026-03-05')).toBe(-1);
    expect(daysUntil('2026-03-01', '2026-04-01')).toBe(-31);
  });

  it('returns null for invalid input', () => {
    expect(daysUntil('bad', '2026-03-05')).toBeNull();
    expect(daysUntil('2026-03-05', 'also-bad')).toBeNull();
  });
});

describe('formatDueDate', () => {
  it('formats to MM-DD', () => {
    expect(formatDueDate('2026-03-05')).toBe('03-05');
    expect(formatDueDate('2026-11-30')).toBe('11-30');
  });
});

describe('classifyDue', () => {
  const today = '2026-03-05';

  it('returns none for missing or invalid dates', () => {
    expect(classifyDue(null, 'todo', today)).toEqual({ kind: 'none', isOverdue: false });
    expect(classifyDue('', 'todo', today)).toEqual({ kind: 'none', isOverdue: false });
    expect(classifyDue('2026-02-30', 'todo', today)).toEqual({ kind: 'none', isOverdue: false });
  });

  it('treats done tasks as normal even if past due', () => {
    expect(classifyDue('2026-01-01', 'done', today)).toEqual({ kind: 'normal', isOverdue: false });
  });

  it('marks past tasks (not done) as overdue', () => {
    expect(classifyDue('2026-03-04', 'todo', today)).toEqual({ kind: 'overdue', isOverdue: true });
    expect(classifyDue('2026-01-01', 'in_progress', today)).toEqual({ kind: 'overdue', isOverdue: true });
  });

  it('marks today as its own today kind (not soon, not overdue)', () => {
    expect(classifyDue('2026-03-05', 'in_progress', today)).toEqual({ kind: 'today', isOverdue: false });
    expect(classifyDue('2026-03-05', 'todo', today)).toEqual({ kind: 'today', isOverdue: false });
    // done 任务即使今天到期也归为 normal
    expect(classifyDue('2026-03-05', 'done', today)).toEqual({ kind: 'normal', isOverdue: false });
  });

  it('marks within-2-days as soon', () => {
    expect(classifyDue('2026-03-06', 'todo', today)).toEqual({ kind: 'soon', isOverdue: false });
    expect(classifyDue('2026-03-07', 'todo', today)).toEqual({ kind: 'soon', isOverdue: false });
  });

  it('treats 3+ days ahead as normal', () => {
    expect(classifyDue('2026-03-08', 'todo', today)).toEqual({ kind: 'normal', isOverdue: false });
    expect(classifyDue('2027-01-01', 'todo', today)).toEqual({ kind: 'normal', isOverdue: false });
  });
});

describe('dueKindNote', () => {
  it('returns the shared card/detail wording', () => {
    expect(dueKindNote('overdue')).toBe('已逾期');
    expect(dueKindNote('today')).toBe('今天到期');
    expect(dueKindNote('soon')).toBe('临近截止');
    expect(dueKindNote('normal')).toBe('');
    expect(dueKindNote('none')).toBe('');
  });
});

describe('isOverdueTask', () => {
  it('matches the design overdue rule', () => {
    expect(isOverdueTask({ dueDate: '2026-01-01', status: 'todo' }, '2026-03-05')).toBe(true);
    expect(isOverdueTask({ dueDate: '2026-01-01', status: 'done' }, '2026-03-05')).toBe(false);
    expect(isOverdueTask({ dueDate: '2026-03-05', status: 'todo' }, '2026-03-05')).toBe(false);
    expect(isOverdueTask({ dueDate: null, status: 'todo' }, '2026-03-05')).toBe(false);
  });
});
