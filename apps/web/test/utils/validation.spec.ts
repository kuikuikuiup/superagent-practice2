import { describe, expect, it } from 'vitest';
import {
  createFormValues,
  mergeServerDetails,
  normalizeForm,
  validateTaskForm,
} from '../../src/utils/validation';
import type { Task } from '../../src/api/types';

const valid = {
  title: '整理需求',
  description: '一些说明',
  status: 'todo' as const,
  priority: 'medium' as const,
  dueDate: '2026-11-30',
};

describe('validateTaskForm', () => {
  it('passes for a valid form', () => {
    expect(validateTaskForm(valid)).toEqual({});
  });

  it('requires a non-empty title (trimmed)', () => {
    expect(validateTaskForm({ ...valid, title: '' })).toEqual({ title: '请输入标题' });
    expect(validateTaskForm({ ...valid, title: '   ' })).toEqual({ title: '请输入标题' });
    expect(validateTaskForm({ ...valid, title: ' a ' })).toEqual({});
  });

  it('rejects titles over 100 chars', () => {
    const long = 'a'.repeat(101);
    expect(validateTaskForm({ ...valid, title: long })).toEqual({ title: '标题不能超过 100 个字符' });
    expect(Object.hasOwn(validateTaskForm({ ...valid, title: 'a'.repeat(100) }), 'title')).toBe(false);
  });

  it('rejects descriptions over 2000 chars', () => {
    const errors = validateTaskForm({ ...valid, description: 'b'.repeat(2001) });
    expect(errors['description']).toBe('描述不能超过 2000 个字符');
  });

  it('rejects invalid dueDate but allows empty', () => {
    expect(validateTaskForm({ ...valid, dueDate: '' }).hasOwnProperty('dueDate')).toBe(false);
    expect(validateTaskForm({ ...valid, dueDate: '2026-13-01' })['dueDate']).toBe('请输入有效的日期（YYYY-MM-DD）');
  });

  it('collects multiple field errors at once', () => {
    const errors = validateTaskForm({ title: '', description: '', status: 'todo', priority: 'medium', dueDate: 'x' });
    expect(Object.hasOwn(errors, 'title')).toBe(true);
    expect(Object.hasOwn(errors, 'dueDate')).toBe(true);
  });
});

describe('createFormValues / normalizeForm', () => {
  const task: Task = {
    id: 't1',
    title: '  整理需求  ',
    description: '  说明  ',
    status: 'in_progress',
    priority: 'high',
    dueDate: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  it('builds form values from a task (empty dueDate → empty string)', () => {
    const values = createFormValues(task);
    expect(values).toEqual({
      title: '  整理需求  ',
      description: '  说明  ',
      status: 'in_progress',
      priority: 'high',
      dueDate: '',
    });
  });

  it('defaults to empty todo/medium form', () => {
    expect(createFormValues(null)).toEqual({
      title: '',
      description: '',
      status: 'todo',
      priority: 'medium',
      dueDate: '',
    });
  });

  it('trims values and maps empty dueDate to null', () => {
    expect(normalizeForm({ ...valid, title: '  t ', description: ' ', dueDate: '' })).toEqual({
      title: 't',
      description: '',
      status: 'todo',
      priority: 'medium',
      dueDate: null,
    });
    expect(
      normalizeForm(valid),
    ).toEqual({ ...valid, description: '一些说明', dueDate: '2026-11-30' });
  });
});

describe('mergeServerDetails', () => {
  it('merges server field errors into form errors', () => {
    const merged = mergeServerDetails([{ path: 'title', message: '标题已存在' }], {
      description: '有些问题',
    });
    expect(merged).toEqual({ description: '有些问题', title: '标题已存在' });
  });

  it('returns original errors for null details', () => {
    const errors = { title: '请输入标题' };
    expect(mergeServerDetails(null, errors)).toBe(errors);
    expect(mergeServerDetails([], errors)).toBe(errors);
  });
});
