<script setup lang="ts">
import { computed } from 'vue';
import type { Task } from '../api/types';
import { PRIORITY_LABELS, PRIORITY_TAG_COLORS, STATUS_LABELS } from '../utils/labels';
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
</script>

<template>
  <a-drawer
    :visible="true"
    :width="420"
    :footer="true"
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
        <a-tag v-if="due.isOverdue" color="red" size="small">
          <template #icon><icon-exclamation-circle /></template>
          已逾期
        </a-tag>
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
    </div>

    <template #footer>
      <div class="drawer-footer">
        <a-button type="primary" @click="emit('edit', props.task)">
          <template #icon><icon-edit /></template>
          编辑
        </a-button>
        <a-button status="danger" @click="emit('delete', props.task)">
          <template #icon><icon-delete /></template>
          删除
        </a-button>
      </div>
    </template>
  </a-drawer>
</template>

<style scoped>
.drawer-kicker {
  font-size: 12px;
  color: var(--app-text-3);
  letter-spacing: 1px;
}

.drawer-body-inner {
  display: flex;
  flex-direction: column;
  gap: var(--app-space-2);
}

.drawer-title {
  font-size: 18px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--app-text-1);
  word-break: break-word;
  overflow-wrap: anywhere;
}

.drawer-tags {
  display: flex;
  align-items: center;
  gap: var(--app-space-1);
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

.drawer-list {
  display: flex;
  flex-direction: column;
  gap: var(--app-space-3);
  margin-top: var(--app-space-4);
  border-top: 1px solid var(--app-card-border);
  padding-top: var(--app-space-4);
}

.drawer-field {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.drawer-label {
  font-size: 12px;
  color: var(--app-text-3);
}

.drawer-value {
  font-size: 13px;
  color: var(--app-text-1);
  white-space: pre-wrap;
}

.due-note {
  font-style: normal;
  color: var(--app-warning);
}

.due--soon {
  color: var(--app-warning);
}

.due--overdue {
  color: var(--app-danger);
}

.drawer-desc {
  white-space: pre-wrap;
  font-size: 13px;
  color: var(--app-text-2);
  word-break: break-word;
  overflow-wrap: anywhere;
}

.drawer-footer {
  display: flex;
  gap: var(--app-space-2);
}
</style>
