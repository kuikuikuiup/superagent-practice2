<script setup lang="ts">
import { ref } from 'vue';
import TaskCard from './TaskCard.vue';
import type { Task, TaskStatus } from '../api/types';

const props = defineProps<{
  columnKey: TaskStatus;
  title: string;
  tasks: Task[];
  emptyText: string;
}>();

const emit = defineEmits<{
  (e: 'drop-status', status: TaskStatus, event: DragEvent): void;
  (e: 'open', task: Task): void;
  (e: 'edit', task: Task): void;
  (e: 'delete', task: Task): void;
  (e: 'move', payload: { id: string; status: TaskStatus }): void;
}>();

const draggingOver = ref(false);

function onDragOver(event: DragEvent): void {
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  draggingOver.value = true;
}

function onDragLeave(event: DragEvent): void {
  // 仅在离开本列（非进入子元素）时取消高亮
  if (event.currentTarget instanceof Element && !event.currentTarget.contains(event.relatedTarget as Node)) {
    draggingOver.value = false;
  }
}

function onDrop(event: DragEvent): void {
  event.preventDefault();
  draggingOver.value = false;
  emit('drop-status', props.columnKey, event);
}
</script>

<template>
  <section
    class="column"
    :class="{ 'column--dragover': draggingOver }"
    :data-column="columnKey"
    :aria-label="props.title"
    @dragover="onDragOver"
    @dragenter="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <header class="column-header">
      <span class="column-dot" :class="`column-dot--${columnKey}`"></span>
      <h2 class="column-title">{{ props.title }}</h2>
      <span class="column-count">{{ props.tasks.length }}</span>
    </header>

    <ul class="column-list">
      <li v-for="task in props.tasks" :key="task.id" class="column-item">
        <TaskCard
          :task="task"
          @open="emit('open', $event)"
          @edit="emit('edit', $event)"
          @delete="emit('delete', $event)"
          @move="emit('move', $event)"
        />
      </li>
    </ul>

    <p v-if="props.tasks.length === 0" class="column-empty">{{ props.emptyText }}</p>
  </section>
</template>

<style scoped>
.column {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 240px;
  padding: 12px;
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.column--dragover {
  border-color: var(--color-primary);
  background: var(--color-primary-soft);
}

.column-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.column-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.column-dot--todo {
  background: var(--color-text-muted);
}

.column-dot--in_progress {
  background: var(--color-primary);
}

.column-dot--done {
  background: var(--color-success);
}

.column-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

.column-count {
  margin-left: auto;
  min-width: 22px;
  text-align: center;
  font-size: 12px;
  line-height: 20px;
  padding: 0 7px;
  border-radius: 999px;
  color: var(--color-text-secondary);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}

.column-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 96px;
}

.column-item {
  display: block;
}

.column-empty {
  display: block;
  padding: 18px 0;
  text-align: center;
  font-size: 13px;
  color: var(--color-text-muted);
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--radius-md);
}
</style>
