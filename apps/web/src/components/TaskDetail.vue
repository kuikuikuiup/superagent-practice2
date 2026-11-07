<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue';
import Icon from './Icon.vue';
import type { Task } from '../api/types';
import { PRIORITY_LABELS, STATUS_LABELS } from '../utils/labels';
import { classifyDue } from '../utils/dueDate';
import { formatDateTime } from '../utils/format';

const props = defineProps<{
  task: Task;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'edit', task: Task): void;
  (e: 'delete', task: Task): void;
}>();

const due = computed(() => classifyDue(props.task.dueDate, props.task.status));
const description = computed(() => (props.task.description.trim() === '' ? '（暂无描述）' : props.task.description));

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') emit('close');
}

onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
  <div class="drawer-overlay" @click.self="emit('close')">
    <aside class="drawer" role="dialog" aria-modal="true" aria-label="任务详情">
      <header class="drawer-header">
        <span class="drawer-kicker">任务详情</span>
        <button type="button" class="icon-btn" aria-label="关闭详情" @click="emit('close')">
          <Icon name="x" :size="18" />
        </button>
      </header>

      <h2 class="drawer-title">{{ props.task.title }}</h2>

      <div class="drawer-tags">
        <span class="status-tag" :data-status="props.task.status">{{ STATUS_LABELS[props.task.status] }}</span>
        <span class="priority-tag" :class="`priority--${props.task.priority}`">
          {{ PRIORITY_LABELS[props.task.priority] }}
        </span>
        <span v-if="due.isOverdue" class="overdue-tag">
          <Icon name="alert" :size="12" />
          <span>已逾期</span>
        </span>
      </div>

      <div class="drawer-list">
        <div class="drawer-field">
          <span class="drawer-label">截止日期</span>
          <span v-if="props.task.dueDate" class="drawer-value" :class="`due--${due.kind}`">
            {{ props.task.dueDate }}
            <em v-if="due.kind === 'soon'" class="due-note">（临近截止）</em>
          </span>
          <span v-else class="drawer-value">—（未设置）</span>
        </div>
        <div class="drawer-field">
          <span class="drawer-label">创建时间</span>
          <span class="drawer-value">{{ formatDateTime(props.task.createdAt) }}</span>
        </div>
        <div class="drawer-field">
          <span class="drawer-label">更新时间</span>
          <span class="drawer-value">{{ formatDateTime(props.task.updatedAt) }}</span>
        </div>
        <div class="drawer-field">
          <span class="drawer-label">描述</span>
          <p class="drawer-value drawer-desc">{{ description }}</p>
        </div>
      </div>

      <footer class="drawer-footer">
        <button type="button" class="btn btn-primary" @click="emit('edit', props.task)">
          <Icon name="edit" :size="16" />
          编辑
        </button>
        <button type="button" class="btn btn-danger" @click="emit('delete', props.task)">
          <Icon name="trash" :size="16" />
          删除
        </button>
      </footer>
    </aside>
  </div>
</template>

<style scoped>
.drawer-overlay {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: flex;
  justify-content: flex-end;
  background: rgba(29, 33, 41, 0.45);
}

.drawer {
  display: flex;
  flex-direction: column;
  width: min(420px, 100%);
  height: 100%;
  padding: 24px;
  overflow-y: auto;
  background: var(--color-surface);
  box-shadow: var(--shadow-md);
  animation: drawer-in 0.18s ease-out;
}

@keyframes drawer-in {
  from {
    transform: translateX(24px);
    opacity: 0.4;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.drawer-kicker {
  font-size: 12px;
  color: var(--color-text-muted);
  letter-spacing: 1px;
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
}

.icon-btn:hover {
  background: var(--color-surface-muted);
  color: var(--color-text);
}

.drawer-title {
  margin-top: 8px;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.4;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.drawer-tags {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  flex-wrap: wrap;
}

.status-tag {
  font-size: 12px;
  line-height: 20px;
  padding: 0 8px;
  border-radius: 999px;
  font-weight: 500;
}

.status-tag[data-status='todo'] {
  color: var(--color-text-secondary);
  background: var(--color-surface-muted);
}

.status-tag[data-status='in_progress'] {
  color: var(--color-primary);
  background: var(--color-primary-soft);
}

.status-tag[data-status='done'] {
  color: var(--color-success);
  background: var(--color-success-soft);
}

.priority-tag {
  font-size: 12px;
  line-height: 20px;
  padding: 0 8px;
  border-radius: 999px;
  font-weight: 500;
}

.priority--high {
  color: var(--color-danger);
  background: var(--color-danger-soft);
}

.priority--medium {
  color: var(--color-warning);
  background: var(--color-warning-soft);
}

.priority--low {
  color: var(--color-success);
  background: var(--color-success-soft);
}

.overdue-tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  line-height: 20px;
  padding: 0 8px;
  border-radius: 999px;
  font-weight: 500;
  color: var(--color-danger);
  background: var(--color-danger-soft);
}

.drawer-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 22px;
  border-top: 1px solid var(--color-border);
  padding-top: 18px;
}

.drawer-field {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.drawer-label {
  font-size: 12px;
  color: var(--color-text-muted);
}

.drawer-value {
  font-size: 13px;
  color: var(--color-text);
  white-space: pre-wrap;
}

.due-note {
  font-style: normal;
  color: var(--color-warning);
}

.due--soon {
  color: var(--color-warning);
}

.due--overdue {
  color: var(--color-danger);
}

.drawer-desc {
  white-space: pre-wrap;
  font-size: 13px;
  color: var(--color-text-secondary);
  word-break: break-word;
  overflow-wrap: anywhere;
}

.drawer-footer {
  display: flex;
  gap: 10px;
  margin-top: auto;
  padding-top: 24px;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 16px;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
}

.btn-primary {
  background: var(--color-primary);
  color: #FFFFFF;
}

.btn-primary:hover {
  background: var(--color-primary-hover);
}

.btn-danger {
  color: var(--color-danger);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
}

.btn-danger:hover {
  background: var(--color-danger-soft);
  border-color: var(--color-danger);
}
</style>
