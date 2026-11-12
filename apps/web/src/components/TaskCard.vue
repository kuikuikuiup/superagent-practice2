<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Task, TaskStatus } from '../api/types';
import { PRIORITY_LABELS, PRIORITY_TAG_COLORS, STATUS_OPTIONS, TOKENS_UNIT } from '../utils/labels';
import { classifyDue, dueKindNote, formatDueDate } from '../utils/dueDate';
import { formatCost, formatTokens } from '../utils/format';

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
/** 截止状态短文案（已逾期 / 今天到期 / 临近截止），与详情页共用同一来源。 */
const dueNote = computed(() => dueKindNote(due.value.kind));
const priorityLabel = computed(() => PRIORITY_LABELS[props.task.priority]);
const priorityColor = computed(() => PRIORITY_TAG_COLORS[props.task.priority]);

// 有真实消费数据（0 不算“有数据”，避免每张卡都挂一条 0 值噪音）
const hasConsumption = computed(() => props.task.tokens > 0 || props.task.cost > 0);

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
    :data-task-id="props.task.id"
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

      <!-- 截止状态：逾期红色 / 今天到期橙色，日期文字同步警示色；临近截止仅有文字警示 -->
      <a-tag v-if="due.kind === 'overdue'" color="red" size="small" class="card-overdue">
        <template #icon><icon-exclamation-circle /></template>
        已逾期
      </a-tag>
      <a-tag v-else-if="due.kind === 'today'" color="orange" size="small" class="card-due-today">
        <template #icon><icon-clock-circle /></template>
        今天到期
      </a-tag>
      <span
        v-if="due.kind !== 'none'"
        class="due"
        :class="`due--${due.kind}`"
        :title="dueNote === '' ? '截止日期' : `${dueNote}（截止日期 ${props.task.dueDate ?? ''}）`"
      >
        <icon-calendar />
        <span>{{ formatDueDate(props.task.dueDate ?? '') }}</span>
      </span>

      <span v-if="hasConsumption" class="card-consumption">
        <span class="card-consumption-cost">{{ formatCost(props.task.cost) }}</span>
        <i class="card-consumption-sep">·</i>
        <span>{{ formatTokens(props.task.tokens) }} {{ TOKENS_UNIT }}</span>
      </span>

      <!-- 桌面端默认为克制的悬停/聚焦操作区；窄屏常驻可见（见样式） -->
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
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease, opacity 0.15s ease;
}

/* 悬停 / 键盘聚焦反馈：描边 + 浅阴影 + 1px 抬升，克制但明确可感知 */
.card:hover,
.card:focus-within {
  border-color: var(--app-primary);
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.card:hover .card-title {
  color: var(--app-primary);
}

.card:focus-within .card-title {
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
  flex-wrap: wrap;
  gap: var(--app-space-2);
  min-height: 24px;
  margin-top: var(--app-space-1);
}

/* arco Tag 去边线，保持轻量小圆片视觉 */
.card-priority,
.card-overdue,
.card-due-today {
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

/* 临近截止：日期文字用警示色（与详情页「临近截止」一致） */
.due--soon {
  color: var(--app-warning);
  font-weight: 500;
}

/* 今天到期：橙色，与「今天到期」标签同色系 */
.due--today {
  color: var(--app-warning);
  font-weight: 600;
}

/* 已逾期：红色加粗 */
.due--overdue {
  color: var(--app-danger);
  font-weight: 600;
}

/* 消费小字（¥ / 词元），与日期同一字号层级 */
.card-consumption {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--app-text-3);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  flex-shrink: 0;
}

.card-consumption-sep {
  font-style: normal;
  color: var(--app-text-3);
  opacity: 0.7;
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
  color: var(--app-text-3);
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

/*
 * 桌面端：仍保留「移至」但其显隐收敛到悬停 / 键盘聚焦 / 触屏聚焦时，
 * 避免每张卡片都挂一个常驻下拉抢占信息层级；
 * 用 opacity + pointer-events（而非 display/visibility）保证仍可 Tab 聚焦并通过 :focus-within 显现。
 */
@media (min-width: 576px) {
  .card-move {
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.15s ease;
  }

  .card:hover .card-move,
  .card:focus-within .card-move {
    opacity: 1;
    pointer-events: auto;
  }
}

/* 窄屏（<576px）：状态修改必须常驻、直接可见、不依赖拖拽或悬停 */
@media (max-width: 575.98px) {
  .card-move {
    flex-basis: 100%;
    margin-left: 0;
    margin-top: var(--app-space-1);
  }

  .card-move-select {
    flex: 1;
    min-width: 0;
    max-width: none;
  }
}
</style>

<style>
/* arco Select 均为多根组件，
   覆盖其根节点或传送后节点的样式必须使用全局选择器（类名仍为本组件独有）。 */
.card-move .arco-select.card-move-select {
  min-width: 92px;
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
