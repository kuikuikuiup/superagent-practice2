import { computed, onMounted, reactive, ref, watch } from 'vue';
import { ApiError, toApiError } from '../api/client';
import {
  createTask as apiCreateTask,
  deleteTask as apiDeleteTask,
  fetchStats,
  fetchTasks,
  updateTask as apiUpdateTask,
} from '../api/tasks';
import { hasActiveFilters } from '../utils/filters';
import { createDefaultFilter } from '../api/types';
import type {
  Task,
  TaskFilter,
  TaskInput,
  TaskPatch,
  TaskPriority,
  TaskStats,
  TaskStatus,
} from '../api/types';

/**
 * 看板数据同步状态机：后端为唯一数据源。
 * 任何成功变更（创建/编辑/删除/拖拽移动）后重新拉取任务列表与统计。
 */
export function useTasks() {
  const filters = reactive<TaskFilter>(createDefaultFilter());

  const tasks = ref<Task[]>([]);
  const total = ref(0);
  const stats = ref<TaskStats | null>(null);

  const loading = ref(false);
  const loadError = ref<ApiError | null>(null);
  const actionError = ref<ApiError | null>(null);

  const filtersActive = computed<boolean>(() => hasActiveFilters(filters));

  async function refresh(): Promise<void> {
    loading.value = true;
    loadError.value = null;
    try {
      const [page, nextStats] = await Promise.all([fetchTasks(filters), fetchStats()]);
      tasks.value = page.items;
      total.value = page.total;
      stats.value = nextStats;
    } catch (error) {
      loadError.value = toApiError(error);
    } finally {
      loading.value = false;
    }
  }

  let reloadTimer: ReturnType<typeof setTimeout> | undefined;
  watch(
    filters,
    (next) => {
      if (reloadTimer !== undefined) clearTimeout(reloadTimer);
      // 关键词输入做轻微防抖；其他筛选立即生效。
      const delay = next.keyword === '' ? 0 : 300;
      reloadTimer = setTimeout(() => {
        reloadTimer = undefined;
        void refresh();
      }, delay);
    },
    { deep: true },
  );

  onMounted(() => {
    void refresh();
  });

  function clearActionError(): void {
    actionError.value = null;
  }

  /** 拖拽/移至：仅 PATCH status，成功后刷新看板与统计；失败写入 actionError。 */
  async function moveTask(id: string, status: TaskStatus): Promise<boolean> {
    try {
      await apiUpdateTask(id, { status });
      actionError.value = null;
      await refresh();
      return true;
    } catch (error) {
      actionError.value = toApiError(error);
      return false;
    }
  }

  /** 创建任务；失败抛出 ApiError 供表单逐字段展示。 */
  async function createTask(input: TaskInput): Promise<void> {
    await apiCreateTask(input);
    actionError.value = null;
    await refresh();
  }

  /** 编辑任务；失败抛出 ApiError 供表单逐字段展示。 */
  async function updateTask(id: string, patch: TaskPatch): Promise<void> {
    await apiUpdateTask(id, patch);
    actionError.value = null;
    await refresh();
  }

  /** 删除任务；失败抛出 ApiError。 */
  async function deleteTask(id: string): Promise<void> {
    await apiDeleteTask(id);
    actionError.value = null;
    await refresh();
  }

  return {
    filters,
    tasks,
    total,
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
  };
}

export type { ApiError, TaskPriority };
