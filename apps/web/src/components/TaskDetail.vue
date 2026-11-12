<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import type { Task, TaskStatus } from '../api/types';
import {
  PRIORITY_LABELS,
  PRIORITY_TAG_COLORS,
  STATUS_LABELS,
  STATUS_OPTIONS,
  TOKENS_LABEL,
} from '../utils/labels';
import { classifyDue, dueKindNote } from '../utils/dueDate';
import { formatCost, formatDateTime, formatTokens } from '../utils/format';

const props = withDefaults(
  defineProps<{
    task: Task;
    /** 编辑弹窗是否正叠加在详情抽屉之上：为 true 时抽屉忽略 Esc，避免一次 Esc 连关两层。 */
    editOpen?: boolean;
  }>(),
  { editOpen: false },
);

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'edit', task: Task): void;
  (e: 'delete', task: Task): void;
  (e: 'move', id: string, status: TaskStatus): void;
}>();

/**
 * 抽屉的 Esc 关闭自行管理（a-drawer 的 esc-to-close 关闭）：
 * Arco 的弹窗栈在「编辑 Modal 关闭后立刻按 Esc」时可能仍把抽屉判为非栈顶，
 * 导致第二次 Esc 关不掉详情；这里按 editOpen 明确分层——编辑打开时 Esc 只关编辑，
 * 编辑关闭后 Esc 再关详情。
 */
function onDocumentKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Escape') return;
  if (props.editOpen) return;
  emit('close');
}
// 捕获阶段先于弹窗自身的 Esc 处理执行，保证「编辑打开时 Esc 只关编辑」的判断不被关闭顺序打乱。
onMounted(() => document.addEventListener('keydown', onDocumentKeydown, true));
onBeforeUnmount(() => document.removeEventListener('keydown', onDocumentKeydown, true));

const due = computed(() => classifyDue(props.task.dueDate, props.task.status));
/** 截止状态短文案（已逾期 / 今天到期 / 临近截止），与卡片共用同一来源，今天到期绝不写成临近截止。 */
const dueNote = computed(() => dueKindNote(due.value.kind));
const description = computed(() => props.task.description);

// 抽屉内状态下拉为受控组件：变更后立即用 key 强制重挂，视觉回滚到当前状态，
// 等 App 的 onMove 成功刷新后展示新状态；失败时不会停留在未生效的值上。
const selectTick = ref(0);

function onMove(value: unknown): void {
  const status = typeof value === 'string' ? (value as TaskStatus) : null;
  if (status === null || status === props.task.status) return;
  emit('move', props.task.id, status);
  selectTick.value += 1;
}

// 窄视口满宽抽屉，桌面端 480px 保证长标题/描述可读
const drawerWidth = typeof window !== 'undefined' && window.innerWidth <= 576 ? '100%' : 480;
</script>

<template>
  <a-drawer
    :visible="true"
    :width="drawerWidth"
    :footer="true"
    :esc-to-close="false"
    unmount-on-close
    @cancel="emit('close')"
    @close="emit('close')"
  >
    <template #title>
      <span class="drawer-kicker">任务详情</span>
    </template>

    <div class="drawer-body-inner">
      <h2 class="drawer-title">{{ props.task.title }}</h2>

      <div class="drawer-tags">
        <a-tag size="small" class="drawer-status" :data-status="props.task.status">
          {{ STATUS_LABELS[props.task.status] }}
        </a-tag>
        <a-tag size="small" :color="PRIORITY_TAG_COLORS[props.task.priority]">
          {{ PRIORITY_LABELS[props.task.priority] }}
        </a-tag>
        <a-tag v-if="due.kind === 'overdue'" color="red" size="small" class="drawer-due-overdue">
          <template #icon><icon-exclamation-circle /></template>
          已逾期
        </a-tag>
        <a-tag v-else-if="due.kind === 'today'" color="orange" size="small" class="drawer-due-today">
          <template #icon><icon-clock-circle /></template>
          今天到期
        </a-tag>

        <!-- 详情内直接改状态：成功后抽屉保持打开，状态与统计随 App 刷新同步 -->
        <span class="drawer-move">
          <span class="drawer-move-label">移至</span>
          <a-select
            :key="selectTick"
            class="drawer-move-select"
            size="small"
            :model-value="props.task.status"
            aria-label="修改任务状态"
            @change="onMove"
          >
            <a-option v-for="option in STATUS_OPTIONS" :key="option.value" :value="option.value">
              {{ option.label }}
            </a-option>
          </a-select>
        </span>
      </div>

      <section class="drawer-section">
        <h3 class="drawer-section-title">时间信息</h3>
        <div class="drawer-field">
          <span class="drawer-label">截止日期</span>
          <span
            v-if="props.task.dueDate"
            class="drawer-value drawer-priority-value drawer-due-value"
            :class="`due--${due.kind}`"
          >
            {{ props.task.dueDate }}
            <em v-if="dueNote !== ''" class="due-note" :class="`due-note--${due.kind}`">{{ dueNote }}</em>
          </span>
          <span v-else class="drawer-value drawer-value-empty">未设置截止日期</span>
        </div>
        <div class="drawer-field-row">
          <div class="drawer-field">
            <span class="drawer-label">创建时间</span>
            <span class="drawer-value">{{ formatDateTime(props.task.createdAt) }}</span>
          </div>
          <div class="drawer-field">
            <span class="drawer-label">更新时间</span>
            <span class="drawer-value">{{ formatDateTime(props.task.updatedAt) }}</span>
          </div>
        </div>
      </section>

      <section class="drawer-section">
        <h3 class="drawer-section-title">消费信息</h3>
        <div class="drawer-field-row">
          <div class="drawer-field">
            <span class="drawer-label">{{ TOKENS_LABEL }}</span>
            <span class="drawer-value drawer-consumption-value">{{ formatTokens(props.task.tokens) }}</span>
          </div>
          <div class="drawer-field">
            <span class="drawer-label">消费金额</span>
            <span class="drawer-value drawer-consumption-value">{{ formatCost(props.task.cost) }}</span>
          </div>
        </div>
      </section>

      <section class="drawer-section">
        <h3 class="drawer-section-title">描述</h3>
        <p v-if="description.trim() !== ''" class="drawer-desc">{{ description }}</p>
        <div v-else class="drawer-desc-empty">
          <span>暂无描述，可在编辑中补充说明、验收标准等。</span>
        </div>
      </section>
    </div>

    <template #footer>
      <div class="drawer-footer">
        <a-button type="primary" class="drawer-footer-edit" @click="emit('edit', props.task)">
          <template #icon><icon-edit /></template>
          编辑
        </a-button>
        <a-button status="danger" class="drawer-footer-delete" @click="emit('delete', props.task)">
          <template #icon><icon-delete /></template>
          删除
        </a-button>
      </div>
    </template>
  </a-drawer>
</template>

<style scoped>
.drawer-kicker {
  font-size: 13px;
  color: var(--app-text-3);
  letter-spacing: 1px;
}

.drawer-body-inner {
  display: flex;
  flex-direction: column;
  gap: var(--app-space-3);
}

.drawer-title {
  font-size: 20px;
  font-weight: 600;
  line-height: 1.45;
  color: var(--app-text-1);
  word-break: break-word;
  overflow-wrap: anywhere;
}

.drawer-tags {
  display: flex;
  align-items: center;
  gap: var(--app-space-2);
  flex-wrap: wrap;
}

.drawer-status {
  border: none;
}

.drawer-status[data-status='todo'] {
  color: var(--app-text-2);
  background-color: var(--app-muted-bg-strong);
}

.drawer-status[data-status='in_progress'] {
  color: var(--app-primary);
  background-color: var(--app-primary-soft);
}

.drawer-status[data-status='done'] {
  color: var(--app-success);
  background-color: var(--app-success-soft);
}

/* 详情内“移至”控件：位于标签区末尾，常驻可见 */
.drawer-move {
  display: inline-flex;
  align-items: center;
  gap: var(--app-space-1);
  margin-left: auto;
}

.drawer-move-label {
  font-size: 12px;
  color: var(--app-text-3);
  white-space: nowrap;
}

.drawer-move-select {
  min-width: 96px;
  max-width: 132px;
}

.drawer-move-select :deep(.arco-select-view-value) {
  font-size: 13px;
  color: var(--app-text-1);
}

.drawer-section {
  display: flex;
  flex-direction: column;
  gap: var(--app-space-3);
  margin-top: var(--app-space-2);
  border-top: 1px solid var(--app-card-border);
  padding-top: var(--app-space-4);
}

.drawer-section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--app-text-3);
  letter-spacing: 0.02em;
}

.drawer-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.drawer-field-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--app-space-4);
}

.drawer-label {
  font-size: 12px;
  color: var(--app-text-3);
}

.drawer-value {
  font-size: 14px;
  line-height: 1.5;
  color: var(--app-text-1);
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.drawer-priority-value {
  font-weight: 500;
}

.drawer-consumption-value {
  font-variant-numeric: tabular-nums;
}

.drawer-value-empty {
  color: var(--app-text-3);
}

/* 截止文案：标签 + 日期文字 + 说明，三者颜色语义一致 */
.due-note {
  margin-left: var(--app-space-1);
  font-style: normal;
  font-weight: 500;
  font-size: 12px;
}

.due--soon {
  color: var(--app-warning);
}

.due--soon .due-note {
  color: var(--app-warning);
}

.due--today {
  color: var(--app-warning);
}

.due--today .due-note {
  color: var(--app-warning);
}

.due--overdue {
  color: var(--app-danger);
}

.due--overdue .due-note {
  color: var(--app-danger);
}

.drawer-desc {
  font-size: 14px;
  line-height: 1.6;
  color: var(--app-text-2);
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.drawer-desc-empty {
  display: flex;
  align-items: center;
  gap: var(--app-space-2);
  padding: var(--app-space-3) var(--app-space-4);
  font-size: 13px;
  color: var(--app-text-3);
  background: var(--app-muted-bg);
  border: 1px dashed var(--app-border-strong);
  border-radius: var(--app-radius);
}

.drawer-footer {
  display: flex;
  gap: var(--app-space-2);
}

.drawer-footer-edit {
  flex: 1;
}

.drawer-footer-delete {
  flex-shrink: 0;
  color: var(--app-danger);
}

@media (max-width: 575.98px) {
  .drawer-field-row {
    grid-template-columns: 1fr;
  }

  .drawer-move {
    margin-left: 0;
    flex-basis: 100%;
    margin-top: var(--app-space-1);
  }

  .drawer-move-select {
    flex: 1;
    min-width: 0;
    max-width: none;
  }
}
</style>

<style>
/* arco Select 为多根组件，覆盖其根节点需全局选择器（类名仍为本组件独有）。 */
.drawer-move .arco-select.drawer-move-select {
  min-width: 96px;
}
</style>
