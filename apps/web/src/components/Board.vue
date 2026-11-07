<script setup lang="ts">
import { computed } from 'vue';
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

function onDropStatus(status: TaskStatus, event: DragEvent): void {
  const id = event.dataTransfer?.getData('text/plain');
  if (!id) return;
  emit('move', id, status);
}
</script>

<template>
  <section class="board" aria-label="任务看板">
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
.board-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--app-space-4);
  align-items: start;
}

@media (min-width: 1440px) {
  .board-grid {
    gap: var(--app-space-5);
  }
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

@media (max-width: 991.98px) {
  .board-grid {
    grid-template-columns: 1fr;
  }
}
</style>
