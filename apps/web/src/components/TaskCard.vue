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

// 拖拽时的半透明占位反馈（dragend 兜底恢复）
const isDragging = ref(false);

// “移至” a-select 为受控组件：变更后立即用 key 强制重挂，视觉回滚到当前状态，
// 等成功变更重新拉取后再展示新状态；失败时保证不会停留在未生效的值上。
const selectTick = ref(0);

function onDragStart(event: DragEvent): void {
  if (event.dataTransfer) {
    event.dataTransfer.setData('text/plain', props.task.id);
    event.dataTransfer.effectAllowed = 'move';
  }
  isDragging.value = true;
}

function onDragEnd(): void {
  isDragging.value = false;
}

function onMove(value: unknown): void {
  const status = typeof value === 'string' ? (value as TaskStatus) : null;
  if (status === null || status === props.task.status) return;
  emit('move', { id: props.task.id, status });
  selectTick.value += 1;
}

// 整卡点击打开详情；状态选择、更多操作菜单等控件区域不触发
function onCardClick(event: MouseEvent): void {
  const target = event.target instanceof Element ? event.target : null;
  if (target && target.closest('.card-move, .card-more')) return;
  emit('open', props.task);
}
</script>

<template>
  <article
    class="card"
    :class="{ 'card--dragging': isDragging }"
    draggable="true"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
    @click="onCardClick"
  >
    <div class="card-head">
      <button
        type="button"
        class="card-title"
        :title="props.task.title"
        aria-label="查看任务详情"
      >
        {{ props.task.title }}
      </button>

      <a-dropdown trigger="click" position="br">
        <a-button size="mini" type="text" class="card-more" aria-label="更多操作">
          <template #icon><icon-more /></template>
        </a-button>
        <template #content>
          <a-doption class="card-more-edit" @click="emit('edit', props.task)">
            <template #icon><icon-edit /></template>
            编辑
          </a-doption>
          <a-doption class="card-more-danger" @click="emit('delete', props.task)">
            <template #icon><icon-delete /></template>
            删除
          </a-doption>
        </template>
      </a-dropdown>
    </div>

    <p v-if="props.task.description" class="card-desc">{{ props.task.description }}</p>

    <div class="card-meta">
      <a-tag :color="priorityColor" size="small" class="card-priority">{{ priorityLabel }}</a-tag>
      <a-tag v-if="due.isOverdue" color="red" size="small" class="card-overdue">
        <template #icon><icon-exclamation-circle /></template>
        已逾期
      </a-tag>
      <span v-if="due.kind !== 'none'" class="due" :class="`due--${due.kind}`">
        <icon-calendar />
        <span>{{ formatDueDate(props.task.dueDate ?? '') }}</span>
      </span>

      <span class="card-move">
        <span class="card-move-label">移至</span>
        <a-select
          :key="selectTick"
          class="card-move-select"
          size="small"
          :model-value="props.task.status"
          aria-label="移至其他状态"
          @change="onMove"
        >
          <a-option v-for="option in STATUS_OPTIONS" :key="option.value" :value="option.value">
            {{ option.label }}
          </a-option>
        </a-select>
      </span>
    </div>
  </article>
</template>

<style scoped>
.card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--app-space-2);
  padding: var(--app-space-4);
  background: var(--app-card-bg);
  border: 1px solid var(--app-card-border);
  border-radius: var(--app-radius);
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
}

.card:hover,
.card:focus-within {
  border-color: var(--app-primary);
  box-shadow: var(--shadow-sm);
}

.card:hover .card-title {
  color: var(--app-primary);
}

.card:active {
  cursor: grabbing;
}

/* 拖拽占位：源卡片半透明，配合列高亮（column--dragover）传达落点 */
.card--dragging {
  opacity: 0.45;
}

.card-head {
  display: flex;
  align-items: flex-start;
  gap: var(--app-space-2);
}

.card-title {
  flex: 1;
  min-width: 0;
  text-align: left;
  font-size: 15px;
  font-weight: 600;
  color: var(--app-text-1);
  line-height: 1.45;
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

.card-meta {
  display: flex;
  align-items: center;
  gap: var(--app-space-2);
  min-height: 24px;
  margin-top: var(--app-space-1);
}

/* arco Tag 去边线，保持轻量小圆片视觉 */
.card-priority,
.card-overdue {
  border: none;
  margin: 0;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

.card-more {
  flex-shrink: 0;
  color: var(--app-text-3);
  width: 28px;
  min-width: 28px;
  height: 28px;
}

.card-more :deep(.arco-btn-icon),
.card-more :deep(.arco-icon) {
  color: var(--app-text-3);
}

.card-more:hover {
  background: var(--app-muted-bg-strong);
  color: var(--app-text-2);
}

.card-more:hover :deep(.arco-icon) {
  color: var(--app-text-2);
}

.due {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--app-text-2);
  flex-shrink: 0;
  white-space: nowrap;
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
  min-width: 0;
  cursor: pointer;
}

.card-move-label {
  font-size: 12px;
  color: var(--app-text-2);
  white-space: nowrap;
}

.card-move-select {
  min-width: 92px;
  max-width: 128px;
  flex-shrink: 1;
}

.card-move-select :deep(.arco-select-view-value) {
  font-size: 13px;
  color: var(--app-text-1);
}
</style>

<style>
/* arco Select 均为多根组件，
   覆盖其根节点或传送后节点的样式必须使用全局选择器（类名仍为本组件独有）。 */
.card-move .arco-select.card-move-select {
  min-width: 92px;
  max-width: 128px;
}

/* 更多操作菜单里的“删除”使用危险口径（Dropdown 内容项传送至 body，须全局选择器） */
.card-more-danger.arco-dropdown-option .arco-dropdown-option-icon {
  color: var(--app-danger);
}

.card-more-danger.arco-dropdown-option .arco-dropdown-option-content {
  color: var(--app-danger);
}

.card-more-danger.arco-dropdown-option:hover .arco-dropdown-option-content {
  color: var(--app-danger);
}

.card-more-danger.arco-dropdown-option {
  --color-text-2: var(--app-danger);
}

.card-more-danger.arco-dropdown-option:hover {
  background: var(--app-danger-soft);
  color: var(--app-danger);
}
</style>
