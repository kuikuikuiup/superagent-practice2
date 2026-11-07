<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue';
import Icon from './Icon.vue';

defineProps<{
  title: string;
  message: string;
  error: string | null;
  loading: boolean;
}>();

const emit = defineEmits<{
  (e: 'confirm'): void;
  (e: 'cancel'): void;
}>();

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') emit('cancel');
}

onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
  <div class="confirm-overlay" @click.self="emit('cancel')">
    <div class="confirm" role="dialog" aria-modal="true" :aria-label="title">
      <span class="confirm-icon">
        <Icon name="alert" :size="20" />
      </span>
      <h2 class="confirm-title">{{ title }}</h2>
      <p class="confirm-message">{{ message }}</p>
      <p v-if="error !== null" class="confirm-error" role="alert">{{ error }}</p>
      <div class="confirm-actions">
        <button type="button" class="btn btn-ghost" :disabled="loading" @click="emit('cancel')">取消</button>
        <button type="button" class="btn btn-danger-solid" :disabled="loading" @click="emit('confirm')">
          <span v-if="loading" class="spinner" aria-hidden="true"></span>
          <span>{{ loading ? '删除中…' : '确认删除' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(29, 33, 41, 0.45);
}

.confirm {
  width: 320px;
  max-width: 100%;
  padding: 24px;
  text-align: center;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}

.confirm-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  color: var(--color-danger);
  background: var(--color-danger-soft);
}

.confirm-title {
  margin-top: 10px;
  font-size: 15px;
  font-weight: 600;
}

.confirm-message {
  margin-top: 6px;
  font-size: 13px;
  color: var(--color-text-secondary);
  word-break: break-word;
  overflow-wrap: anywhere;
}

.confirm-error {
  margin-top: 8px;
  font-size: 12px;
  color: var(--color-danger);
}

.confirm-actions {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 20px;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 16px;
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
}

.btn-ghost {
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
}

.btn-ghost:hover:not(:disabled) {
  border-color: var(--color-border-strong);
  color: var(--color-text);
}

.btn-danger-solid {
  color: #FFFFFF;
  background: var(--color-danger);
}

.btn-danger-solid:hover:not(:disabled) {
  background: var(--color-danger-hover);
}

.btn-danger-solid:disabled {
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
</style>
