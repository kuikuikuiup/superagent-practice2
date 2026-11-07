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
      <span v-if="showSkeleton" class="skeleton stat-value-skeleton" aria-hidden="true"></span>
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
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.stat-label {
  font-size: 13px;
  color: var(--color-text-muted);
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  line-height: 1.2;
  color: var(--color-text);
}

.stat-value-skeleton {
  width: 56px;
  height: 28px;
}

.value--primary {
  color: var(--color-primary);
}

.value--success {
  color: var(--color-success);
}

.value--danger {
  color: var(--color-danger);
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
