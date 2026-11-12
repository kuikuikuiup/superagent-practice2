// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Select as ASelect } from '@arco-design/web-vue';
import { nextTick } from 'vue';
import { mountWithArco } from '../../test/helpers/arco';
import TaskCard from '../../src/components/TaskCard.vue';
import { todayISO } from '../../src/utils/dueDate';
import type { Task } from '../../src/api/types';

function buildTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1',
    title: '整理需求',
    description: '阅读 Issue #3 并列出验收标准',
    status: 'todo',
    priority: 'high',
    dueDate: '2026-01-01',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    tokens: 0,
    cost: 0,
    ...overrides,
  };
}

describe('TaskCard', () => {
  // “更多操作”菜单经 Teleport 渲染到 body：相关用例用真实传送（stub 关闭）
  // 并挂到 document 上，afterEach 统一清理浮层，避免用例间残留。
  afterEach(() => {
    document.body.innerHTML = '';
  });
  it('renders title, description snippet and priority tag', () => {
    const wrapper = mountWithArco(TaskCard, { props: { task: buildTask() } });
    expect(wrapper.find('.card-title').text()).toBe('整理需求');
    expect(wrapper.find('.card-desc').text()).toContain('Issue #3');
    expect(wrapper.find('.card-priority').text()).toBe('高');
  });

  it('shows the red overdue tag for past-due tasks that are not done', () => {
    const wrapper = mountWithArco(TaskCard, { props: { task: buildTask() } });
    expect(wrapper.find('.card-overdue').text()).toContain('已逾期');
    expect(wrapper.find('.due').classes()).toContain('due--overdue');
  });

  it('hides the overdue tag for done tasks with the same date', () => {
    const wrapper = mountWithArco(TaskCard, { props: { task: buildTask({ status: 'done' }) } });
    expect(wrapper.find('.card-overdue').exists()).toBe(false);
    expect(wrapper.find('.due').classes()).not.toContain('due--overdue');
  });

  it('shows an orange 今天到期 tag (not 临近截止) for tasks due today', () => {
    const wrapper = mountWithArco(TaskCard, {
      props: { task: buildTask({ dueDate: todayISO(), status: 'in_progress' }) },
    });
    expect(wrapper.find('.card-due-today').text()).toContain('今天到期');
    expect(wrapper.find('.card-overdue').exists()).toBe(false);
    expect(wrapper.find('.due').classes()).toContain('due--today');
    expect(wrapper.text()).not.toContain('临近截止');
  });

  it('renders the date with a warning color class for soon tasks', () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 1);
    const dueDate = `${soon.getFullYear()}-${String(soon.getMonth() + 1).padStart(2, '0')}-${String(
      soon.getDate(),
    ).padStart(2, '0')}`;
    const wrapper = mountWithArco(TaskCard, { props: { task: buildTask({ dueDate }) } });
    expect(wrapper.find('.card-due-today').exists()).toBe(false);
    expect(wrapper.find('.card-overdue').exists()).toBe(false);
    expect(wrapper.find('.due').classes()).toContain('due--soon');
  });

  it('uses 词元 wording and the shared token/cost formatters', () => {
    const wrapper = mountWithArco(TaskCard, {
      props: { task: buildTask({ tokens: 8640, cost: 0.86 }) },
    });
    const consumption = wrapper.find('.card-consumption');
    expect(consumption.text()).toContain('8.6k 词元');
    expect(consumption.text()).toContain('¥0.86');
    expect(wrapper.text()).not.toMatch(/\btok\b/);
    expect(wrapper.text()).not.toMatch(/\bToken\b/);
  });

  it('omits the consumption line when both tokens and cost are zero', () => {
    const wrapper = mountWithArco(TaskCard, { props: { task: buildTask({ tokens: 0, cost: 0 }) } });
    expect(wrapper.find('.card-consumption').exists()).toBe(false);
  });

  it('exposes the real task id for board drag & drop and keeps a move control', () => {
    const wrapper = mountWithArco(TaskCard, { props: { task: buildTask({ id: 'task-42' }) } });
    const root = wrapper.find('.card');
    expect(root.attributes('data-task-id')).toBe('task-42');
    expect(root.attributes('draggable')).toBe('true');
    expect(wrapper.find('.card-move select, .card-move .arco-select').exists()).toBe(true);
  });

  it('emits open from the title and edit from the more-actions dropdown', async () => {
    const wrapper = mountWithArco(TaskCard, {
      props: { task: buildTask({ priority: 'low' }) },
      attachTo: document.body,
      global: { stubs: { teleport: false } },
    });
    await wrapper.find('.card-title').trigger('click');
    expect(wrapper.emitted('open')?.length).toBe(1);

    // 打开“更多操作”菜单（Teleport 到 body），再点击“编辑”菜单项
    await wrapper.find('button[aria-label="更多操作"]').trigger('click');
    await nextTick();
    const editOption = document.querySelector<HTMLElement>('.card-more-edit');
    expect(editOption).not.toBeNull();
    editOption!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await nextTick();
    expect(wrapper.emitted('edit')?.length).toBe(1);
  });

  it('emits open when clicking anywhere on the card except controls', async () => {
    const wrapper = mountWithArco(TaskCard, { props: { task: buildTask() } });
    await wrapper.find('.card-title').trigger('click');
    expect(wrapper.emitted('open')?.length).toBe(1);
    // 状态选择与更多操作区域不触发打开详情
    await wrapper.find('.card-move').trigger('click');
    await wrapper.find('button[aria-label="更多操作"]').trigger('click');
    expect(wrapper.emitted('open')?.length).toBe(1);
  });

  it('renders the low-frequency actions in a single aria-labeled more button', () => {
    const wrapper = mountWithArco(TaskCard, { props: { task: buildTask() } });
    expect(wrapper.find('button[aria-label="更多操作"]').exists()).toBe(true);
    expect(wrapper.find('button[aria-label="编辑任务"]').exists()).toBe(false);
    expect(wrapper.find('button[aria-label="删除任务"]').exists()).toBe(false);
  });

  it('emits delete from the more-actions dropdown', async () => {
    const wrapper = mountWithArco(TaskCard, {
      props: { task: buildTask() },
      attachTo: document.body,
      global: { stubs: { teleport: false } },
    });
    // 打开“更多操作”菜单（Teleport 到 body），再点击“删除”菜单项；
    // 确认由 App 层的删除 Modal 承担（Dropdown 内嵌 Popconfirm 会随菜单关闭而失效）。
    await wrapper.find('button[aria-label="更多操作"]').trigger('click');
    await nextTick();
    const deleteOption = document.querySelector<HTMLElement>('.card-more-danger');
    expect(deleteOption).not.toBeNull();
    deleteOption!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await nextTick();
    expect(wrapper.emitted('delete')?.length).toBe(1);
  });

  it('emits move from the 移至 select which stays bound to the current status', async () => {
    const wrapper = mountWithArco(TaskCard, { props: { task: buildTask() } });
    const select = wrapper.findComponent(ASelect);
    expect(select.props('modelValue')).toBe('todo');
    select.vm.$emit('change', 'in_progress');
    await nextTick();
    expect(wrapper.emitted('move')?.[0]).toEqual([{ id: 't1', status: 'in_progress' }]);
    // 受控绑定未变（等待重新拉取），重挂后回滚显示
    expect(select.props('modelValue')).toBe('todo');
  });

  it('sets task id as drag payload on dragstart', async () => {
    const data = { setData: vi.fn(), effectAllowed: '' };
    const wrapper = mountWithArco(TaskCard, { props: { task: buildTask() } });
    await wrapper.find('.card').trigger('dragstart', { dataTransfer: data });
    expect(data.setData).toHaveBeenCalledWith('text/plain', 't1');
    expect(data.effectAllowed).toBe('move');
  });
});
