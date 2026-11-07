import { describe, expect, it } from 'vitest';
import { buildTaskQuery, hasActiveFilters } from '../../src/utils/filters';
import { createDefaultFilter } from '../../src/api/types';

describe('buildTaskQuery', () => {
  it('emits defaults sort/order without optional filters', () => {
    expect(buildTaskQuery(createDefaultFilter())).toBe('?sort=createdAt&order=desc');
  });

  it('includes keyword (trimmed), status, priority, sort, order', () => {
    const query = buildTaskQuery({
      keyword: ' 需求 ',
      status: 'todo',
      priority: 'high',
      sort: 'dueDate',
      order: 'asc',
    });
    expect(query).toBe('?keyword=%E9%9C%80%E6%B1%82&status=todo&priority=high&sort=dueDate&order=asc');
  });

  it('skips empty optional filters', () => {
    const query = buildTaskQuery({ keyword: '', status: '', priority: '', sort: 'updatedAt', order: 'desc' });
    expect(query).toBe('?sort=updatedAt&order=desc');
  });

  it('encodes special characters in keyword', () => {
    const query = buildTaskQuery({ ...createDefaultFilter(), keyword: 'a&b c+d' });
    expect(query).toBe(`?keyword=${encodeURIComponent('a&b c+d').replace('%20', '+')}&sort=createdAt&order=desc`);
  });
});

describe('hasActiveFilters', () => {
  it('is false for the default filter', () => {
    expect(hasActiveFilters(createDefaultFilter())).toBe(false);
  });

  it('is true when keyword/status/priority is set', () => {
    expect(hasActiveFilters({ ...createDefaultFilter(), keyword: '需求' })).toBe(true);
    expect(hasActiveFilters({ ...createDefaultFilter(), status: 'done' })).toBe(true);
    expect(hasActiveFilters({ ...createDefaultFilter(), priority: 'low' })).toBe(true);
    expect(hasActiveFilters({ ...createDefaultFilter(), keyword: '  ' })).toBe(false);
  });

  it('ignores pure sort changes', () => {
    expect(hasActiveFilters({ ...createDefaultFilter(), sort: 'dueDate', order: 'asc' })).toBe(false);
  });
});
