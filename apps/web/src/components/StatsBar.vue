<script setup lang="ts">
import { computed } from 'vue';
import {
  IconApps,
  IconSchedule,
  IconPlayCircle,
  IconCheckCircle,
  IconBarChart,
  IconExclamationCircle,
} from '@arco-design/web-vue/es/icon';
import type { Component } from 'vue';
import type { TaskStats } from '../api/types';
import { formatDoneRate } from '../utils/format';

const props = defineProps<{
  stats: TaskStats | null;
  loading: boolean;
}>();

interface StatCard {
  key: string;
  label: string;
  value: string | number;
  tone: 'neutral' | 'primary' | 'success' | 'danger';
  icon: Component;
}

const cards = computed<StatCard[]>(() => {
  const s = props.stats;
  return [
    { key: 'total', label: '任务总数', value: s ? s.total : '—', tone: 'neutral', icon: IconApps },
    { key: 'todo', label: '待认领', value: s ? s.todo : '—', tone: 'neutral', icon: IconSchedule },
    { key: 'inProgress', label: '进行中', value: s ? s.inProgress : '—', tone: 'primary', icon: IconPlayCircle },
    { key: 'done', label: '已完成', value: s ? s.done : '—', tone: 'success', icon: IconCheckCircle },
    {
      key: 'doneRate',
      label: '完成率',
      value: s ? formatDoneRate(s.doneRate) : '—',
      tone: 'primary',
      icon: IconBarChart,
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
</script>

<template>
  <section class="stats-bar" aria-label="任务统计">
    <div v-for="card in cards" :key="card.key" class="stat-card" role="group" :aria-label="card.label">
      <span class="stat-icon" :class="`stat-icon--${card.tone}`">
        <component :is="card.icon" />
      </span>
      <div class="stat-text">
        <span class="stat-label">{{ card.label }}</span>
        <a-skeleton v-if="showSkeleton" line :animation="true" aria-hidden="true">
          <a-skeleton-shape class="stat-value-shape" shape="square" />
        </a-skeleton>
        <span v-else class="stat-value" :class="card.tone === 'danger' ? 'value--danger' : ''">
          {{ card.value }}
        </span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.stats-bar {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: var(--app-space-3);
  margin-bottom: var(--app-space-4);
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
