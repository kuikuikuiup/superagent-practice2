<script setup lang="ts">
import { computed } from 'vue';
import type { SortOrder, TaskFilter, TaskPriority, SortField, TaskStatus } from '../api/types';
import { createDefaultFilter, TASK_STATUSES, TASK_PRIORITIES, SORT_FIELDS, SORT_ORDERS } from '../api/types';
import { PRIORITY_LABELS, SORT_FIELD_LABELS, STATUS_LABELS } from '../utils/labels';

const props = defineProps<{
  filters: TaskFilter;
  filtersActive: boolean;
  loading: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:filters', filters: TaskFilter): void;
  (e: 'create'): void;
  (e: 'refresh'): void;
}>();

function set<K extends keyof TaskFilter>(key: K, value: TaskFilter[K]): void {
  emit('update:filters', { ...props.filters, [key]: value });
}

function onKeywordInput(value: string | undefined): void {
  set('keyword', value ?? '');
}

function onStatusChange(value: unknown): void {
  const normalized = typeof value === 'string' && (TASK_STATUSES as readonly string[]).includes(value) ? value : '';
  set('status', normalized as TaskStatus | '');
}

function onPriorityChange(value: unknown): void {
  const normalized = typeof value === 'string' && (TASK_PRIORITIES as readonly string[]).includes(value) ? value : '';
  set('priority', normalized as TaskPriority | '');
}

function onSortChange(value: unknown): void {
  const normalized =
    typeof value === 'string' && (SORT_FIELDS as readonly string[]).includes(value) ? value : 'createdAt';
  set('sort', normalized as SortField);
}

function onOrderChange(value: unknown): void {
  const normalized = typeof value === 'string' && (SORT_ORDERS as readonly string[]).includes(value) ? value : 'desc';
  set('order', normalized as SortOrder);
}

// 默认排序即为清除（createdAt + desc）；有关键词/状态/优先级筛选时也显示清除按钮。
const canClear = computed(() => {
  if (props.filtersActive) return true;
  return props.filters.sort !== 'createdAt' || props.filters.order !== 'desc';
});
</script>

<template>
  <section class="toolbar" aria-label="任务筛选与操作">
    <div class="toolbar-group">
      <a-input
        class="toolbar-search"
        placeholder="搜索标题或描述…"
        allow-clear
        :model-value="props.filters.keyword === '' ? undefined : props.filters.keyword"
        @input="onKeywordInput"
        @clear="onKeywordInput('')"
      />

      <a-select
        class="toolbar-select toolbar-select--status"
        placeholder="全部状态"
        allow-clear
        :model-value="props.filters.status === '' ? undefined : props.filters.status"
        @change="onStatusChange"
        @clear="onStatusChange('')"
      >
        <a-option v-for="status in TASK_STATUSES" :key="status" :value="status">
          {{ STATUS_LABELS[status] }}
        </a-option>
      </a-select>

      <a-select
        class="toolbar-select toolbar-select--priority"
        placeholder="全部优先级"
        allow-clear
        :model-value="props.filters.priority === '' ? undefined : props.filters.priority"
        @change="onPriorityChange"
        @clear="onPriorityChange('')"
      >
        <a-option v-for="priority in TASK_PRIORITIES" :key="priority" :value="priority">
          {{ PRIORITY_LABELS[priority] }}
        </a-option>
      </a-select>

      <a-select
        class="toolbar-select toolbar-select--sort"
        :model-value="props.filters.sort"
        @change="onSortChange"
      >
        <a-option v-for="field in SORT_FIELDS" :key="field" :value="field">
          {{ SORT_FIELD_LABELS[field] }}
        </a-option>
      </a-select>

      <a-select
        class="toolbar-select toolbar-select--order"
        :model-value="props.filters.order"
        @change="onOrderChange"
      >
        <a-option v-for="order in SORT_ORDERS" :key="order" :value="order">
          {{ order === 'desc' ? '倒序' : '正序' }}
        </a-option>
      </a-select>

      <a-button v-if="canClear" class="toolbar-clear" @click="emit('update:filters', createDefaultFilter())">
        <template #icon><icon-close /></template>
        清除筛选
      </a-button>
    </div>

    <div class="toolbar-actions">
      <a-button :loading="props.loading" @click="emit('refresh')">
        <template #icon><icon-refresh /></template>
        刷新
      </a-button>
      <a-button type="primary" @click="emit('create')">
        <template #icon><icon-plus /></template>
        新建任务
      </a-button>
    </div>
  </section>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: var(--app-space-3);
  flex-wrap: wrap;
  margin-bottom: var(--app-space-4);
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: var(--app-space-2);
  flex-wrap: wrap;
  flex: 1;
  min-width: 0;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: var(--app-space-2);
  flex-wrap: wrap;
}

.toolbar-search {
  width: 300px;
  max-width: 100%;
}

.toolbar-select--status {
  width: 116px;
}

.toolbar-select--priority {
  width: 128px;
}

.toolbar-select--sort {
  width: 132px;
}

.toolbar-select--order {
  width: 92px;
}

.toolbar-clear {
  color: var(--app-text-3);
}

@media (min-width: 1440px) {
  .toolbar-group {
    gap: var(--app-space-3);
  }

  .toolbar-search {
    width: 360px;
  }
}

@media (max-width: 575.98px) {
  .toolbar-search,
  .toolbar-select--status,
  .toolbar-select--priority,
  .toolbar-select--sort,
  .toolbar-select--order {
    width: 100%;
  }

  .toolbar-actions {
    width: 100%;
  }

  .toolbar-actions :deep(.arco-btn) {
    flex: 1;
  }
}
</style>

<style>
/* arco Select 为多根组件，类与宽度须用全局选择器固定 */
.toolbar-group .arco-select.toolbar-select--status {
  width: 116px;
}

.toolbar-group .arco-select.toolbar-select--priority {
  width: 128px;
}

.toolbar-group .arco-select.toolbar-select--sort {
  width: 132px;
}

.toolbar-group .arco-select.toolbar-select--order {
  width: 92px;
}

@media (max-width: 575.98px) {
  .toolbar-group .arco-select.toolbar-select--status,
  .toolbar-group .arco-select.toolbar-select--priority,
  .toolbar-group .arco-select.toolbar-select--sort,
  .toolbar-group .arco-select.toolbar-select--order {
    width: 100%;
  }
}
</style>
