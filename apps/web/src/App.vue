<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Task, TaskFilter, TaskInput, TaskStatus } from './api/types';
import { createDefaultFilter } from './api/types';
import { ApiError, toApiError } from './api/client';
import Board from './components/Board.vue';
import ConfirmDialog from './components/ConfirmDialog.vue';
import ErrorBanner from './components/ErrorBanner.vue';
import Icon from './components/Icon.vue';
import StatsBar from './components/StatsBar.vue';
import TaskDetail from './components/TaskDetail.vue';
import TaskModal from './components/TaskModal.vue';
import Toolbar from './components/Toolbar.vue';
import { useTasks } from './composables/useTasks';

const {
  filters,
  tasks,
  stats,
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
    } else if (state.task !== null) {
      await updateTask(state.task.id, payload);
    } else {
      throw new ApiError('INTERNAL_ERROR', '未找到要编辑的任务');
    }
    modal.value = null;
  } catch (error) {
    modalError.value = toApiError(error);
  } finally {
    modalSubmitting.value = false;
  }
}

async function onMove(id: string, status: TaskStatus): Promise<void> {
  await moveTask(id, status);
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
  } catch (error) {
    deleteError.value = toApiError(error).message;
  } finally {
    deleteSubmitting.value = false;
  }
}
</script>

<template>
  <div class="app">
    <header class="app-header">
      <span class="app-logo">
        <Icon name="columns" :size="20" />
      </span>
      <div class="app-heading">
        <h1>任务看板</h1>
        <p>简洁高效的任务管理 · 数据实时同步</p>
      </div>
    </header>

    <ErrorBanner
      v-if="actionError !== null"
      :message="actionError.message"
      dismissible
      @dismiss="clearActionError"
    />
    <ErrorBanner
      v-if="loadError !== null"
      :message="loadError.message"
      retryable
      dismissible
      @retry="refresh"
      @dismiss="clearActionError(); loadError = null"
    />

    <StatsBar :stats="stats" :loading="loading" />

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

    <ConfirmDialog
      v-if="deleteCandidate !== null"
      title="删除任务"
      :message="deleteMessage"
      :error="deleteError"
      :loading="deleteSubmitting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

<style scoped>
.app {
  max-width: 1440px;
  margin: 0 auto;
  padding: 24px 32px 48px;
}

.app-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.app-logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  color: #FFFFFF;
  background: var(--color-primary);
  border-radius: var(--radius-md);
}

.app-heading h1 {
  font-size: 20px;
  font-weight: 600;
  line-height: 1.3;
}

.app-heading p {
  font-size: 13px;
  color: var(--color-text-muted);
}

@media (max-width: 575.98px) {
  .app {
    padding: 16px 12px 32px;
  }

  .app-header {
    margin-bottom: 14px;
  }

  .app-heading h1 {
    font-size: 17px;
  }
}
</style>
