<script setup lang="ts">
import { computed } from 'vue';
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
  tone: '' | 'primary' | 'success' | 'danger';
}

const cards = computed<StatCard[]>(() => {
  const s = props.stats;
  return [
    { key: 'total', label: '任务总数', value: s ? s.total : '—', tone: '' },
    { key: 'todo', label: '待办', value: s ? s.todo : '—', tone: '' },
    { key: 'inProgress', label: '进行中', value: s ? s.inProgress : '—', tone: 'primary' },
    { key: 'done', label: '已完成', value: s ? s.done : '—', tone: 'success' },
    { key: 'doneRate', label: '完成率', value: s ? formatDoneRate(s.doneRate) : '—', tone: 'primary' },
    { key: 'overdue', label: '已逾期', value: s ? s.overdue : '—', tone: s !== null && s.overdue > 0 ? 'danger' : '' },
  ];
});

const showSkeleton = computed(() => props.loading && props.stats === null);
</script>

<template>
  <section class="stats-bar" aria-label="任务统计">
    <div v-for="card in cards" :key="card.key" class="stat-card" role="group" :aria-label="card.label">
      <span class="stat-label">{{ card.label }}</span>
      <a-skeleton v-if="showSkeleton" line :animation="true" aria-hidden="true">
        <a-skeleton-shape class="stat-value-shape" shape="square" />
      </a-skeleton>
      <span v-else class="stat-value" :class="card.tone === '' ? '' : `value--${card.tone}`">
        {{ card.value }}
      </span>
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
  flex-direction: column;
  gap: var(--app-space-1);
  padding: var(--app-space-4);
  background: var(--app-card-bg);
  border: 1px solid var(--app-card-border);
  border-radius: var(--app-radius);
}

.stat-label {
  font-size: 13px;
  color: var(--app-text-3);
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  line-height: 1.2;
  color: var(--app-text-1);
}

.stat-value-shape {
  width: 56px;
  height: 28px;
}

.value--primary {
  color: var(--app-primary);
}

.value--success {
  color: var(--app-success);
}

.value--danger {
  color: var(--app-danger);
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

  .stat-value {
    font-size: 20px;
  }
}
</style>
