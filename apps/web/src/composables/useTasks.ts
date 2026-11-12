import { computed, onMounted, reactive, ref, watch } from 'vue';
import { ApiError, toApiError } from '../api/client';
import {
  createTask as apiCreateTask,
  deleteTask as apiDeleteTask,
  fetchStats,
  fetchStatsTrend,
  fetchTasks,
  updateTask as apiUpdateTask,
} from '../api/tasks';
import { hasActiveFilters } from '../utils/filters';
import { summarizeTasks } from '../utils/stats';
import { createDefaultFilter } from '../api/types';
import type {
  Task,
  TaskFilter,
  TaskInput,
  TaskPatch,
  TaskPriority,
  TaskStats,
  TaskStatus,
  StatsTrend,
} from '../api/types';

/** 关键词输入的防抖时长：足够合并连续键入，又让用户输入后立刻看到结果。 */
export const FILTER_DEBOUNCE_MS = 200;

/**
 * 看板数据同步状态机：后端为唯一数据源。
 * 任何成功变更（创建/编辑/删除/拖拽移动）后重新拉取任务列表、统计与趋势。
 */
export function useTasks() {
  const filters = reactive<TaskFilter>(createDefaultFilter());

  const tasks = ref<Task[]>([]);
  const total = ref(0);
  const stats = ref<TaskStats | null>(null);
  const trend = ref<StatsTrend | null>(null);

  const loading = ref(false);
  const loadError = ref<ApiError | null>(null);
  const actionError = ref<ApiError | null>(null);

  const filtersActive = computed<boolean>(() => hasActiveFilters(filters));

  /**
   * 筛选生效时的「当前可见任务」统计。
   * 顶部统计卡据此展示筛选结果（见 StatsBar 的筛选提示），避免与全局统计混淆。
   */
  const filteredStats = computed<TaskStats | null>(() =>
    filtersActive.value ? summarizeTasks(tasks.value) : null,
  );

  async function refresh(): Promise<void> {
    loading.value = true;
    loadError.value = null;
    try {
      const [page, nextStats, nextTrend] = await Promise.all([fetchTasks(filters), fetchStats(), fetchStatsTrend()]);
      tasks.value = page.items;
      total.value = page.total;
      stats.value = nextStats;
      trend.value = nextTrend;
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
      // 关键词输入做轻微防抖；状态/优先级/排序立即生效。
      const delay = next.keyword === '' ? 0 : FILTER_DEBOUNCE_MS;
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

  /** 拖拽/移至：仅 PATCH status，成功后刷新看板与统计；失败写入 actionError 并回源同步。 */
  async function moveTask(id: string, status: TaskStatus): Promise<boolean> {
    try {
      await apiUpdateTask(id, { status });
      actionError.value = null;
      await refresh();
      return true;
    } catch (error) {
      const cause = toApiError(error);
      // 不再向用户展示后端原始的「未找到 ID 为 xxx 的任务」；任务已不存在时提示刷新。
      actionError.value =
        cause.code === 'TASK_NOT_FOUND'
          ? new ApiError('TASK_NOT_FOUND', '任务不存在或已被删除，请刷新后重试')
          : cause;
      // 失败后与后端重新对齐，保证卡片位置与统计数据一致。
      await refresh();
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
    filteredStats,
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
  };
}

export type { ApiError, TaskPriority };
