<script setup lang="ts">
import { computed, ref } from 'vue';
import type { SortOrder, TaskFilter, TaskPriority, SortField, TaskStatus } from '../api/types';
import { createDefaultFilter, TASK_STATUSES, TASK_PRIORITIES, SORT_FIELDS, SORT_ORDERS } from '../api/types';
import {
  PRIORITY_FILTER_OPTIONS,
  SORT_FIELD_LABELS,
  STATUS_FILTER_OPTIONS,
  sortOrderLabel,
} from '../utils/labels';
import { withSortChange } from '../utils/filters';

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

/** 窄屏下筛选控件默认收起，点「筛选」展开，避免首屏被筛选区占满。 */
const filtersOpen = ref(false);

function set<K extends keyof TaskFilter>(key: K, value: TaskFilter[K]): void {
  emit('update:filters', { ...props.filters, [key]: value });
}

function onKeywordInput(value: string | undefined): void {
  set('keyword', value ?? '');
}

function onStatusChange(value: unknown): void {
  const normalized =
    typeof value === 'string' && (TASK_STATUSES as readonly string[]).includes(value) ? value : '';
  set('status', normalized as TaskStatus | '');
}

function onPriorityChange(value: unknown): void {
  const normalized =
    typeof value === 'string' && (TASK_PRIORITIES as readonly string[]).includes(value) ? value : '';
  set('priority', normalized as TaskPriority | '');
}

function onSortChange(value: unknown): void {
  const normalized =
    typeof value === 'string' && (SORT_FIELDS as readonly string[]).includes(value) ? value : 'createdAt';
  // 按截止日期排序时默认「紧急优先」，避免已逾期任务沉底（用户仍可切换「最晚优先」）。
  emit('update:filters', withSortChange(props.filters, normalized as SortField));
}

function onOrderChange(value: unknown): void {
  const normalized = typeof value === 'string' && (SORT_ORDERS as readonly string[]).includes(value) ? value : 'desc';
  set('order', normalized as SortOrder);
}

/** 当前生效的关键词/状态/优先级筛选个数，用于窄屏「筛选」按钮上的角标。 */
const activeFilterCount = computed(() => {
  let count = 0;
  if (props.filters.keyword.trim() !== '') count += 1;
  if (props.filters.status !== '') count += 1;
  if (props.filters.priority !== '') count += 1;
  return count;
});

/** 默认排序即为清除（createdAt + desc）；有关键词/状态/优先级筛选时也显示清除按钮。 */
const canClear = computed(() => {
  if (props.filtersActive) return true;
  return props.filters.sort !== 'createdAt' || props.filters.order !== 'desc';
});

/** 输入关键词后的防抖请求进行中：给出「正在筛选」的即时反馈。 */
const showFiltering = computed(() => props.loading && props.filtersActive);
</script>

<template>
  <section class="toolbar" aria-label="任务筛选与操作">
    <div class="toolbar-main">
      <a-input
        class="toolbar-search"
        placeholder="搜索标题或描述…"
        allow-clear
        :model-value="props.filters.keyword === '' ? undefined : props.filters.keyword"
        @input="onKeywordInput"
        @clear="onKeywordInput('')"
      />
      <span v-if="showFiltering" class="toolbar-filtering" role="status">筛选中…</span>

      <a-button
        class="toolbar-filter-toggle"
        :type="filtersOpen || props.filtersActive ? 'primary' : 'secondary'"
        :aria-expanded="filtersOpen"
        @click="filtersOpen = !filtersOpen"
      >
        <template #icon><icon-filter /></template>
        筛选
        <span v-if="activeFilterCount > 0" class="toolbar-filter-count">{{ activeFilterCount }}</span>
      </a-button>
    </div>

    <div class="toolbar-group" :class="{ 'toolbar-group--open': filtersOpen }">
      <a-select
        class="toolbar-select toolbar-select--status"
        :model-value="props.filters.status === '' ? 'all' : props.filters.status"
        aria-label="状态筛选"
        @change="onStatusChange"
      >
        <a-option v-for="option in STATUS_FILTER_OPTIONS" :key="option.value" :value="option.value">
          {{ option.label }}
        </a-option>
      </a-select>

      <a-select
        class="toolbar-select toolbar-select--priority"
        :model-value="props.filters.priority === '' ? 'all' : props.filters.priority"
        aria-label="优先级筛选"
        @change="onPriorityChange"
      >
        <a-option v-for="option in PRIORITY_FILTER_OPTIONS" :key="option.value" :value="option.value">
          {{ option.label }}
        </a-option>
      </a-select>

      <a-select
        class="toolbar-select toolbar-select--sort"
        :model-value="props.filters.sort"
        aria-label="排序字段"
        @change="onSortChange"
      >
        <a-option v-for="field in SORT_FIELDS" :key="field" :value="field">
          {{ SORT_FIELD_LABELS[field] }}
        </a-option>
      </a-select>

      <a-select
        class="toolbar-select toolbar-select--order"
        :model-value="props.filters.order"
        aria-label="排序方向"
        @change="onOrderChange"
      >
        <a-option v-for="order in SORT_ORDERS" :key="order" :value="order">
          {{ sortOrderLabel(props.filters.sort, order) }}
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
  margin-bottom: var(--app-space-3);
}

.toolbar-main {
  display: flex;
  align-items: center;
  gap: var(--app-space-2);
  flex: 1 1 auto;
  min-width: 0;
}

.toolbar-search {
  width: 300px;
  max-width: 100%;
}

/* 窄屏「筛选」开关，桌面端隐藏 */
.toolbar-filter-toggle {
  display: none;
  flex-shrink: 0;
}

.toolbar-filter-count {
  margin-left: 4px;
  font-variant-numeric: tabular-nums;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: var(--app-space-2);
  flex-wrap: wrap;
  flex-shrink: 0;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: var(--app-space-2);
  flex-shrink: 0;
}

.toolbar-filtering {
  font-size: 12px;
  color: var(--app-text-3);
  white-space: nowrap;
}

.toolbar-clear {
  color: var(--app-text-3);
}

/* 中等宽度（如 1024×768）：收窄搜索框，保证筛选控件与操作按钮停在同一行 */
@media (min-width: 576px) and (max-width: 1199.98px) {
  .toolbar-search {
    width: 200px;
  }
}

@media (min-width: 1440px) {
  .toolbar-search {
    width: 360px;
  }
}

@media (max-width: 575.98px) {
  .toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: var(--app-space-2);
  }

  .toolbar-main {
    flex: none;
  }

  .toolbar-search {
    flex: 1 1 auto;
    width: auto;
    min-width: 0;
  }

  .toolbar-filter-toggle {
    display: inline-flex;
  }

  .toolbar-group {
    display: none;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--app-space-2);
  }

  .toolbar-group--open {
    display: grid;
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
  width: 128px;
}

.toolbar-group .arco-select.toolbar-select--priority {
  width: 136px;
}

.toolbar-group .arco-select.toolbar-select--sort {
  width: 132px;
}

.toolbar-group .arco-select.toolbar-select--order {
  width: 112px;
}

@media (max-width: 575.98px) {
  .toolbar-group .arco-select.toolbar-select--status,
  .toolbar-group .arco-select.toolbar-select--priority,
  .toolbar-group .arco-select.toolbar-select--sort,
  .toolbar-group .arco-select.toolbar-select--order {
    width: 100%;
  }

  .toolbar-group .arco-btn.toolbar-clear {
    grid-column: 1 / -1;
  }
}
</style>
