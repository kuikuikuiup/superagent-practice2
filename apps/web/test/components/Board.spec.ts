// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
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
    tokens: 0,
    cost: 0,
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
    expect(wrapper.find('section[data-column="todo"] .column-badge').text()).toBe('1');
    expect(wrapper.find('section[data-column="done"] .card-title').text()).toBe('C');
  });

  it('keeps an explicit 0 badge on empty columns（筛选后空列不能只剩标题）', () => {
    const wrapper = mountWithArco(Board, {
      props: {
        tasks: [buildTask({ id: 'a', status: 'todo' })],
        loading: false,
        filtersActive: true,
        hasTasks: true,
      },
    });
    const badges = wrapper.findAll('.column-badge').map((node) => node.text());
    expect(badges).toEqual(['1', '0', '0']);
    expect(wrapper.find('section[data-column="done"]').text()).toContain('无匹配任务');
  });

  it('drops a dragged card into a column and emits move with the real task id', async () => {
    const wrapper = mountWithArco(Board, {
      props: {
        tasks: [buildTask()],
        loading: false,
        filtersActive: false,
        hasTasks: true,
      },
    });
    const dataTransfer = { setData: vi.fn(), getData: () => 't1', effectAllowed: '', dropEffect: '' };
    await wrapper.find('.card').trigger('dragstart', { dataTransfer, preventDefault: () => undefined });
    expect(dataTransfer.setData).toHaveBeenCalledWith('text/plain', 't1');
    await wrapper.find('section[data-column="in_progress"]').trigger('drop', {
      preventDefault: () => undefined,
      dataTransfer: { getData: () => 't1' },
    });
    expect(wrapper.emitted('move')?.[0]).toEqual(['t1', 'in_progress']);
  });

  it('ignores drops whose payload is not a known task id（列标题/计数不再被当成 ID）', async () => {
    const wrapper = mountWithArco(Board, {
      props: {
        tasks: [buildTask()],
        loading: false,
        filtersActive: false,
        hasTasks: true,
      },
    });
    await wrapper.find('section[data-column="in_progress"]').trigger('drop', {
      preventDefault: () => undefined,
      dataTransfer: { getData: () => '进行中 2' },
    });
    expect(wrapper.emitted('move')).toBeUndefined();
  });

  it('does not start a drag from non-card board content（列头文本拖拽被阻止）', async () => {
    const wrapper = mountWithArco(Board, {
      props: {
        tasks: [buildTask()],
        loading: false,
        filtersActive: false,
        hasTasks: true,
      },
    });
    const header = wrapper.find('.column-header').element;
    const event = new Event('dragstart', { bubbles: true, cancelable: true });
    header.dispatchEvent(event);
    // 非卡片内容发起拖拽被取消：列头文本（如「进行中 2」）不会变成任务 ID
    expect(event.defaultPrevented).toBe(true);
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
