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
  // 仅在真正离开本列（非进入子元素）时取消高亮
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
    :class="{ 'column--dragover': draggingOver, 'column--empty': props.tasks.length === 0 }"
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
      <a-badge class="column-badge" :count="props.tasks.length" :max-count="99" />
    </header>

    <ul class="column-list" :class="{ 'column-list--empty': props.tasks.length === 0 }">
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

    <div v-if="props.tasks.length === 0" class="column-empty">
      <span class="column-empty-icon">
        <icon-empty />
      </span>
      <p class="column-empty-text">{{ props.emptyText }}</p>
    </div>
  </section>
</template>

<style scoped>
.column {
  display: flex;
  flex-direction: column;
  gap: var(--app-space-3);
  min-height: 280px;
  padding: var(--app-space-4);
  background: var(--app-muted-bg);
  border: 1px solid var(--app-card-border);
  border-radius: var(--app-radius);
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

/* 高度由网格行高（视口剩余空间）决定：任务多时列内滚动 */
.column {
  height: 100%;
  min-height: 280px;
}

.column--dragover {
  border-color: var(--app-primary);
  background: var(--app-primary-light);
  box-shadow: var(--shadow-sm);
}

.column-header {
  display: flex;
  align-items: center;
  gap: var(--app-space-2);
}

.column-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.column-dot--todo {
  background: var(--app-text-3);
}

.column-dot--in_progress {
  background: var(--app-primary);
}

.column-dot--done {
  background: var(--app-success);
}

.column-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--app-text-1);
  letter-spacing: 0.02em;
}

/* arco Badge 计数，弱化为中性灰（避免每列一串红色徽标喧宾夺主） */
.column-badge :deep(.arco-badge-number) {
  background: var(--app-muted-bg-strong);
  color: var(--app-text-2);
  font-variant-numeric: tabular-nums;
}

.column-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--app-space-3);
  min-height: 0;
  overflow-y: auto;
  padding-right: 2px;
}

.column-list::-webkit-scrollbar {
  width: 6px;
}

.column-list::-webkit-scrollbar-thumb {
  background: var(--app-muted-bg-strong);
  border-radius: 3px;
}

.column-list::-webkit-scrollbar-thumb:hover {
  background: var(--app-border-strong);
}

.column-list--empty {
  flex: none;
  min-height: 0;
  overflow: hidden;
}

/* 移动端单列布局：列高自适应视口剩余空间，任务多时列内滚动 */
@media (max-width: 991.98px) {
  .column-list {
    max-height: 68vh;
  }
}

.column-item {
  display: block;
}

/* 空列去外框：空态在剩余列高内上下居中 */
.column--empty {
  min-height: 240px;
}

.column-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--app-space-2);
  padding: var(--app-space-3) 0;
}

.column-empty-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  font-size: 20px;
  color: var(--app-text-3);
  background: var(--app-muted-bg-strong);
  border-radius: 50%;
}

.column-empty-text {
  font-size: 13px;
  color: var(--app-text-3);
}
</style>
