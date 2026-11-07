<script setup lang="ts">
import { computed } from 'vue';
import Icon from './Icon.vue';
import type { Task, TaskStatus } from '../api/types';
import { TASK_STATUSES } from '../api/types';
import { PRIORITY_LABELS, STATUS_LABELS } from '../utils/labels';
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

function onDragStart(event: DragEvent): void {
  if (event.dataTransfer) {
    event.dataTransfer.setData('text/plain', props.task.id);
    event.dataTransfer.effectAllowed = 'move';
  }
}

function onMove(event: Event): void {
  const target = event.target as HTMLSelectElement;
  const status = target.value as TaskStatus;
  // 先还原显示值，等待“成功变更后重新拉取”刷新；失败时保持原状态。
  target.value = props.task.status;
  emit('move', { id: props.task.id, status });
}
</script>

<template>
  <article class="card" draggable="true" @dragstart="onDragStart">
    <div class="card-tags">
      <span class="priority-tag" :class="`priority--${props.task.priority}`">{{ priorityLabel }}</span>
      <span v-if="due.isOverdue" class="overdue-tag">
        <Icon name="alert" :size="12" />
        <span>已逾期</span>
      </span>
    </div>

    <button type="button" class="card-title" :title="props.task.title" @click="emit('open', props.task)">
      {{ props.task.title }}
    </button>

    <p v-if="props.task.description" class="card-desc">{{ props.task.description }}</p>

    <div class="card-footer">
      <span
        v-if="due.kind !== 'none'"
        class="due"
        :class="`due--${due.kind}`"
      >
        <Icon name="calendar" :size="14" />
        <span>{{ formatDueDate(props.task.dueDate ?? '') }}</span>
      </span>

      <label class="move-select">
        <span class="move-label">移至</span>
        <select aria-label="移至其他状态" :value="props.task.status" @change="onMove">
          <option v-for="status in TASK_STATUSES" :key="status" :value="status">
            {{ STATUS_LABELS[status] }}
          </option>
        </select>
      </label>

      <span class="card-actions">
        <button type="button" class="icon-btn" aria-label="编辑任务" @click.stop="emit('edit', props.task)">
          <Icon name="edit" :size="15" />
        </button>
        <button
          type="button"
          class="icon-btn icon-btn--danger"
          aria-label="删除任务"
          @click.stop="emit('delete', props.task)"
        >
          <Icon name="trash" :size="15" />
        </button>
      </span>
    </div>
  </article>
</template>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: grab;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.card:hover {
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-sm);
}

.card:active {
  cursor: grabbing;
}

.card-tags {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 22px;
}

.priority-tag {
  font-size: 12px;
  line-height: 20px;
  padding: 0 8px;
  border-radius: 999px;
  font-weight: 500;
}

.priority--high {
  color: var(--color-danger);
  background: var(--color-danger-soft);
}

.priority--medium {
  color: var(--color-warning);
  background: var(--color-warning-soft);
}

.priority--low {
  color: var(--color-success);
  background: var(--color-success-soft);
}

.overdue-tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  line-height: 20px;
  padding: 0 8px;
  border-radius: 999px;
  font-weight: 500;
  color: var(--color-danger);
  background: var(--color-danger-soft);
}

.card-title {
  text-align: left;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  line-height: 1.4;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.card-title:hover {
  color: var(--color-primary);
}

.card-desc {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  font-size: 13px;
  color: var(--color-text-secondary);
  white-space: pre-line;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.card-footer {
  display: flex;
  align-items: center;
  gap: 6px;
}

.due {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.due--soon {
  color: var(--color-warning);
}

.due--overdue {
  color: var(--color-danger);
  font-weight: 500;
}

.move-select {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  flex-shrink: 0;
}

.move-label {
  font-size: 12px;
  color: var(--color-text-muted);
}

.move-select select {
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 12px;
  padding: 2px 4px;
  max-width: 84px;
}

.move-select select:hover,
.move-select select:focus-visible {
  border-color: var(--color-border-strong);
  background: var(--color-surface);
}

.card-actions {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
}

.icon-btn:hover {
  background: var(--color-surface-muted);
  color: var(--color-text-secondary);
}

.icon-btn--danger:hover {
  background: var(--color-danger-soft);
  color: var(--color-danger);
}
</style>
