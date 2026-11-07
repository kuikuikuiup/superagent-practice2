// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import ConfirmDialog from '../../src/components/ConfirmDialog.vue';
import Board from '../../src/components/Board.vue';
import type { Task } from '../../src/api/types';

function buildTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1',
    title: '整理需求',
    description: '',
    status: 'todo',
    priority: 'medium',
    dueDate: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('ConfirmDialog', () => {
  it('asks for explicit confirmation with the task context', () => {
    const wrapper = mount(ConfirmDialog, {
      props: {
        title: '删除任务',
        message: '确认删除「整理需求」？该操作会永久移除此任务，且无法恢复。',
        error: null,
        loading: false,
      },
    });
    expect(wrapper.find('.confirm-title').text()).toBe('删除任务');
    expect(wrapper.find('.confirm-message').text()).toContain('整理需求');
  });

  it('emits confirm and cancel from the two buttons', async () => {
    const wrapper = mount(ConfirmDialog, {
      props: {
        title: '删除任务',
        message: '确认删除？',
        error: null,
        loading: false,
      },
    });
    await wrapper.find('button.btn-danger-solid').trigger('click');
    await wrapper.find('button.btn-ghost').trigger('click');
    expect(wrapper.emitted('confirm')?.length).toBe(1);
    expect(wrapper.emitted('cancel')?.length).toBe(1);
  });

  it('renders the delete failure error inline', () => {
    const wrapper = mount(ConfirmDialog, {
      props: { title: '删除任务', message: '确认删除？', error: '任务不存在', loading: false },
    });
    expect(wrapper.find('.confirm-error').text()).toBe('任务不存在');
  });
});

describe('Board', () => {
  it('distributes tasks into the three columns with live counts', () => {
    const wrapper = mount(Board, {
      props: {
        tasks: [
          buildTask({ id: 'a', status: 'todo' }),
          buildTask({ id: 'b', status: 'in_progress', title: 'B' }),
          buildTask({ id: 'c', status: 'done', title: 'C' }),
        ],
        loading: false,
        filtersActive: false,
        hasTasks: true,
      },
    });
    const columns = wrapper.findAll('section[data-column]');
    expect(columns.length).toBe(3);
    expect(wrapper.find('section[data-column="todo"] .column-count').text()).toBe('1');
    expect(wrapper.find('section[data-column="done"] .card-title').text()).toBe('C');
  });

  it('drops a dragged card into a column and emits move', async () => {
    const wrapper = mount(Board, {
      props: {
        tasks: [buildTask()],
        loading: false,
        filtersActive: false,
        hasTasks: true,
      },
    });
    const todoColumn = wrapper.find('section[data-column="in_progress"]');
    await todoColumn.trigger('drop', {
      preventDefault: () => undefined,
      dataTransfer: { getData: () => 't1' },
    });
    expect(wrapper.emitted('move')?.[0]).toEqual(['t1', 'in_progress']);
  });

  it('shows the plain empty state and a create button when there are no tasks', async () => {
    const wrapper = mount(Board, {
      props: { tasks: [], loading: false, filtersActive: false, hasTasks: false },
    });
    expect(wrapper.find('.board-empty-title').text()).toBe('暂无任务');
    await wrapper.find('.board-empty .btn-primary').trigger('click');
    expect(wrapper.emitted('create')?.length).toBe(1);
  });

  it('shows the filtered-empty state with a clear-filters button', async () => {
    const wrapper = mount(Board, {
      props: { tasks: [], loading: false, filtersActive: true, hasTasks: true },
    });
    expect(wrapper.find('.board-empty-title').text()).toBe('没有匹配的任务');
    await wrapper.find('.board-empty .btn-ghost').trigger('click');
    expect(wrapper.emitted('clear-filters')?.length).toBe(1);
  });
});
