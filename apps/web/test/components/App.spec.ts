// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Select as ASelect } from '@arco-design/web-vue';
import { flushPromises } from '@vue/test-utils';
import { nextTick } from 'vue';

vi.mock('../../src/api/tasks', () => ({
  TREND_DAYS: 14,
  fetchStatsTrend: vi.fn(),
  fetchTasks: vi.fn(),
  fetchStats: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
}));

import { createTask, deleteTask, fetchStats, fetchStatsTrend, fetchTasks, updateTask } from '../../src/api/tasks';
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
    tokens: 0,
    cost: 0,
    ...overrides,
  };
}

function stats() {
  return { total: 1, todo: 1, inProgress: 0, done: 0, doneRate: 0, overdue: 0, tokens: 12480, cost: 1.24 };
}

/** 14 个点全部落在 7 天前，保证「近 7 天 / 前 7 天」环比都为 0，隐藏趋势条。 */
function trend() {
  const points = Array.from({ length: 14 }, (_, index) => {
    const d = new Date();
    d.setDate(d.getDate() - (14 - index));
    return { date: d.toISOString().slice(0, 10), created: 0, tokens: 0, cost: 0 };
  });
  return { days: 14, points };
}

async function settle() {
  await flushPromises();
  await nextTick();
  await flushPromises();
  await nextTick();
  await flushPromises();
}

async function mountApp(options: { teleportReal?: boolean } = {}) {
  const wrapper = mountWithArco(
    App,
    options.teleportReal ? { attachTo: document.body, global: { stubs: { teleport: false } } } : {},
  );
  await settle();
  return wrapper;
}

function buttonByText(wrapper: Awaited<ReturnType<typeof mountApp>>, text: string) {
  return wrapper.findAll('button').find((b) => b.text().includes(text));
}

beforeEach(() => {
  vi.mocked(fetchTasks).mockResolvedValue({ items: [buildTask()], total: 1 });
  vi.mocked(fetchStats).mockResolvedValue(stats());
  vi.mocked(fetchStatsTrend).mockResolvedValue(trend());
  vi.mocked(createTask).mockResolvedValue(buildTask());
  vi.mocked(updateTask).mockResolvedValue(buildTask());
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
      tokens: 0,
      cost: 0,
    });
    expect(Message.success).toHaveBeenCalledWith('已创建「新任务」');
    expect(wrapper.find('#task-title').exists()).toBe(false);
  });

  it('deletes a task after the card menu → Modal confirmation', async () => {
    const wrapper = await mountApp({ teleportReal: true });
    // “删除”收纳在卡片的更多操作菜单内（Teleport 到 body），
    // 点击菜单项后由 App 层删除 Modal 再次确认
    await wrapper.find('button[aria-label="更多操作"]').trigger('click');
    await nextTick();
    const deleteOption = document.querySelector<HTMLElement>('.card-more-danger');
    expect(deleteOption).not.toBeNull();
    deleteOption!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle();
    // teleport: false 下确认 Modal 同样传送至 body
    const confirmModal = document.querySelector<HTMLElement>('.arco-modal');
    expect(confirmModal?.textContent).toContain('确认删除');
    const confirmButton = document.querySelector<HTMLElement>('.arco-modal-footer .arco-btn-primary');
    expect(confirmButton).not.toBeNull();
    confirmButton!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle();
    expect(deleteTask).toHaveBeenCalledWith('t1');
    expect(Message.success).toHaveBeenCalledWith('任务已删除');
    expect(document.querySelector('.arco-modal')).toBeNull();
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
    const modal = wrapper.findComponent({ name: 'Modal' });
    expect(modal.exists()).toBe(true);
    expect(modal.text()).toContain('整理需求');
    await buttonByText(wrapper, '确认删除')?.trigger('click');
    await settle();
    expect(deleteTask).toHaveBeenCalledWith('t1');
  });

  it('keeps the detail drawer open under the edit modal and returns to it (P1-05)', async () => {
    const wrapper = await mountApp();
    await wrapper.find('.card-title').trigger('click');
    await settle();
    expect(wrapper.find('.drawer-title').exists()).toBe(true);

    await wrapper.find('.drawer-footer-edit').trigger('click');
    await settle();
    // 编辑叠加在详情之上：详情仍在，编辑表单同时可见
    expect(wrapper.find('.drawer-title').exists()).toBe(true);
    expect(wrapper.find('#task-title').exists()).toBe(true);

    await buttonByText(wrapper, '取消')?.trigger('click');
    await settle();
    expect(wrapper.find('#task-title').exists()).toBe(false);
    expect(wrapper.find('.drawer-title').exists()).toBe(true);
  });

  it('closes the edit modal first, then the detail drawer on successive Esc presses (P1-05)', async () => {
    const wrapper = await mountApp();
    await wrapper.find('.card-title').trigger('click');
    await settle();
    await wrapper.find('.drawer-footer-edit').trigger('click');
    await settle();

    // 第一次 Esc 在编辑弹窗内触发：只关闭编辑，详情继续保留
    document.documentElement.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    );
    await settle();
    expect(wrapper.find('#task-title').exists()).toBe(false);
    expect(wrapper.find('.drawer-title').exists()).toBe(true);

    // 第二次 Esc 关闭详情
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await settle();
    expect(wrapper.find('.drawer-title').exists()).toBe(false);
  });

  it('changes a task status directly from the detail drawer (P2-09)', async () => {
    const wrapper = await mountApp();
    await wrapper.find('.card-title').trigger('click');
    await settle();
    const selects = wrapper.findAllComponents(ASelect);
    const drawerSelect = selects.at(-1);
    expect(drawerSelect).toBeTruthy();
    drawerSelect!.vm.$emit('change', 'done');
    await settle();
    expect(updateTask).toHaveBeenCalledWith('t1', { status: 'done' });
    // 改状态成功后详情保持打开
    expect(wrapper.find('.drawer-title').exists()).toBe(true);
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
