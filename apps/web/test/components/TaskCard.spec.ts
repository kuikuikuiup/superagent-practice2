// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import TaskCard from '../../src/components/TaskCard.vue';
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
    ...overrides,
  };
}

describe('TaskCard', () => {
  it('renders title, description snippet and priority tag', () => {
    const wrapper = mount(TaskCard, { props: { task: buildTask() } });
    expect(wrapper.find('.card-title').text()).toBe('整理需求');
    expect(wrapper.find('.card-desc').text()).toContain('Issue #3');
    expect(wrapper.find('.priority-tag').text()).toBe('高');
  });

  it('shows the red overdue badge for past-due tasks that are not done', () => {
    const wrapper = mount(TaskCard, { props: { task: buildTask() } });
    expect(wrapper.find('.overdue-tag').text()).toContain('已逾期');
    expect(wrapper.find('.due').classes()).toContain('due--overdue');
  });

  it('hides the overdue badge for done tasks with the same date', () => {
    const wrapper = mount(TaskCard, { props: { task: buildTask({ status: 'done' }) } });
    expect(wrapper.find('.overdue-tag').exists()).toBe(false);
    expect(wrapper.find('.due').classes()).not.toContain('due--overdue');
  });

  it('emits open / edit / delete from the title and action buttons', async () => {
    const wrapper = mount(TaskCard, {
      props: { task: buildTask({ priority: 'low' }) },
    });
    await wrapper.find('.card-title').trigger('click');
    await wrapper.find('button[aria-label="编辑任务"]').trigger('click');
    await wrapper.find('button[aria-label="删除任务"]').trigger('click');
    expect(wrapper.emitted('open')?.length).toBe(1);
    expect(wrapper.emitted('edit')?.length).toBe(1);
    expect(wrapper.emitted('delete')?.length).toBe(1);
  });

  it('emits a move event from the 移至 select and restores displayed status', async () => {
    const wrapper = mount(TaskCard, { props: { task: buildTask() } });
    const select = wrapper.find('select');
    expect(select.text()).toContain('进行中');
    await select.setValue('in_progress');
    expect(wrapper.emitted('move')?.[0]).toEqual([{ id: 't1', status: 'in_progress' }]);
    // 失败时不允许 select 停留在非法状态：等下一次拉取刷新
    expect((select.element as HTMLSelectElement).value).toBe('todo');
  });

  it('sets task id as drag payload on dragstart', async () => {
    const data = { setData: vi.fn(), effectAllowed: '' };
    const wrapper = mount(TaskCard, { props: { task: buildTask() } });
    await wrapper.find('.card').trigger('dragstart', { dataTransfer: data });
    expect(data.setData).toHaveBeenCalledWith('text/plain', 't1');
    expect(data.effectAllowed).toBe('move');
  });
});
