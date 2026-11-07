<script setup lang="ts">
import { computed } from 'vue';
import BoardColumn from './BoardColumn.vue';
import Icon from './Icon.vue';
import { STATUS_LABELS } from '../utils/labels';
import type { Task, TaskStatus } from '../api/types';
import { TASK_STATUSES } from '../api/types';

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

function onDropStatus(status: TaskStatus, event: DragEvent): void {
  const id = event.dataTransfer?.getData('text/plain');
  if (!id) return;
  emit('move', id, status);
}
</script>

<template>
  <section class="board" aria-label="任务看板">
    <!-- 首次加载骨架 -->
    <div v-if="loading && tasks.length === 0" class="board-grid" aria-hidden="true">
      <div v-for="n in 3" :key="n" class="skeleton-column">
        <span class="skeleton skeleton-column-title"></span>
        <span v-for="m in 3" :key="m" class="skeleton skeleton-card"></span>
      </div>
    </div>

    <!-- 空状态：区分“没有任何任务”与“筛选后为空” -->
    <div v-else-if="tasks.length === 0" class="board-empty">
      <span class="board-empty-icon">
        <Icon name="inbox" :size="28" />
      </span>
      <h2 class="board-empty-title">
        {{ props.filtersActive ? '没有匹配的任务' : '暂无任务' }}
      </h2>
      <p class="board-empty-text">
        {{ props.filtersActive ? '换个关键词或清除筛选，即可看到更多任务。' : '点击“新建任务”，开始整理你的日程。' }}
      </p>
      <button v-if="props.filtersActive" type="button" class="btn btn-ghost" @click="emit('clear-filters')">
        <Icon name="x" :size="16" />
        清除筛选
      </button>
      <button v-else type="button" class="btn btn-primary" @click="emit('create')">
        <Icon name="plus" :size="16" />
        新建任务
      </button>
    </div>

    <!-- 三列看板 -->
    <div v-else class="board-grid">
      <BoardColumn
        v-for="column in columns"
        :key="column.key"
        :column-key="column.key"
        :title="column.title"
        :tasks="column.tasks"
        :empty-text="emptyText"
        @drop-status="onDropStatus"
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
  /* 占位，列间距由内部控制 */
}

.board-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  align-items: start;
}

.skeleton-column {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.skeleton-column-title {
  width: 72px;
  height: 18px;
}

.skeleton-card {
  width: 100%;
  height: 96px;
  border-radius: var(--radius-md);
}

.board-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 56px 24px;
  text-align: center;
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--radius-lg);
  color: var(--color-text-muted);
}

.board-empty-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--color-surface-muted);
  color: var(--color-text-muted);
  margin-bottom: 6px;
}

.board-empty-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.board-empty-text {
  font-size: 13px;
}

.board-empty .btn {
  margin-top: 10px;
}

@media (max-width: 991.98px) {
  .board-grid {
    grid-template-columns: 1fr;
  }
}
</style>
