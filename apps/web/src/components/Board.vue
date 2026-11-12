<script setup lang="ts">
import { computed, ref } from 'vue';
import BoardColumn from './BoardColumn.vue';
import type { Task, TaskStatus } from '../api/types';
import { TASK_STATUSES } from '../api/types';
import { STATUS_LABELS } from '../utils/labels';

const props = defineProps<{
  tasks: Task[];
  loading: boolean;
  filtersActive: boolean;
  hasTasks: boolean;
}>();

const emit = defineEmits<{
  (e: 'move', id: string, status: TaskStatus): void;
  (e: 'open', task: Task): void;
  (e: 'edit', task: Task): void;
  (e: 'delete', task: Task): void;
  (e: 'create'): void;
  (e: 'clear-filters'): void;
}>();

interface Column {
  key: TaskStatus;
  title: string;
  tasks: Task[];
}

const columns = computed<Column[]>(() => {
  const byStatus: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], done: [] };
  for (const task of props.tasks) byStatus[task.status].push(task);
  return TASK_STATUSES.map((status) => ({
    key: status,
    title: STATUS_LABELS[status],
    tasks: byStatus[status],
  }));
});

const emptyText = computed(() => (props.filtersActive ? '无匹配任务' : '暂无任务'));

/**
 * 拖拽状态：
 * - draggedId：dragstart 时记录的源任务 id（内存兜底，不依赖 dataTransfer 读取成功）
 * - dragOverKey：当前指针所在列，用于列高亮
 * drop / dragend 时都会清空；dragend 依赖它为 null 判断 drop 是否已处理，避免重复提交。
 */
const draggedId = ref<string | null>(null);
const dragOverKey = ref<TaskStatus | null>(null);

function isTaskStatus(value: string | null | undefined): value is TaskStatus {
  return value !== null && value !== undefined && (TASK_STATUSES as readonly string[]).includes(value);
}

function resolveColumn(target: EventTarget | null): HTMLElement | null {
  return target instanceof Element ? target.closest<HTMLElement>('.column') : null;
}

/**
 * 只有 .card 能发起拖拽（capture 阶段先于卡片自身处理）：
 * 列头「进行中 2」等文本拖拽一律 preventDefault，避免其文本被当成任务 ID 提交。
 */
function onDragStart(event: DragEvent): void {
  const card = resolveCard(event.target);
  const id = card?.dataset.taskId ?? '';
  const task = id === '' ? undefined : props.tasks.find((item) => item.id === id);
  if (card === null || task === undefined) {
    event.preventDefault();
    draggedId.value = null;
    dragOverKey.value = null;
    return;
  }
  draggedId.value = task.id;
  if (event.dataTransfer !== null) {
    event.dataTransfer.setData('text/plain', task.id);
    event.dataTransfer.effectAllowed = 'move';
  }
}

function resolveCard(target: EventTarget | null): HTMLElement | null {
  return target instanceof Element ? target.closest<HTMLElement>('.card') : null;
}

/** board 级 dragover：统一 preventDefault 允许放置，并按最近的 .column 更新高亮 */
function onDragOver(event: DragEvent): void {
  event.preventDefault();
  if (event.dataTransfer !== null) event.dataTransfer.dropEffect = 'move';
  const column = resolveColumn(event.target);
  const status = column?.dataset.column ?? null;
  dragOverKey.value = isTaskStatus(status) ? status : null;
}

/** 离开看板（而非在看板内部元素间移动）时清除列高亮 */
function onDragLeave(event: DragEvent): void {
  const board = event.currentTarget;
  if (board instanceof Node && event.relatedTarget instanceof Node && board.contains(event.relatedTarget)) {
    return;
  }
  dragOverKey.value = null;
}

/** 提交移动：未知 id、拖拽到原列（状态未变）都静默忽略，不发请求 */
function commitMove(id: string, status: TaskStatus): void {
  const task = props.tasks.find((item) => item.id === id);
  if (task === undefined || task.status === status) return;
  emit('move', id, status);
}

function onDrop(event: DragEvent): void {
  event.preventDefault();
  const id = (draggedId.value ?? event.dataTransfer?.getData('text/plain') ?? '').trim();
  // 先清空内存状态：dragend 紧随 drop 触发，据此判断 drop 已处理、无需兜底
  draggedId.value = null;
  dragOverKey.value = null;
  if (id === '') return;
  const column = resolveColumn(event.target);
  const status = column?.dataset.column ?? null;
  if (!isTaskStatus(status)) return;
  commitMove(id, status);
}

/**
 * dragend 兜底：快速拖动、松开位置偏移导致 drop 未落在看板上时，
 * 用释放点 elementFromPoint 找最近的列并提交，避免“拖了但没反应”。
 */
function onDragEnd(event: DragEvent): void {
  const id = draggedId.value;
  draggedId.value = null;
  dragOverKey.value = null;
  if (id === null) return;
  // 取消拖拽（Esc）时坐标为 0，不做兜底
  if (event.clientX <= 0 && event.clientY <= 0) return;
  const element = document.elementFromPoint(event.clientX, event.clientY);
  const column = resolveColumn(element);
  const status = column?.dataset.column ?? null;
  if (!isTaskStatus(status)) return;
  commitMove(id, status);
}
</script>

<template>
  <section
    class="board"
    aria-label="任务看板"
    @dragstart.capture="onDragStart"
    @dragover="onDragOver"
    @dragenter="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
    @dragend="onDragEnd"
  >
    <!-- 首次加载：arco Skeleton 提示三列布局骨架（比整体 Spin 更能传达版式） -->
    <div v-if="loading && tasks.length === 0" class="board-grid" aria-hidden="true">
      <div v-for="n in 3" :key="n" class="skeleton-column">
        <a-skeleton :animation="true" line>
          <a-skeleton-shape class="skeleton-column-title" shape="square" />
        </a-skeleton>
        <a-skeleton :animation="true" line>
          <a-skeleton-line class="skeleton-card" />
        </a-skeleton>
        <a-skeleton :animation="true" line>
          <a-skeleton-line class="skeleton-card" />
        </a-skeleton>
      </div>
    </div>

    <!-- 空状态：区分“没有任何任务”与“筛选后为空” -->
    <div v-else-if="tasks.length === 0" class="board-empty">
      <a-empty :description="props.filtersActive ? '没有匹配的任务' : '暂无任务'" class="board-empty-inner" />
      <p class="board-empty-text">
        {{ props.filtersActive ? '换个关键词或清除筛选，即可看到更多任务。' : '点击“新建任务”，开始整理你的日程。' }}
      </p>
      <a-button v-if="props.filtersActive" data-action="clear-filters" @click="emit('clear-filters')">
        <template #icon><icon-close /></template>
        清除筛选
      </a-button>
      <a-button v-else type="primary" data-action="create" @click="emit('create')">
        <template #icon><icon-plus /></template>
        新建任务
      </a-button>
    </div>

    <!-- 三列看板（窄屏单列纵向排列） -->
    <div v-else class="board-grid">
      <BoardColumn
        v-for="column in columns"
        :key="column.key"
        :column-key="column.key"
        :title="column.title"
        :tasks="column.tasks"
        :empty-text="emptyText"
        :drag-over="dragOverKey === column.key"
        @open="emit('open', $event)"
        @edit="emit('edit', $event)"
        @delete="emit('delete', $event)"
        @move="emit('move', $event.id, $event.status)"
      />
    </div>
  </section>
</template>

<style scoped>
.board {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.board-grid {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-template-rows: minmax(0, 1fr);
  /* 列间距统一 12px（space-3）：与指标卡、工具栏、卡片间距同一节奏；
     不再在 ≥1440px 放大到 24px，避免列间空隙明显大于其它间距。 */
  gap: var(--app-space-3);
  align-items: stretch;
}

/* 骨架占位列不参与拉伸，保持紧凑高度 */
.skeleton-column {
  align-self: start;
}

.skeleton-column {
  display: flex;
  flex-direction: column;
  gap: var(--app-space-3);
  padding: var(--app-space-3);
  background: var(--app-muted-bg);
  border: 1px solid var(--app-card-border);
  border-radius: var(--app-radius);
}

.skeleton-column-title {
  width: 72px;
  height: 18px;
}

.skeleton-card {
  height: 96px;
  width: 100%;
}

.board-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--app-space-2);
  padding: var(--app-space-7) var(--app-space-5);
  text-align: center;
  border: 1px dashed var(--app-border-strong);
  border-radius: var(--app-radius);
  color: var(--app-text-3);
}

.board-empty-inner {
  margin-bottom: var(--app-space-1);
}

.board-empty-text {
  font-size: 13px;
  color: var(--app-text-3);
}

.board-empty .arco-btn {
  margin-top: var(--app-space-2);
}

.board-empty :deep(.arco-empty-description) {
  color: var(--app-text-2);
  font-size: 15px;
}

/* 窄屏：看板退化为单列文档流，列高自适应内容、整页滚动 */
@media (max-width: 991.98px) {
  .board {
    flex: none;
    min-height: 0;
  }

  .board-grid {
    display: flex;
    flex-direction: column;
    gap: var(--app-space-3);
    flex: none;
  }

  .skeleton-column {
    align-self: stretch;
  }
}
</style>
