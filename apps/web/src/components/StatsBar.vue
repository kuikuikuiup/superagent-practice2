<script setup lang="ts">
import { computed } from 'vue';
import {
  IconApps,
  IconSchedule,
  IconPlayCircle,
  IconCheckCircle,
  IconExclamationCircle,
  IconStorage,
} from '@arco-design/web-vue/es/icon';
import type { Component } from 'vue';
import type { TaskStats, StatsTrend, TrendPoint } from '../api/types';
import { formatCost, formatTokens } from '../utils/format';

const props = defineProps<{
  stats: TaskStats | null;
  trend: StatsTrend | null;
  loading: boolean;
}>();

interface StatCard {
  key: string;
  label: string;
  value: string | number;
  tone: 'neutral' | 'primary' | 'success' | 'danger';
  /** 图标组件；传字符串时以文字图标渲染（如 ¥） */
  icon: Component | string;
}

const cards = computed<StatCard[]>(() => {
  const s = props.stats;
  return [
    { key: 'total', label: '任务总数', value: s ? s.total : '—', tone: 'neutral', icon: IconApps },
    { key: 'todo', label: '待认领', value: s ? s.todo : '—', tone: 'neutral', icon: IconSchedule },
    { key: 'inProgress', label: '进行中', value: s ? s.inProgress : '—', tone: 'primary', icon: IconPlayCircle },
    { key: 'done', label: '已完成', value: s ? s.done : '—', tone: 'success', icon: IconCheckCircle },
    {
      key: 'tokens',
      label: 'Token 用量',
      value: s ? formatTokens(s.tokens) : '—',
      tone: 'primary',
      icon: IconStorage,
    },
    {
      key: 'cost',
      label: '累计消费',
      value: s ? formatCost(s.cost) : '—',
      tone: 'success',
      icon: '¥',
    },
    {
      key: 'overdue',
      label: '已逾期',
      value: s ? s.overdue : '—',
      tone: s !== null && s.overdue > 0 ? 'danger' : 'neutral',
      icon: IconExclamationCircle,
    },
  ];
});

const showSkeleton = computed(() => props.loading && props.stats === null);

type TrendKind = 'created' | 'tokens' | 'cost';

interface CardTrend {
  delta: number;
  deltaText: string;
  deltaUp: boolean;
  bars: Array<{ height: number; current: boolean }>;
  sparkTitle: string;
}

/** 有数据指标的卡：任务总数 / Token 用量 / 累计消费 */
const cardTrends = computed<Record<string, CardTrend | null>>(() => {
  const points = props.trend?.points ?? [];
  const result: Record<string, CardTrend | null> = {};
  for (const card of cards.value) result[card.key] = null;
  if (points.length < 14) return result;

  const build = (key: string, kind: TrendKind, locale: (value: number) => string): CardTrend | null => {
    const sum = (picks: TrendPoint[]) =>
      picks.reduce((acc, point) => acc + (point[kind] ?? 0), 0);
    const last7 = sum(points.slice(-7));
    const prev7 = sum(points.slice(0, 7));
    if (last7 === 0 && prev7 === 0) return null;
    const delta = key === 'cost' ? Number((last7 - prev7).toFixed(2)) : last7 - prev7;
    const values = points.map((point) => Math.max(0, point[kind] ?? 0));
    const max = Math.max(...values, 1);
    const bars = points.map((_, index) => ({
      height: (values[index] ?? 0) === 0 ? 2 : Math.round(2 + ((values[index] ?? 0) / max) * 18),
      current: index === points.length - 1,
    }));
    const unit = kind === 'created' ? '个任务' : kind === 'tokens' ? 'tokens' : '元消费';
    const sparkTitle = `最近两周逐日新增 ${Number(sum(points).toFixed(2))} ${unit}`;
    return {
      delta,
      deltaText: delta > 0 ? `+${locale(delta)}` : locale(delta),
      deltaUp: delta > 0,
      bars,
      sparkTitle,
    };
  };

  result['total'] = build('total', 'created', (v) => `${v}`);
  result['tokens'] = build('tokens', 'tokens', (v) =>
    v > 0 ? formatTokens(v) : v < 0 ? `${formatTokens(-v)}` : String(v),
  );
  result['cost'] = build('cost', 'cost', (v) =>
    v > 0 ? formatCost(v) : v < 0 ? `-¥${formatCost(-v).slice(1)}` : formatCost(0),
  );
  return result;
});

function trendOf(key: string): CardTrend | null | undefined {
  return cardTrends.value[key];
}
</script>

<template>
  <section class="stats-bar" aria-label="任务统计">
    <div v-for="card in cards" :key="card.key" class="stat-card" role="group" :aria-label="card.label">
      <span class="stat-icon" :class="`stat-icon--${card.tone}`">
        <component :is="card.icon" v-if="typeof card.icon !== 'string'" />
        <span v-else class="stat-glyph">{{ card.icon }}</span>
      </span>
      <div class="stat-text">
        <span class="stat-label">{{ card.label }}</span>
        <a-skeleton v-if="showSkeleton" line :animation="true" aria-hidden="true">
          <a-skeleton-shape class="stat-value-shape" shape="square" />
        </a-skeleton>
        <span v-else class="stat-value" :class="card.tone === 'danger' ? 'value--danger' : ''">
          {{ card.value }}
        </span>
        <span v-if="trendOf(card.key) && !showSkeleton" class="stat-delta">
          近 7 天
          <b :class="trendOf(card.key)!.deltaUp ? 'delta-up' : ''">
            {{ trendOf(card.key)!.deltaText }}
            <icon-caret-up v-if="trendOf(card.key)!.deltaUp" />
            <icon-caret-down v-else-if="trendOf(card.key)!.delta < 0" />
          </b>
        </span>
      </div>
      <svg
        v-if="trendOf(card.key) && !showSkeleton"
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
          width="3.2"
          :height="bar.height"
          rx="1"
          :class="bar.current ? 'spark-bar spark-bar--current' : 'spark-bar'"
        />
      </svg>
    </div>
  </section>
</template>

<style scoped>
.stats-bar {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: var(--app-space-3);
  margin-bottom: var(--app-space-4);
}

@media (max-width: 1499.98px) {
  .stats-bar {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.stat-card {
  display: flex;
  align-items: center;
  gap: var(--app-space-3);
  padding: var(--app-space-4) var(--app-space-4);
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
  width: 40px;
  height: 40px;
  font-size: 18px;
  flex-shrink: 0;
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

.stat-text {
  display: flex;
  flex-direction: column;
  gap: var(--app-space-1);
  min-width: 0;
}

.stat-label {
  font-size: 13px;
  color: var(--app-text-3);
  white-space: nowrap;
}

.stat-value {
  font-size: 26px;
  font-weight: 600;
  line-height: 1.2;
  color: var(--app-text-1);
  font-variant-numeric: tabular-nums;
}

/* 逾期计数保留警示色，与图标语义一致 */
.value--danger {
  color: var(--app-danger);
}

.stat-value-shape {
  width: 64px;
  height: 30px;
}

/* 「任务总数」卡右侧的逐日新增迷你柱状图 */
.stat-spark {
  display: block;
  width: 72px;
  height: 26px;
  margin-left: auto;
  flex-shrink: 0;
}

.spark-bar {
  fill: rgb(var(--primary-6));
  opacity: 0.22;
}

.spark-bar--current {
  fill: rgb(var(--primary-6));
  opacity: 0.9;
}

/* 近 7 天环比小字：仅在有趋势数据时出现于「任务总数」卡 */
.stat-delta {
  font-size: 12px;
  color: var(--app-text-3);
  white-space: nowrap;
}

.stat-delta b {
  font-weight: 500;
  color: var(--app-text-1);
  font-variant-numeric: tabular-nums;
}

.stat-delta b.delta-up {
  color: var(--app-success);
}

@media (min-width: 1500px) {
  .stats-bar {
    gap: var(--app-space-4);
  }

  .stat-card {
    padding: var(--app-space-5) var(--app-space-4);
  }
}

@media (max-width: 991.98px) {
  .stats-bar {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 575.98px) {
  .stats-bar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .stat-card {
    padding: var(--app-space-3) var(--app-space-3);
    gap: var(--app-space-2);
  }

  .stat-icon {
    width: 34px;
    height: 34px;
    font-size: 16px;
  }

  .stat-value {
    font-size: 20px;
  }
}
</style>
