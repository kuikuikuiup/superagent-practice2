<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Task, TaskStatus } from '../api/types';
import { STATUS_OPTIONS } from '../utils/labels';
import { PRIORITY_LABELS, PRIORITY_TAG_COLORS } from '../utils/labels';
import { classifyDue, formatDueDate } from '../utils/dueDate';

const props = defineProps<{
  task: Task;
}>();

const emit = defineEmits<{
  (e: 'open', task: Task): void;
  (e: 'edit', task: Task): void;
  (e: 'delete', task: Task): void;
  (e: 'move', payload: { id: string; status: TaskStatus }): void;
}>();

const due = computed(() => classifyDue(props.task.dueDate, props.task.status));
const priorityLabel = computed(() => PRIORITY_LABELS[props.task.priority]);
const priorityColor = computed(() => PRIORITY_TAG_COLORS[props.task.priority]);

// “移至” a-select 为受控组件：变更后立即用 key 强制重挂，视觉回滚到当前状态，
// 等成功变更重新拉取后再展示新状态；失败时保证不会停留在未生效的值上。
const selectTick = ref(0);

function onDragStart(event: DragEvent): void {
  if (event.dataTransfer) {
    event.dataTransfer.setData('text/plain', props.task.id);
    event.dataTransfer.effectAllowed = 'move';
  }
}

function onMove(value: unknown): void {
  const status = typeof value === 'string' ? (value as TaskStatus) : null;
  if (status === null || status === props.task.status) return;
  emit('move', { id: props.task.id, status });
  selectTick.value += 1;
}
</script>

<template>
  <article class="card" draggable="true" @dragstart="onDragStart">
    <div class="card-tags">
      <a-tag :color="priorityColor" size="small" class="card-priority">{{ priorityLabel }}</a-tag>
      <a-tag v-if="due.isOverdue" color="red" size="small" class="card-overdue">
        <template #icon><icon-exclamation-circle /></template>
        已逾期
      </a-tag>
    </div>

    <button type="button" class="card-title" :title="props.task.title" @click="emit('open', props.task)">
      {{ props.task.title }}
    </button>

    <p v-if="props.task.description" class="card-desc">{{ props.task.description }}</p>

    <div class="card-footer">
      <span v-if="due.kind !== 'none'" class="due" :class="`due--${due.kind}`">
        <icon-calendar />
        <span>{{ formatDueDate(props.task.dueDate ?? '') }}</span>
      </span>

      <span class="card-move">
        <span class="card-move-label">移至</span>
        <a-select
          :key="selectTick"
          class="card-move-select"
          size="mini"
          :bordered="false"
          :model-value="props.task.status"
          aria-label="移至其他状态"
          @change="onMove"
        >
          <a-option v-for="option in STATUS_OPTIONS" :key="option.value" :value="option.value">
            {{ option.label }}
          </a-option>
        </a-select>
      </span>

      <a-popconfirm content="删除该任务？" type="warning" @ok="emit('delete', props.task)">
        <a-button size="mini" type="text" class="card-icon-btn card-icon-btn--danger" aria-label="删除任务">
          <template #icon><icon-delete /></template>
        </a-button>
      </a-popconfirm>
      <a-button
        size="mini"
        type="text"
        class="card-icon-btn"
        aria-label="编辑任务"
        @click="emit('edit', props.task)"
      >
        <template #icon><icon-edit /></template>
      </a-button>
    </div>
  </article>
</template>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  gap: var(--app-space-2);
  padding: var(--app-space-3);
  background: var(--app-card-bg);
  border: 1px solid var(--app-card-border);
  border-radius: var(--app-radius);
  cursor: grab;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.card:hover {
  border-color: var(--app-primary);
  box-shadow: var(--shadow-sm);
}

.card:active {
  cursor: grabbing;
}

.card-tags {
  display: flex;
  align-items: center;
  gap: var(--app-space-1);
  min-height: 22px;
}

/* arco Tag 去边线，保持轻量小圆片视觉 */
.card-priority,
.card-overdue {
  border: none;
  margin: 0;
  font-variant-numeric: tabular-nums;
}

.card-title {
  text-align: left;
  font-size: 14px;
  font-weight: 600;
  color: var(--app-text-1);
  line-height: 1.4;
  word-break: break-word;
  overflow-wrap: anywhere;
  background: none;
  border: 0;
  padding: 0;
  margin: 0;
  cursor: pointer;
  font-family: inherit;
  border-radius: 2px;
}

.card-title:focus-visible {
  outline: 2px solid var(--app-primary);
  outline-offset: 2px;
}

.card-title:hover {
  color: var(--app-primary);
}

.card-desc {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  font-size: 13px;
  color: var(--app-text-2);
  white-space: pre-line;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.card-footer {
  display: flex;
  align-items: center;
  gap: var(--app-space-2);
  justify-content: space-between;
  margin-top: auto;
}

.card-footer .due {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

.card-move {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.card-move-select {
  min-width: 84px;
  max-width: 104px;
  flex-shrink: 1;
}

.due {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--app-text-2);
  flex-shrink: 0;
}

.due--soon {
  color: var(--app-warning);
}

.due--overdue {
  color: var(--app-danger);
  font-weight: 500;
}

.card-move {
  display: inline-flex;
  align-items: center;
  gap: var(--app-space-1);
  margin-left: auto;
  flex-shrink: 0;
}

.card-move-label {
  font-size: 12px;
  color: var(--app-text-3);
  white-space: nowrap;
}


.card-move-select :deep(.arco-select-view-value) {
  font-size: 12px;
}

.card-icon-btn {
  color: var(--app-text-3);
  flex-shrink: 0;
}

.card-icon-btn--danger :deep(.arco-btn-icon),
.card-icon-btn--danger :deep(.arco-icon) {
  color: inherit;
}

.card-icon-btn:hover {
  color: var(--app-text-2);
  background: var(--app-muted-bg-strong);
}

.card-icon-btn--danger:hover {
  color: var(--app-danger);
  background: var(--app-danger-soft);
}
</style>

<style>
/* arco Select 等多根组件无法继承父组件的 scoped 属性，
   对其根节点的覆盖样式必须使用全局选择器（类名仍为本组件独有）。 */
.card-move .arco-select.card-move-select {
  min-width: 84px;
  max-width: 104px;
}
</style>
