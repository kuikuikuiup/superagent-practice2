<script setup lang="ts">
import { computed } from 'vue';
import Icon from './Icon.vue';
import type { SortOrder, TaskFilter, TaskPriority, SortField, TaskStatus } from '../api/types';
import { createDefaultFilter } from '../api/types';
import { PRIORITY_OPTIONS, STATUS_OPTIONS, SORT_FIELD_OPTIONS } from '../utils/labels';

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

function onKeywordInput(event: Event): void {
  set('keyword', (event.target as HTMLInputElement).value);
}

function onStatusChange(event: Event): void {
  const value = (event.target as HTMLSelectElement).value;
  set('status', (value === '' ? '' : value) as TaskStatus | '');
}

function onPriorityChange(event: Event): void {
  const value = (event.target as HTMLSelectElement).value;
  set('priority', (value === '' ? '' : value) as TaskPriority | '');
}

function onSortChange(event: Event): void {
  set('sort', (event.target as HTMLSelectElement).value as SortField);
}

function onOrderChange(event: Event): void {
  set('order', (event.target as HTMLSelectElement).value as SortOrder);
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
      <div class="search">
        <Icon name="search" :size="16" />
        <input
          type="text"
          placeholder="搜索标题或描述…"
          aria-label="关键词搜索"
          :value="props.filters.keyword"
          @input="onKeywordInput"
        />
        <button
          v-if="props.filters.keyword !== ''"
          type="button"
          class="search-clear"
          aria-label="清空关键词"
          @click="set('keyword', '')"
        >
          <Icon name="x" :size="14" />
        </button>
      </div>

      <select class="select" aria-label="状态筛选" :value="props.filters.status" @change="onStatusChange">
        <option value="">全部状态</option>
        <option v-for="option in STATUS_OPTIONS" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>

      <select class="select" aria-label="优先级筛选" :value="props.filters.priority" @change="onPriorityChange">
        <option value="">全部优先级</option>
        <option v-for="option in PRIORITY_OPTIONS" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>

      <select class="select" aria-label="排序字段" :value="props.filters.sort" @change="onSortChange">
        <option v-for="option in SORT_FIELD_OPTIONS" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>

      <select class="select" aria-label="排序方向" :value="props.filters.order" @change="onOrderChange">
        <option value="desc">倒序</option>
        <option value="asc">正序</option>
      </select>

      <button v-if="canClear" type="button" class="clear-btn" @click="emit('update:filters', createDefaultFilter())">
        <Icon name="x" :size="14" />
        清除筛选
      </button>
    </div>

    <div class="toolbar-actions">
      <button type="button" class="btn btn-ghost" :disabled="props.loading" @click="emit('refresh')">
        <Icon name="refresh" :size="16" :class="{ spinning: props.loading }" />
        <span>刷新</span>
      </button>
      <button type="button" class="btn btn-primary" @click="emit('create')">
        <Icon name="plus" :size="16" />
        新建任务
      </button>
    </div>
  </section>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  flex: 1;
  min-width: 0;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 260px;
  max-width: 100%;
  height: 36px;
  padding: 0 10px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-muted);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.search:focus-within {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(22, 93, 255, 0.12);
}

.search input {
  flex: 1;
  min-width: 0;
  height: 100%;
  border: none;
  outline: none;
  background: transparent;
  color: var(--color-text);
}

.search input::placeholder {
  color: var(--color-text-muted);
}

.search input:focus-visible {
  outline: none;
}

.search-clear {
  display: inline-flex;
  color: var(--color-text-muted);
  border-radius: var(--radius-sm);
}

.search-clear:hover {
  color: var(--color-text-secondary);
}

.select {
  height: 36px;
  padding: 0 8px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
}

.select:hover {
  border-color: var(--color-border-strong);
}

.clear-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 36px;
  padding: 0 8px;
  font-size: 13px;
  color: var(--color-text-muted);
  border-radius: var(--radius-md);
}

.clear-btn:hover {
  color: var(--color-text-secondary);
  background: var(--color-surface-muted);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 14px;
  border-radius: var(--radius-md);
  font-weight: 500;
  font-size: 14px;
  transition: background-color 0.15s ease, border-color 0.15s ease, opacity 0.15s ease;
}

.btn-primary {
  background: var(--color-primary);
  color: #FFFFFF;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.btn-primary:active:not(:disabled) {
  background: var(--color-primary-active);
}

.btn-primary:disabled {
  opacity: 0.7;
}

.btn-ghost {
  background: var(--color-surface);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
}

.btn-ghost:hover:not(:disabled) {
  border-color: var(--color-border-strong);
  color: var(--color-text);
}

.spinning {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
