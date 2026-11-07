// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Modal as AModal, Popconfirm as APopconfirm, Select as ASelect } from '@arco-design/web-vue';
import { flushPromises } from '@vue/test-utils';
import { nextTick } from 'vue';

vi.mock('../../src/api/tasks', () => ({
  fetchTasks: vi.fn(),
  fetchStats: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
}));

import { createTask, deleteTask, fetchStats, fetchTasks } from '../../src/api/tasks';
import { Message } from '@arco-design/web-vue';
import { mountWithArco } from '../helpers/arco';
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

async function settle() {
  await flushPromises();
  await nextTick();
  await flushPromises();
  await nextTick();
  await flushPromises();
}

async function mountApp() {
  const wrapper = mountWithArco(App);
  await settle();
  return wrapper;
}

function buttonByText(wrapper: Awaited<ReturnType<typeof mountApp>>, text: string) {
  return wrapper.findAll('button').find((b) => b.text().includes(text));
}

beforeEach(() => {
  vi.mocked(fetchTasks).mockResolvedValue({ items: [buildTask()], total: 1 });
  vi.mocked(fetchStats).mockResolvedValue(stats());
  vi.mocked(createTask).mockResolvedValue(buildTask());
  vi.mocked(deleteTask).mockResolvedValue(undefined);
  vi.spyOn(Message, 'success').mockImplementation(() => null as never);
  vi.spyOn(Message, 'error').mockImplementation(() => null as never);
});

describe('App', () => {
  it('loads tasks and stats on mount and renders the board', async () => {
    const wrapper = await mountApp();
    expect(fetchTasks).toHaveBeenCalledTimes(1);
    expect(fetchStats).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain('任务总数');
    expect(wrapper.find('section[data-column="todo"]').exists()).toBe(true);
    expect(wrapper.find('.card-title').text()).toBe('整理需求');
  });

  it('creates a task through the modal and maps form values to the API', async () => {
    const wrapper = await mountApp();
    await buttonByText(wrapper, '新建任务')?.trigger('click');
    await settle();
    expect(wrapper.find('#task-title').exists()).toBe(true);
    await wrapper.find('#task-title').setValue('新任务');
    await buttonByText(wrapper, '创建')?.trigger('click');
    await settle();
    expect(createTask).toHaveBeenCalledWith({
      title: '新任务',
      description: '',
      status: 'todo',
      priority: 'medium',
      dueDate: null,
    });
    expect(Message.success).toHaveBeenCalledWith('已创建「新任务」');
    expect(wrapper.find('#task-title').exists()).toBe(false);
  });

  it('deletes a task after the card Popconfirm → Modal confirmation', async () => {
    const wrapper = await mountApp();
    wrapper.getComponent(APopconfirm).vm.$emit('ok');
    await settle();
    expect(wrapper.getComponent(AModal).text()).toContain('确认删除');
    await buttonByText(wrapper, '确认删除')?.trigger('click');
    await settle();
    expect(deleteTask).toHaveBeenCalledWith('t1');
    expect(Message.success).toHaveBeenCalledWith('任务已删除');
    expect(wrapper.findComponent(AModal).exists()).toBe(false);
  });

  it('asks for explicit confirmation before deleting from the detail drawer', async () => {
    const wrapper = await mountApp();
    await wrapper.find('.card-title').trigger('click');
    await settle();
    const deleteButton = wrapper
      .findAll('button')
      .find((b) => b.text().trim() === '删除');
    await deleteButton?.trigger('click');
    await settle();
    const modal = wrapper.findComponent(AModal);
    expect(modal.exists()).toBe(true);
    expect(modal.text()).toContain('整理需求');
    await buttonByText(wrapper, '确认删除')?.trigger('click');
    await settle();
    expect(deleteTask).toHaveBeenCalledWith('t1');
  });

  it('applies the keyword filter after debounce', async () => {
    const wrapper = await mountApp();
    await wrapper.find('input[placeholder="搜索标题或描述…"]').setValue('需求');
    await new Promise((resolve) => setTimeout(resolve, 350));
    await settle();
    const lastCall = vi.mocked(fetchTasks).mock.calls.at(-1)?.[0];
    expect(lastCall).toMatchObject({ keyword: '需求' });
  });

  it('applies the priority filter from the toolbar select', async () => {
    const wrapper = await mountApp();
    const toolbarSelects = wrapper.findAllComponents(ASelect).slice(0, 4);
    toolbarSelects[1]?.vm.$emit('change', 'low');
    await settle();
    const lastCall = vi.mocked(fetchTasks).mock.calls.at(-1)?.[0];
    expect(lastCall).toMatchObject({ priority: 'low' });
  });

  it('shows a retry alert when loading fails', async () => {
    vi.mocked(fetchStats).mockRejectedValue(new Error('boom'));
    vi.mocked(fetchTasks).mockRejectedValue(new Error('boom'));
    const wrapper = mountWithArco(App);
    await settle();
    expect(wrapper.find('.arco-alert-error').exists()).toBe(true);
    const retry = buttonByText(wrapper, '重试');
    expect(retry?.text()).toContain('重试');

    vi.mocked(fetchTasks).mockResolvedValue({ items: [buildTask()], total: 1 });
    vi.mocked(fetchStats).mockResolvedValue(stats());
    await retry?.trigger('click');
    await settle();
    expect(wrapper.find('.arco-alert-error').exists()).toBe(false);
  });

  it('toggles the filtered-empty state via 清除筛选', async () => {
    const wrapper = await mountApp();
    const toolbarSelects = wrapper.findAllComponents(ASelect).slice(0, 4);
    toolbarSelects[1]?.vm.$emit('change', 'low');
    vi.mocked(fetchTasks).mockResolvedValue({ items: [], total: 0 });
    await new Promise((resolve) => setTimeout(resolve, 350));
    await settle();
    expect(wrapper.text()).toContain('没有匹配的任务');
    await wrapper.find('[data-action="clear-filters"]').trigger('click');
    await settle();
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
