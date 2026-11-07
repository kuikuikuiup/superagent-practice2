<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import Icon from './Icon.vue';
import type { ApiError } from '../api/client';
import type { Task, TaskInput } from '../api/types';
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from '../utils/labels';
import {
  DESCRIPTION_MAX_LENGTH,
  TITLE_MAX_LENGTH,
} from '../utils/validation';
import {
  mergeServerDetails,
  normalizeForm,
  validateTaskForm,
  type TaskFormErrors,
  type TaskFormValues,
  createFormValues,
} from '../utils/validation';

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

const form = reactive<TaskFormValues>(createFormValues(props.task));
const errors = ref<TaskFormErrors>({});
const serverMessage = ref<string | null>(null);

const isSubmitting = computed(() => props.submitting);
const titleLength = computed(() => form.title.trim().length);
const descriptionLength = computed(() => form.description.trim().length);

function onSubmit(): void {
  const localErrors = validateTaskForm(form);
  errors.value = localErrors;
  serverMessage.value = null;
  if (Object.keys(localErrors).length > 0) return;
  emit('submit', normalizeForm(form));
}

function errorText(field: string): string | undefined {
  return errors.value[field];
}

function fieldClass(field: string): string {
  return errors.value[field] ? 'form-input form-input--invalid' : 'form-input';
}

// 用户重新输入时清除已有错误
watch(form, () => {
  if (Object.keys(errors.value).length > 0) errors.value = {};
});

// 服务端校验错误逐字段落入表单
watch(
  () => props.error,
  (error) => {
    if (!error) return;
    if (error.code === 'VALIDATION_ERROR') {
      serverMessage.value = null;
      errors.value = mergeServerDetails(error.details ?? [], {});
    } else {
      errors.value = {};
      serverMessage.value = error.message;
    }
  },
);

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') emit('close');
}

onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal" role="dialog" aria-modal="true" :aria-label="props.mode === 'create' ? '新建任务' : '编辑任务'">
      <header class="modal-header">
        <h2>{{ props.mode === 'create' ? '新建任务' : '编辑任务' }}</h2>
        <button type="button" class="icon-btn" aria-label="关闭弹窗" @click="emit('close')">
          <Icon name="x" :size="18" />
        </button>
      </header>

      <p v-if="serverMessage !== null" class="form-banner" role="alert">{{ serverMessage }}</p>

      <form class="form" novalidate @submit.prevent="onSubmit">
        <div class="field">
          <label class="field-label" for="task-title">任务标题<i class="required">*</i></label>
          <input
            id="task-title"
            v-model="form.title"
            :class="fieldClass('title')"
            type="text"
            :placeholder="'示例：整理需求文档'"
          />
          <p v-if="errorText('title')" class="field-error">{{ errorText('title') }}</p>
          <p class="field-counter" :class="{ 'field-counter--over': titleLength > TITLE_MAX_LENGTH }">
            {{ titleLength }}/{{ TITLE_MAX_LENGTH }}
          </p>
        </div>

        <div class="field">
          <label class="field-label" for="task-description">描述</label>
          <textarea
            id="task-description"
            v-model="form.description"
            :class="fieldClass('description')"
            rows="4"
            :placeholder="'补充说明、验收标准、链接等（可选）'"
          ></textarea>
          <p v-if="errorText('description')" class="field-error">{{ errorText('description') }}</p>
          <p class="field-counter" :class="{ 'field-counter--over': descriptionLength > DESCRIPTION_MAX_LENGTH }">
            {{ descriptionLength }}/{{ DESCRIPTION_MAX_LENGTH }}
          </p>
        </div>

        <div class="form-row">
          <div class="field">
            <label class="field-label" for="task-status">状态</label>
            <select id="task-status" v-model="form.status" class="form-input">
              <option v-for="option in STATUS_OPTIONS" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <p v-if="errorText('status')" class="field-error">{{ errorText('status') }}</p>
          </div>

          <div class="field">
            <label class="field-label" for="task-priority">优先级</label>
            <select id="task-priority" v-model="form.priority" class="form-input">
              <option v-for="option in PRIORITY_OPTIONS" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <p v-if="errorText('priority')" class="field-error">{{ errorText('priority') }}</p>
          </div>

          <div class="field">
            <label class="field-label" for="task-due-date">截止日期</label>
            <input id="task-due-date" v-model="form.dueDate" :class="fieldClass('dueDate')" type="date" />
            <p v-if="errorText('dueDate')" class="field-error">{{ errorText('dueDate') }}</p>
          </div>
        </div>

        <footer class="modal-footer">
          <button type="button" class="btn btn-ghost" @click="emit('close')">取消</button>
          <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
            <span v-if="isSubmitting" class="spinner" aria-hidden="true"></span>
            <span>{{ isSubmitting ? (props.mode === 'create' ? '创建中…' : '保存中…') : (props.mode === 'create' ? '创建' : '保存') }}</span>
          </button>
        </footer>
      </form>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(29, 33, 41, 0.45);
}

.modal {
  width: 100%;
  max-width: 560px;
  max-height: calc(100vh - 32px);
  overflow-y: auto;
  padding: 24px;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.modal-header h2 {
  font-size: 16px;
  font-weight: 600;
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

.form-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 10px 0 0;
  padding: 8px 12px;
  font-size: 13px;
  color: var(--color-danger);
  background: var(--color-danger-soft);
  border-radius: var(--radius-md);
}

.form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 14px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.required {
  color: var(--color-danger);
  font-style: normal;
  margin-left: 4px;
}

.form-input {
  width: 100%;
  padding: 7px 10px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(22, 93, 255, 0.12);
}

.form-input--invalid:focus {
  border-color: var(--color-danger);
  box-shadow: 0 0 0 3px rgba(245, 63, 63, 0.12);
}

textarea.form-input {
  resize: vertical;
  min-height: 88px;
}

select.form-input {
  height: 36px;
}

.field-error {
  font-size: 12px;
  color: var(--color-danger);
}

.field-counter {
  margin-left: auto;
  font-size: 12px;
  color: var(--color-text-muted);
  align-self: flex-end;
}

.field-counter--over {
  color: var(--color-danger);
}

.form-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 6px;
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

.btn-ghost {
  color: var(--color-text-secondary);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}

.btn-ghost:hover:not(:disabled) {
  border-color: var(--color-border-strong);
  color: var(--color-text);
}

.btn-primary {
  background: var(--color-primary);
  color: #FFFFFF;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.btn-primary:disabled {
  opacity: 0.7;
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #FFFFFF;
  border-radius: 50%;
  animation: spinner-rotate 0.8s linear infinite;
}

@keyframes spinner-rotate {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 479.98px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
