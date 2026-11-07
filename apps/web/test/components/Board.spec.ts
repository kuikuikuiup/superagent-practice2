// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { mountWithArco } from '../../test/helpers/arco';
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

describe('Board', () => {
  it('distributes tasks into the three columns with live badges', () => {
    const wrapper = mountWithArco(Board, {
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
    expect(wrapper.find('section[data-column="todo"] .arco-badge-number').text()).toBe('1');
    expect(wrapper.find('section[data-column="done"] .card-title').text()).toBe('C');
  });

  it('drops a dragged card into a column and emits move', async () => {
    const wrapper = mountWithArco(Board, {
      props: {
        tasks: [buildTask()],
        loading: false,
        filtersActive: false,
        hasTasks: true,
      },
    });
    const inProgressColumn = wrapper.find('section[data-column="in_progress"]');
    await inProgressColumn.trigger('drop', {
      preventDefault: () => undefined,
      dataTransfer: { getData: () => 't1' },
    });
    expect(wrapper.emitted('move')?.[0]).toEqual(['t1', 'in_progress']);
  });

  it('shows the plain empty state and a create button when there are no tasks', async () => {
    const wrapper = mountWithArco(Board, {
      props: { tasks: [], loading: false, filtersActive: false, hasTasks: false },
    });
    expect(wrapper.text()).toContain('暂无任务');
    await wrapper.find('[data-action="create"]').trigger('click');
    expect(wrapper.emitted('create')?.length).toBe(1);
  });

  it('shows the filtered-empty state with a clear-filters button', async () => {
    const wrapper = mountWithArco(Board, {
      props: { tasks: [], loading: false, filtersActive: true, hasTasks: true },
    });
    expect(wrapper.text()).toContain('没有匹配的任务');
    await wrapper.find('[data-action="clear-filters"]').trigger('click');
    expect(wrapper.emitted('clear-filters')?.length).toBe(1);
  });
});
