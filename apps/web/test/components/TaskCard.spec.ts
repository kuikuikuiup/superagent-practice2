// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { Select as ASelect, Popconfirm as APopconfirm } from '@arco-design/web-vue';
import { nextTick } from 'vue';
import { mountWithArco } from '../../test/helpers/arco';
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

  it('emits open / edit from the title and action buttons', async () => {
    const wrapper = mountWithArco(TaskCard, {
      props: { task: buildTask({ priority: 'low' }) },
    });
    await wrapper.find('.card-title').trigger('click');
    await wrapper.find('button[aria-label="编辑任务"]').trigger('click');
    expect(wrapper.emitted('open')?.length).toBe(1);
    expect(wrapper.emitted('edit')?.length).toBe(1);
  });

  it('emits delete via card Popconfirm', async () => {
    const wrapper = mountWithArco(TaskCard, { props: { task: buildTask() } });
    expect(wrapper.find('button[aria-label="删除任务"]').exists()).toBe(true);
    const popconfirm = wrapper.findComponent(APopconfirm);
    popconfirm.vm.$emit('ok');
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
