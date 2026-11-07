// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

vi.mock('../../src/api/tasks', () => ({
  fetchTasks: vi.fn(),
  fetchStats: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
}));

import { deleteTask, fetchStats, fetchTasks } from '../../src/api/tasks';
import App from '../../src/App.vue';
import type { Task } from '../../src/api/types';

function buildTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1',
    title: '整理需求',
    description: '阅读 issue',
    status: 'todo',
    priority: 'high',
    dueDate: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function stats() {
  return { total: 1, todo: 1, inProgress: 0, done: 0, doneRate: 0, overdue: 0 };
}

beforeEach(() => {
  vi.mocked(fetchTasks).mockResolvedValue({ items: [buildTask()], total: 1 });
  vi.mocked(fetchStats).mockResolvedValue(stats());
});

describe('App', () => {
  it('loads tasks and stats on mount and renders the board', async () => {
    const wrapper = mount(App);
    await flushPromises();
    expect(fetchTasks).toHaveBeenCalledTimes(1);
    expect(fetchStats).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain('任务总数');
    expect(wrapper.find('section[data-column="todo"]').exists()).toBe(true);
    expect(wrapper.find('.card-title').text()).toBe('整理需求');
  });

  it('deletes a task after explicit confirmation', async () => {
    const wrapper = mount(App);
    await flushPromises();
    await wrapper.find('button[aria-label="删除任务"]').trigger('click');
    expect(wrapper.find('.confirm').exists()).toBe(true);
    await wrapper.find('button.btn-danger-solid').trigger('click');
    await flushPromises();
    expect(deleteTask).toHaveBeenCalledWith('t1');
    expect(wrapper.find('.confirm').exists()).toBe(false);
  });

  it('creates a task through the modal and maps form values to the API', async () => {
    const createTask = (await import('../../src/api/tasks')).createTask;
    vi.mocked(createTask).mockResolvedValue(buildTask());
    const wrapper = mount(App);
    await flushPromises();
    await wrapper.find('.toolbar .btn-primary').trigger('click');
    expect(wrapper.find('.modal').exists()).toBe(true);
    await wrapper.find('#task-title').setValue('新任务');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(createTask).toHaveBeenCalledWith({
      title: '新任务',
      description: '',
      status: 'todo',
      priority: 'medium',
      dueDate: null,
    });
    expect(wrapper.find('.modal').exists()).toBe(false);
  });

  it('applies the keyword filter after debounce', async () => {
    const wrapper = mount(App);
    await flushPromises();
    await wrapper.find('input[aria-label="关键词搜索"]').setValue('需求');
    await new Promise((resolve) => setTimeout(resolve, 350));
    await flushPromises();
    const lastCall = vi.mocked(fetchTasks).mock.calls.at(-1)?.[0];
    expect(lastCall).toMatchObject({ keyword: '需求' });
  });

  it('shows a retry banner when loading fails', async () => {
    vi.mocked(fetchStats).mockRejectedValue(new Error('boom'));
    vi.mocked(fetchTasks).mockRejectedValue(new Error('boom'));
    const wrapper = mount(App);
    await flushPromises();
    const retry = wrapper.find('.banner .banner-btn');
    expect(wrapper.find('.banner').exists()).toBe(true);
    expect(retry.text()).toContain('重试');

    // 恢复后点击重试可成功加载
    vi.mocked(fetchTasks).mockResolvedValue({ items: [buildTask()], total: 1 });
    vi.mocked(fetchStats).mockResolvedValue(stats());
    await retry.trigger('click');
    await flushPromises();
    expect(wrapper.find('.banner').exists()).toBe(false);
  });

  it('toggles the filtered-empty state via 清除筛选', async () => {
    const wrapper = mount(App);
    await flushPromises();
    await wrapper.find('select[aria-label="优先级筛选"]').setValue('low');
    vi.mocked(fetchTasks).mockResolvedValue({ items: [], total: 0 });
    await new Promise((resolve) => setTimeout(resolve, 350));
    await flushPromises();
    expect(wrapper.find('.board-empty-title').text()).toBe('没有匹配的任务');
    await wrapper.find('.board-empty .btn-ghost').trigger('click');
    await flushPromises();
    const lastCall = vi.mocked(fetchTasks).mock.calls.at(-1)?.[0];
    expect(lastCall).toEqual({
      keyword: '',
      status: '',
      priority: '',
      sort: 'createdAt',
      order: 'desc',
    });
  });
});
