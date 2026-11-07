<script setup lang="ts">
import Icon from './Icon.vue';

defineProps<{
  message: string;
  retryable?: boolean;
  dismissible?: boolean;
}>();

const emit = defineEmits<{
  (e: 'retry'): void;
  (e: 'dismiss'): void;
}>();
</script>

<template>
  <div class="banner" role="alert">
    <Icon name="alert" :size="16" />
    <p class="banner-message">{{ message }}</p>
    <button v-if="retryable" type="button" class="banner-btn" @click="emit('retry')">
      <Icon name="refresh" :size="14" />
      <span>重试</span>
    </button>
    <button
      v-if="dismissible"
      type="button"
      class="banner-btn banner-btn--icon"
      aria-label="关闭提示"
      @click="emit('dismiss')"
    >
      <Icon name="x" :size="14" />
    </button>
  </div>
</template>

<style scoped>
.banner {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  padding: 10px 14px;
  background: var(--color-danger-soft);
  color: var(--color-danger);
  border: 1px solid rgba(245, 63, 63, 0.25);
  border-radius: var(--radius-md);
}

.banner-message {
  flex: 1;
  font-size: 13px;
}

.banner-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}

.banner-btn:hover {
  background: rgba(245, 63, 63, 0.12);
}

.banner-btn--icon {
  padding: 2px;
}
</style>
