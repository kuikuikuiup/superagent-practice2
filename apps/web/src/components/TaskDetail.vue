<script setup lang="ts">
import { computed } from 'vue';
import type { Task } from '../api/types';
import { PRIORITY_LABELS, PRIORITY_TAG_COLORS, STATUS_LABELS } from '../utils/labels';
import { classifyDue } from '../utils/dueDate';
import { formatCost, formatDateTime, formatTokens } from '../utils/format';

const props = defineProps<{
  task: Task;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'edit', task: Task): void;
  (e: 'delete', task: Task): void;
}>();

const due = computed(() => classifyDue(props.task.dueDate, props.task.status));
const description = computed(() => props.task.description);

// 窄视口满宽抽屉，桌面端 480px 保证长标题/描述可读
const drawerWidth = typeof window !== 'undefined' && window.innerWidth <= 576 ? '100%' : 480;
</script>

<template>
  <a-drawer
    :visible="true"
    :width="drawerWidth"
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

      <section class="drawer-section">
        <h3 class="drawer-section-title">时间信息</h3>
        <div class="drawer-field">
          <span class="drawer-label">截止日期</span>
          <span v-if="props.task.dueDate" class="drawer-value drawer-priority-value" :class="`due--${due.kind}`">
            {{ props.task.dueDate }}
            <em v-if="due.kind === 'soon'" class="due-note">（临近截止）</em>
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

      <section v-if="props.task.tokens > 0 || props.task.cost > 0" class="drawer-section">
        <h3 class="drawer-section-title">消费信息</h3>
        <div class="drawer-field-row">
          <div class="drawer-field">
            <span class="drawer-label">Token 用量</span>
            <span class="drawer-value">{{ formatTokens(props.task.tokens) }}</span>
          </div>
          <div class="drawer-field">
            <span class="drawer-label">消费金额</span>
            <span class="drawer-value">{{ formatCost(props.task.cost) }}</span>
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

.drawer-value-empty {
  color: var(--app-text-3);
}

.due-note {
  margin-left: 2px;
  font-style: normal;
  font-weight: 400;
  font-size: 12px;
  color: var(--app-warning);
}

.due--soon {
  color: var(--app-warning);
}

.due--overdue {
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
}
</style>
