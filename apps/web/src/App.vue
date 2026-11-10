<script setup lang="ts">
import { computed, ref } from 'vue';
import { Message } from '@arco-design/web-vue';
import type { Task, TaskFilter, TaskInput, TaskStatus } from './api/types';
import { createDefaultFilter } from './api/types';
import { ApiError, toApiError } from './api/client';
import Board from './components/Board.vue';
import StatsBar from './components/StatsBar.vue';
import TaskDetail from './components/TaskDetail.vue';
import TaskModal from './components/TaskModal.vue';
import Toolbar from './components/Toolbar.vue';
import { useTasks } from './composables/useTasks';

const {
  filters,
  tasks,
  stats,
  trend,
  loading,
  loadError,
  actionError,
  filtersActive,
  refresh,
  clearActionError,
  createTask,
  updateTask,
  deleteTask,
  moveTask,
} = useTasks();

type ModalState = { mode: 'create' | 'edit'; task: Task | null };

const modal = ref<ModalState | null>(null);
const modalError = ref<ApiError | null>(null);
const modalSubmitting = ref(false);

const detailId = ref<string | null>(null);
const detailTask = computed<Task | null>(() => tasks.value.find((task) => task.id === detailId.value) ?? null);

const deleteCandidate = ref<Task | null>(null);
const deleteError = ref<string | null>(null);
const deleteSubmitting = ref(false);

const deleteMessage = computed(() => {
  const task = deleteCandidate.value;
  return task === null
    ? ''
    : `确认删除「${task.title}」？该操作会永久移除此任务，且无法恢复。`;
});

function openCreate(): void {
  modalError.value = null;
  modal.value = { mode: 'create', task: null };
}

function openEdit(task: Task): void {
  detailId.value = null;
  modalError.value = null;
  modal.value = { mode: 'edit', task };
}

function openDetail(task: Task): void {
  detailId.value = task.id;
}

function closeModal(): void {
  if (modalSubmitting.value) return;
  modal.value = null;
  modalError.value = null;
}

function onFiltersUpdate(next: TaskFilter): void {
  Object.assign(filters, next);
}

async function onModalSubmit(payload: TaskInput): Promise<void> {
  const state = modal.value;
  if (state === null || modalSubmitting.value) return;
  modalSubmitting.value = true;
  modalError.value = null;
  try {
    if (state.mode === 'create') {
      await createTask(payload);
      Message.success(`已创建「${payload.title}」`);
    } else if (state.task !== null) {
      await updateTask(state.task.id, payload);
      Message.success('保存成功');
    } else {
      throw new ApiError('INTERNAL_ERROR', '未找到要编辑的任务');
    }
    modal.value = null;
  } catch (error) {
    modalError.value = toApiError(error);
    Message.error(toApiError(error).message);
  } finally {
    modalSubmitting.value = false;
  }
}

async function onMove(id: string, status: TaskStatus): Promise<void> {
  const ok = await moveTask(id, status);
  if (ok) {
    Message.success('任务状态已更新');
  } else if (actionError.value !== null) {
    Message.error(actionError.value.message);
  }
}

function requestDelete(task: Task): void {
  deleteError.value = null;
  deleteCandidate.value = task;
}

function cancelDelete(): void {
  if (deleteSubmitting.value) return;
  deleteCandidate.value = null;
  deleteError.value = null;
}

async function confirmDelete(): Promise<void> {
  const task = deleteCandidate.value;
  if (task === null || deleteSubmitting.value) return;
  deleteSubmitting.value = true;
  deleteError.value = null;
  try {
    await deleteTask(task.id);
    if (detailId.value === task.id) detailId.value = null;
    if (modal.value?.mode === 'edit' && modal.value.task?.id === task.id) modal.value = null;
    deleteCandidate.value = null;
    Message.success('任务已删除');
  } catch (error) {
    deleteError.value = toApiError(error).message;
    Message.error(toApiError(error).message);
  } finally {
    deleteSubmitting.value = false;
  }
}
</script>

<template>
  <div class="app">
    <header class="app-header">
      <span class="app-logo">
        <icon-apps />
      </span>
      <div class="app-heading">
        <h1>任务看板</h1>
        <p>简洁高效的任务管理 · 数据实时同步</p>
      </div>
    </header>

    <!-- 加载失败：arco Alert，可重试/可关闭；操作失败：arco Alert 提示 -->
    <a-alert v-if="loadError !== null" type="error" class="app-alert" @close="loadError = null">
      {{ loadError.message }}
      <template #icon><icon-exclamation-circle-fill /></template>
      <template #action>
        <a-button size="mini" type="primary" class="app-alert-retry" @click="refresh">
          <template #icon><icon-refresh /></template>
          重试
        </a-button>
      </template>
    </a-alert>
    <a-alert
      v-if="actionError !== null"
      type="warning"
      class="app-alert"
      @close="clearActionError()"
    >
      {{ actionError.message }}
      <template #icon><icon-exclamation-circle /></template>
    </a-alert>

    <StatsBar :stats="stats" :trend="trend" :loading="loading" />

    <Toolbar
      :filters="filters"
      :filters-active="filtersActive"
      :loading="loading"
      @update:filters="onFiltersUpdate"
      @create="openCreate"
      @refresh="refresh"
    />

    <Board
      :tasks="tasks"
      :loading="loading"
      :filters-active="filtersActive"
      :has-tasks="stats !== null && stats.total > 0"
      @move="onMove"
      @open="openDetail"
      @edit="openEdit"
      @delete="requestDelete"
      @create="openCreate"
      @clear-filters="onFiltersUpdate(createDefaultFilter())"
    />

    <TaskModal
      v-if="modal !== null"
      :key="modal.mode === 'edit' ? modal.task?.id ?? 'edit' : 'create'"
      :mode="modal.mode"
      :task="modal.task"
      :error="modalError"
      :submitting="modalSubmitting"
      @submit="onModalSubmit"
      @close="closeModal"
    />

    <TaskDetail
      v-if="detailTask !== null"
      :task="detailTask"
      @close="detailId = null"
      @edit="openEdit"
      @delete="requestDelete"
    />

    <!-- 删除二次确认：arco Modal -->
    <a-modal
      v-if="deleteCandidate !== null"
      :visible="true"
      :width="380"
      title="删除任务"
      ok-text="确认删除"
      cancel-text="取消"
      :ok-loading="deleteSubmitting"
      :ok-button-props="{ status: 'danger' }"
      unmount-on-close
      @ok="confirmDelete"
      @cancel="cancelDelete"
      @close="cancelDelete"
    >
      <p class="app-delete-message">{{ deleteMessage }}</p>
      <p v-if="deleteError !== null" class="app-delete-error" role="alert">{{ deleteError }}</p>
    </a-modal>
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  box-sizing: border-box;
  /* 视口高度基线：看板吃掉剩余高度、列内滚动，而不是整页滚动。
     移动端回退到自然文档流（列内滚动上限由列样式控制）。 */
  height: 100vh;
  min-height: 640px;
  max-width: var(--app-max-width);
  margin: 0 auto;
  padding: var(--app-space-5) var(--app-page-pad-x) var(--app-space-5);
  overflow: hidden;
}

/* 看板占据视口剩余高度：列内滚动而非整页滚动 */
.app > * {
  flex-shrink: 0;
}

.app > :deep(.board) {
  flex: 1 1 auto;
  min-height: 0;
}

.app-header {
  display: flex;
  align-items: center;
  gap: var(--app-space-3);
  margin-bottom: var(--app-space-5);
}

.app-logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  font-size: 18px;
  color: var(--color-bg-white);
  background: var(--app-primary);
  border-radius: var(--app-radius);
}

.app-heading h1 {
  font-size: 22px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--app-text-1);
}

.app-heading p {
  font-size: 14px;
  color: var(--app-text-3);
}

.app-alert {
  margin-bottom: var(--app-space-4);
}

.app-alert-retry {
  color: var(--color-bg-white);
}

.app-alert :deep(.arco-btn-primary.app-alert-retry) {
  background: var(--app-danger);
}

.app-delete-message {
  font-size: 13px;
  color: var(--app-text-2);
  word-break: break-word;
  overflow-wrap: anywhere;
}

.app-delete-error {
  margin-top: var(--app-space-2);
  font-size: 12px;
  color: var(--app-danger);
}

@media (max-width: 575.98px) {
  .app {
    padding: var(--app-space-4) var(--app-space-3) var(--app-space-6);
  }

  .app-logo {
    width: 34px;
    height: 34px;
    font-size: 16px;
  }

  .app-header {
    margin-bottom: var(--app-space-4);
  }

  .app-heading h1 {
    font-size: 17px;
  }
}
</style>
