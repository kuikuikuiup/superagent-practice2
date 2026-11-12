// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { mountWithArco } from '../helpers/arco';
import StatsBar from '../../src/components/StatsBar.vue';
import type { StatsTrend, TaskStats } from '../../src/api/types';

const stats: TaskStats = {
  total: 5,
  todo: 3,
  inProgress: 1,
  done: 1,
  doneRate: 20,
  overdue: 1,
  tokens: 24320,
  cost: 2.42,
};

/** 前 7 天无数据、后 7 天有数据：模拟「近 7 天环比上涨」的真实趋势。 */
const trend: StatsTrend = {
  days: 14,
  points: Array.from({ length: 14 }, (_, index) => ({
    date: `2026-11-${String(index + 1).padStart(2, '0')}`,
    created: index >= 7 ? 1 : 0,
    tokens: index >= 7 ? 3200 : 0,
    cost: index >= 7 ? 0.35 : 0,
  })),
};

function mountBar(overrides: Partial<InstanceType<typeof StatsBar>['$props']> = {}) {
  return mountWithArco(StatsBar, {
    props: {
      stats,
      filteredStats: null,
      filtersActive: false,
      trend,
      loading: false,
      ...overrides,
    },
  });
}

describe('StatsBar', () => {
  it('renders 8 metric cards, including 完成率 (P1-06) and 词元用量 (P2-03)', () => {
    const wrapper = mountBar();
    const labels = wrapper.findAll('.stat-label').map((node) => node.text());
    expect(labels).toEqual(['任务总数', '待认领', '进行中', '已完成', '完成率', '已逾期', '词元用量', '累计消费']);
    expect(wrapper.text()).toContain('20%');
  });

  it('shows the filtered result with an explicit note (P1-02)', () => {
    const filtered: TaskStats = {
      total: 1,
      todo: 1,
      inProgress: 0,
      done: 0,
      doneRate: 0,
      overdue: 0,
      tokens: 3200,
      cost: 0.32,
    };
    const wrapper = mountBar({ filteredStats: filtered, filtersActive: true });
    expect(wrapper.find('.stats-filter-note').exists()).toBe(true);
    expect(wrapper.find('.stats-filter-note').text()).toContain('当前为筛选结果');
    expect(wrapper.find('.stats-filter-note').text()).toContain('全部任务 5 条');
    expect(wrapper.findAll('.stat-value').map((node) => node.text())).toEqual([
      '1',
      '1',
      '0',
      '0',
      '0%',
      '0',
      '3.2k',
      '¥0.32',
    ]);
    // 筛选时全局趋势不展示，避免误导
    expect(wrapper.find('.stat-spark').exists()).toBe(false);
  });

  it('uses non-success colors for cost growth (P2-02): success only for task count', () => {
    const wrapper = mountBar();
    const cards = wrapper.findAll('.stat-card');
    const totalCard = cards[0]!;
    const tokenCard = cards[6]!;
    const costCard = cards[7]!;
    expect(totalCard.find('.stat-delta b').classes()).toContain('delta--success');
    expect(tokenCard.find('.stat-delta b').classes()).toContain('delta--neutral');
    expect(costCard.find('.stat-delta b').classes()).toContain('delta--warning');
    // 费用上涨文案只保留一个符号（不能出现 ++¥2.42）
    expect(costCard.find('.stat-delta b').text()).toBe('+¥2.45');
  });

  it('does not draw a fake sparkline when there is no trend data', () => {
    const emptyTrend: StatsTrend = {
      days: 14,
      points: Array.from({ length: 14 }, (_, index) => ({
        date: `2026-10-${String(index + 1).padStart(2, '0')}`,
        created: 0,
        tokens: 0,
        cost: 0,
      })),
    };
    const wrapper = mountBar({ trend: emptyTrend });
    expect(wrapper.find('.stat-spark').exists()).toBe(false);
    expect(wrapper.find('.stat-delta').exists()).toBe(false);
  });
});
