<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import type { FieldRule, FormInstance } from '@arco-design/web-vue';
import type { ApiError } from '../api/client';
import type { Task, TaskInput } from '../api/types';
import { TASK_STATUSES, TASK_PRIORITIES } from '../api/types';
import { PRIORITY_LABELS, STATUS_LABELS } from '../utils/labels';
import { isValidDueDate } from '../utils/dueDate';
import { DESCRIPTION_MAX_LENGTH, TITLE_MAX_LENGTH, createFormValues, normalizeForm } from '../utils/validation';

const props = defineProps<{
  mode: 'create' | 'edit';
  task: Task | null;
  error: ApiError | null;
  submitting: boolean;
}>();

const emit = defineEmits<{
  (e: 'submit', payload: TaskInput): void;
  (e: 'close'): void;
}>();

// 桌面端 640px 表单宽度；窄视口退化为视口内边距宽度
const modalWidth = typeof window !== 'undefined' && window.innerWidth <= 576 ? '96%' : 640;

const form = reactive(createFormValues(props.task));
const formRef = ref<FormInstance | null>(null);
/** 服务端 VALIDATION_ERROR 字段级错误：随 FormItem validate-status 一并展示 */
const serverErrors = reactive<Record<string, string>>({});
const serverMessage = ref<string | null>(null);

const isSubmitting = computed(() => props.submitting);
const titleLength = computed(() => form.title.trim().length);
const descriptionLength = computed(() => form.description.trim().length);

const titleRules: FieldRule[] = [
  { required: true, message: '请输入标题' },
  {
    validator: (value, callback) => {
      const trimmed = typeof value === 'string' ? value.trim() : '';
      if (trimmed === '') {
        callback('请输入标题');
        return;
      }
      if (trimmed.length > TITLE_MAX_LENGTH) {
        callback(`标题不能超过 ${TITLE_MAX_LENGTH} 个字符`);
        return;
      }
      callback();
    },
  },
];

const descriptionRules: FieldRule[] = [
  {
    validator: (value, callback) => {
      const trimmed = typeof value === 'string' ? value.trim() : '';
      callback(trimmed.length > DESCRIPTION_MAX_LENGTH ? `描述不能超过 ${DESCRIPTION_MAX_LENGTH} 个字符` : undefined);
    },
  },
];

const dueDateRules: FieldRule[] = [
  {
    validator: (value, callback) => {
      const raw = typeof value === 'string' ? value : '';
      callback(raw !== '' && !isValidDueDate(raw) ? '请输入有效的日期（YYYY-MM-DD）' : undefined);
    },
  },
];

async function onSubmit(): Promise<void> {
  const result = await formRef.value?.validate();
  if (result && Object.keys(result).length > 0) return;
  for (const key of Object.keys(serverErrors)) delete serverErrors[key];
  serverMessage.value = null;
  emit('submit', normalizeForm(form));
}

// 用户重新输入时清除服务端错误
watch(form, () => {
  for (const key of Object.keys(serverErrors)) delete serverErrors[key];
});

// 服务端校验错误逐字段落入表单
watch(
  () => props.error,
  (error) => {
    if (!error) return;
    if (error.code === 'VALIDATION_ERROR') {
      serverMessage.value = null;
      for (const detail of error.details ?? []) serverErrors[detail.path] = detail.message;
    } else {
      for (const key of Object.keys(serverErrors)) delete serverErrors[key];
      serverMessage.value = error.message;
    }
  },
);
</script>

<template>
  <a-modal
    :visible="true"
    :width="modalWidth"
    :title="props.mode === 'create' ? '新建任务' : '编辑任务'"
    title-align="start"
    modal-class="task-modal"
    :mask-closable="true"
    @cancel="emit('close')"
    @close="emit('close')"
  >
    <a-alert v-if="serverMessage !== null" type="error" class="task-modal-banner">
      {{ serverMessage }}
    </a-alert>

    <a-form ref="formRef" :model="form" layout="vertical" auto-label-width>
      <a-form-item
        field="title"
        label="任务标题"
        required
        :show-colon="false"
        :validate-status="serverErrors['title'] ? 'error' : undefined"
        :rules="titleRules"
      >
        <a-input v-model="form.title" placeholder="示例：整理需求文档" allow-clear :input-attrs="{ id: 'task-title' }" />
        <p v-if="serverErrors['title']" class="task-modal-server-error" role="alert">{{ serverErrors['title'] }}</p>
        <template #extra>
          <span class="task-modal-counter">{{ titleLength }}/{{ TITLE_MAX_LENGTH }}</span>
        </template>
      </a-form-item>

      <a-form-item
        field="description"
        label="描述"
        :validate-status="serverErrors['description'] ? 'error' : undefined"
        :rules="descriptionRules"
      >
        <a-textarea v-model="form.description" :textarea-attrs="{ id: 'task-description' }" placeholder="补充说明、验收标准、链接等（可选）" :auto-size="{ minRows: 4, maxRows: 10 }" />
        <p v-if="serverErrors['description']" class="task-modal-server-error" role="alert">{{ serverErrors['description'] }}</p>
        <template #extra>
          <span class="task-modal-counter">{{ descriptionLength }}/{{ DESCRIPTION_MAX_LENGTH }}</span>
        </template>
      </a-form-item>

      <div class="task-modal-row">
        <a-form-item
          field="status"
          label="状态"
          :validate-status="serverErrors['status'] ? 'error' : undefined"
        >
          <a-select v-model="form.status">
            <a-option v-for="status in TASK_STATUSES" :key="status" :value="status">
              {{ STATUS_LABELS[status] }}
            </a-option>
          </a-select>
          <p v-if="serverErrors['status']" class="task-modal-server-error" role="alert">{{ serverErrors['status'] }}</p>
        </a-form-item>

        <a-form-item
          field="priority"
          label="优先级"
          :validate-status="serverErrors['priority'] ? 'error' : undefined"
        >
          <a-select v-model="form.priority">
            <a-option v-for="priority in TASK_PRIORITIES" :key="priority" :value="priority">
              {{ PRIORITY_LABELS[priority] }}
            </a-option>
          </a-select>
          <p v-if="serverErrors['priority']" class="task-modal-server-error" role="alert">{{ serverErrors['priority'] }}</p>
        </a-form-item>

        <a-form-item
          field="dueDate"
          label="截止日期"
          :validate-status="serverErrors['dueDate'] ? 'error' : undefined"
          :rules="dueDateRules"
        >
          <a-date-picker v-model="form.dueDate" :format="'YYYY-MM-DD'" allow-clear />
          <p v-if="serverErrors['dueDate']" class="task-modal-server-error" role="alert">{{ serverErrors['dueDate'] }}</p>
        </a-form-item>
      </div>
    </a-form>

    <template #footer>
      <a-button @click="emit('close')">取消</a-button>
      <a-button type="primary" :loading="isSubmitting" @click="onSubmit">
        {{ isSubmitting ? (props.mode === 'create' ? '创建中…' : '保存中…') : (props.mode === 'create' ? '创建' : '保存') }}
      </a-button>
    </template>
  </a-modal>
</template>

<style scoped>
/* 任务标题为第一信息层级 */
.task-modal-banner {
  margin-bottom: var(--app-space-4);
}

.task-modal-server-error {
  width: 100%;
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--app-danger);
}

.task-modal-counter {
  font-size: 12px;
  color: var(--app-text-3);
}

.task-modal-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--app-space-4);
}

.task-modal-row :deep(.arco-date-picker),
.task-modal-row :deep(.arco-select-view-single) {
  width: 100%;
}

@media (max-width: 479.98px) {
  .task-modal-row {
    grid-template-columns: 1fr;
    gap: 0;
  }
}
</style>

<style>
/* Modal 也经 Teleport 渲染，宽度/内边距的视口适配放到 modal-class 上 */
.task-modal .arco-modal-header {
  padding: 20px 24px 12px;
  border-bottom: none;
  background: none;
}

.task-modal .arco-modal-title {
  font-size: 16px;
  font-weight: 600;
}

.task-modal .arco-modal-body {
  padding: 8px 24px 0;
}

.task-modal .arco-modal-footer {
  padding: 16px 24px 20px;
}
</style>
