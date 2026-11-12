<script setup lang="ts">
import { computed } from 'vue';
import {
  IconApps,
  IconSchedule,
  IconPlayCircle,
  IconCheckCircle,
  IconExclamationCircle,
  IconStorage,
  IconTrophy,
} from '@arco-design/web-vue/es/icon';
import type { Component } from 'vue';
import type { TaskStats, StatsTrend, TrendPoint } from '../api/types';
import { formatCost, formatDoneRate, formatTokens } from '../utils/format';
import { TOKENS_LABEL } from '../utils/labels';

const props = defineProps<{
  stats: TaskStats | null;
  /** 筛选生效时由当前可见任务汇总出的统计；未筛选为 null。 */
  filteredStats: TaskStats | null;
  filtersActive: boolean;
  trend: StatsTrend | null;
  loading: boolean;
}>();

type StatTone = 'neutral' | 'primary' | 'success' | 'danger' | 'warning';

interface StatCard {
  key: string;
  label: string;
  value: string | number;
  tone: StatTone;
  /** 图标组件；传字符串时以文字图标渲染（如 ¥） */
  icon: Component | string;
}

/** 筛选生效时卡片展示「当前可见任务」的统计，否则展示全局统计。 */
const currentStats = computed<TaskStats | null>(() =>
  props.filtersActive ? props.filteredStats : props.stats,
);

const cards = computed<StatCard[]>(() => {
  const s = currentStats.value;
  return [
    { key: 'total', label: '任务总数', value: s ? s.total : '—', tone: 'neutral', icon: IconApps },
    { key: 'todo', label: '待认领', value: s ? s.todo : '—', tone: 'neutral', icon: IconSchedule },
    { key: 'inProgress', label: '进行中', value: s ? s.inProgress : '—', tone: 'primary', icon: IconPlayCircle },
    { key: 'done', label: '已完成', value: s ? s.done : '—', tone: 'success', icon: IconCheckCircle },
    {
      key: 'doneRate',
      label: '完成率',
      value: s ? formatDoneRate(s.doneRate) : '—',
      tone: 'success',
      icon: IconTrophy,
    },
    {
      key: 'overdue',
      label: '已逾期',
      value: s ? s.overdue : '—',
      tone: s !== null && s.overdue > 0 ? 'danger' : 'neutral',
      icon: IconExclamationCircle,
    },
    { key: 'tokens', label: TOKENS_LABEL, value: s ? formatTokens(s.tokens) : '—', tone: 'primary', icon: IconStorage },
    { key: 'cost', label: '累计消费', value: s ? formatCost(s.cost) : '—', tone: 'neutral', icon: '¥' },
  ];
});

const showSkeleton = computed(() => props.loading && props.stats === null);

/** 筛选提示：明确区分「全局数据」与「当前筛选结果」。 */
const filterNote = computed(() => {
  if (!props.filtersActive || props.filteredStats === null) return null;
  const filtered = props.filteredStats.total;
  const all = props.stats?.total;
  return all === undefined
    ? `当前为筛选结果：${filtered} 条匹配`
    : `当前为筛选结果：${filtered} 条匹配（全部任务 ${all} 条）`;
});

type TrendKind = 'created' | 'tokens' | 'cost';

interface CardTrend {
  delta: number;
  deltaText: string;
  deltaUp: boolean;
  tone: 'success' | 'warning' | 'neutral';
  bars: Array<{ height: number; current: boolean }>;
  sparkTitle: string;
}

/** 有数据指标的卡：任务总数 / 词元用量 / 累计消费（筛选时隐藏，避免全局趋势误导）。 */
const cardTrends = computed<Record<string, CardTrend | null>>(() => {
  const result: Record<string, CardTrend | null> = {};
  for (const card of cards.value) result[card.key] = null;
  if (props.filtersActive) return result;

  const points = props.trend?.points ?? [];
  if (points.length < 14) return result;

  const build = (
    kind: TrendKind,
    formatDelta: (delta: number) => string,
    tone: CardTrend['tone'],
  ): CardTrend | null => {
    const sum = (picks: TrendPoint[]) => picks.reduce((acc, point) => acc + (point[kind] ?? 0), 0);
    const last7 = sum(points.slice(-7));
    const prev7 = sum(points.slice(0, 7));
    // 两侧都为 0 时没有真实趋势，不画「假」迷你图。
    if (last7 === 0 && prev7 === 0) return null;
    const delta = kind === 'cost' ? Number((last7 - prev7).toFixed(2)) : last7 - prev7;
    const values = points.map((point) => Math.max(0, point[kind] ?? 0));
    const max = Math.max(...values, 1);
    const bars = values.map((value, index) => ({
      height: value === 0 ? 1 : Math.max(3, Math.round((value / max) * 18)),
      current: index === points.length - 1,
    }));
    const unit = kind === 'created' ? '个任务' : kind === 'tokens' ? '词元' : '元消费';
    return {
      delta,
      deltaText: formatDelta(delta),
      deltaUp: delta > 0,
      tone,
      bars,
      sparkTitle: `最近两周逐日新增 ${Number(sum(points).toFixed(2))} ${unit}`,
    };
  };

  result['total'] = build('created', (delta) => (delta > 0 ? `+${delta}` : `${delta}`), 'success');
  result['tokens'] = build(
    'tokens',
    (delta) => (delta > 0 ? `+${formatTokens(delta)}` : delta < 0 ? `-${formatTokens(-delta)}` : '0'),
    'neutral',
  );
  result['cost'] = build(
    'cost',
    (delta) => (delta > 0 ? `+${formatCost(delta)}` : delta < 0 ? `-${formatCost(-delta)}` : formatCost(0)),
    'warning',
  );
  return result;
});

function trendOf(key: string): CardTrend | null | undefined {
  return cardTrends.value[key];
}
</script>

<template>
  <section class="stats-bar" aria-label="任务统计">
    <p v-if="filterNote !== null" class="stats-filter-note" role="status">
      <icon-filter />
      {{ filterNote }}
    </p>

    <div class="stats-grid">
      <div v-for="card in cards" :key="card.key" class="stat-card" role="group" :aria-label="card.label">
        <span class="stat-icon" :class="`stat-icon--${card.tone}`">
          <component :is="card.icon" v-if="typeof card.icon !== 'string'" />
          <span v-else class="stat-glyph">{{ card.icon }}</span>
        </span>
        <span class="stat-label">{{ card.label }}</span>

        <a-skeleton v-if="showSkeleton" line :animation="true" aria-hidden="true">
          <a-skeleton-shape class="stat-value-shape" shape="square" />
        </a-skeleton>
        <span v-else class="stat-value" :class="card.tone === 'danger' ? 'value--danger' : ''">
          {{ card.value }}
        </span>

        <div v-if="trendOf(card.key) && !showSkeleton" class="stat-foot">
          <span class="stat-delta">
            <span class="stat-delta-prefix">近 7 天 </span>
            <b :class="`delta--${trendOf(card.key)!.tone}`">
              {{ trendOf(card.key)!.deltaText }}
              <icon-caret-up v-if="trendOf(card.key)!.deltaUp" />
              <icon-caret-down v-else-if="trendOf(card.key)!.delta < 0" />
            </b>
          </span>
          <svg
            class="stat-spark"
            viewBox="0 0 70 22"
            preserveAspectRatio="none"
            role="img"
            :aria-label="trendOf(card.key)!.sparkTitle"
          >
            <title>{{ trendOf(card.key)!.sparkTitle }}</title>
            <rect
              v-for="(bar, index) in trendOf(card.key)!.bars"
              :key="index"
              :x="index * 5"
              :y="22 - bar.height"
              width="3.4"
              :height="bar.height"
              rx="1"
              :class="bar.current ? 'spark-bar spark-bar--current' : 'spark-bar'"
            />
          </svg>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.stats-bar {
  margin-bottom: var(--app-space-3);
}

/* 筛选生效时的明确标注，避免把筛选结果误读成全局数据 */
.stats-filter-note {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: var(--app-space-2);
  padding: 2px 10px;
  font-size: 12px;
  color: rgb(var(--primary-6));
  background: var(--app-primary-soft);
  border-radius: 999px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  /* 与看板列间距、工具栏间距统一为 12px 节奏 */
  gap: var(--app-space-3);
}

.stat-card {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  grid-template-rows: auto auto auto;
  align-items: center;
  column-gap: var(--app-space-2);
  row-gap: 2px;
  min-width: 0;
  padding: 8px 10px;
  background: var(--app-card-bg);
  border: 1px solid var(--app-card-border);
  border-radius: var(--app-radius);
  transition: border-color 0.15s ease;
}

.stat-card:hover {
  border-color: var(--app-border-strong);
}

/* 圆形软底图标，语义色只用于底色与图标，数值保持主文字色 */
.stat-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  font-size: 14px;
  grid-column: 1;
  grid-row: 1;
  border-radius: 50%;
  background: var(--app-muted-bg-strong);
  color: var(--app-text-2);
}

.stat-icon--primary {
  background: var(--app-primary-soft);
  color: var(--app-primary);
}

.stat-icon--success {
  background: var(--app-success-soft);
  color: var(--app-success);
}

.stat-icon--danger {
  background: var(--app-danger-soft);
  color: var(--app-danger);
}

.stat-icon--warning {
  background: var(--app-warning-soft);
  color: var(--app-warning);
}

.stat-glyph {
  font-size: 13px;
  font-weight: 600;
  line-height: 1;
}

.stat-label {
  grid-column: 2;
  grid-row: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  line-height: 1.3;
  color: var(--app-text-3);
  white-space: nowrap;
}

.stat-value {
  grid-column: 1 / -1;
  grid-row: 2;
  font-size: 20px;
  font-weight: 600;
  line-height: 1.25;
  color: var(--app-text-1);
  font-variant-numeric: tabular-nums;
}

/* 逾期计数保留警示色，与图标语义一致 */
.value--danger {
  color: var(--app-danger);
}

.stat-value-shape {
  grid-column: 1 / -1;
  grid-row: 2;
  width: 64px;
  height: 22px;
}

.stat-foot {
  display: flex;
  align-items: flex-end;
  gap: var(--app-space-2);
  min-width: 0;
  grid-column: 1 / -1;
  grid-row: 3;
}

.stat-delta {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  min-width: 0;
  font-size: 11px;
  line-height: 1.3;
  color: var(--app-text-3);
  white-space: nowrap;
}

.stat-delta b {
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

/* 上涨语义按指标区分：任务数用成功绿；词元用量中性；费用上涨用警示色，不能是「好事绿」。 */
.stat-delta b.delta--success {
  color: var(--app-success);
}

.stat-delta b.delta--neutral {
  color: var(--app-text-2);
}

.stat-delta b.delta--warning {
  color: var(--app-warning);
}

/* 迷你柱状图：14 天逐日数据，只反映真实数据（无数据时不渲染） */
.stat-spark {
  display: block;
  width: 54px;
  height: 18px;
  margin-left: auto;
  flex-shrink: 0;
}

.spark-bar {
  fill: rgb(var(--primary-6));
  opacity: 0.28;
}

.spark-bar--current {
  fill: rgb(var(--primary-6));
  opacity: 0.9;
}

/* 宽屏一行 8 张紧凑卡：为看板腾出高度，也消除第二行留白 */
@media (min-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(8, minmax(0, 1fr));
  }

  .stat-delta-prefix {
    display: none;
  }
}

@media (min-width: 1500px) {
  .stat-card {
    padding: 10px 12px;
  }
}

/* 窄屏：指标卡横向滚动一行，避免四大行统计把首屏看板挤没 */
@media (max-width: 575.98px) {
  .stats-grid {
    display: flex;
    gap: var(--app-space-2);
    overflow-x: auto;
    padding-bottom: 4px;
    scrollbar-width: thin;
  }

  .stat-card {
    flex: 0 0 128px;
  }

  .stat-spark {
    width: 42px;
  }
}
</style>
