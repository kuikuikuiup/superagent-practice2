<script setup lang="ts">
import TaskCard from './TaskCard.vue';
import type { Task, TaskStatus } from '../api/types';

const props = defineProps<{
  columnKey: TaskStatus;
  title: string;
  tasks: Task[];
  emptyText: string;
  /** 是否为当前拖拽落点（拖拽状态由 Board 统一管理，避免多个列各自维护） */
  dragOver?: boolean;
}>();

const emit = defineEmits<{
  (e: 'open', task: Task): void;
  (e: 'edit', task: Task): void;
  (e: 'delete', task: Task): void;
  (e: 'move', payload: { id: string; status: TaskStatus }): void;
}>();
</script>

<template>
  <section
    class="column"
    :class="{ 'column--dragover': props.dragOver === true, 'column--empty': props.tasks.length === 0 }"
    :data-column="columnKey"
    :aria-label="props.title"
  >
    <header class="column-header">
      <span class="column-dot" :class="`column-dot--${columnKey}`"></span>
      <h2 class="column-title">{{ props.title }}</h2>
      <!-- 显式计数元素：a-badge 会隐藏 0，筛选后空列必须仍显示「0」 -->
      <span class="column-badge" :aria-label="`${props.tasks.length} 个任务`">{{ props.tasks.length }}</span>
    </header>

    <ul class="column-list" :class="{ 'column-list--empty': props.tasks.length === 0 }">
      <li v-for="task in props.tasks" :key="task.id" class="column-item">
        <!-- data-task-id 同时由 TaskCard 根元素声明；这里再透传一层，保证拖拽逻辑在任何时刻都拿得到真实 id -->
        <TaskCard
          :task="task"
          :data-task-id="task.id"
          @open="emit('open', $event)"
          @edit="emit('edit', $event)"
          @delete="emit('delete', $event)"
          @move="emit('move', $event)"
        />
      </li>
    </ul>

    <div v-if="props.tasks.length === 0" class="column-empty">
      <span class="column-empty-icon">
        <icon-empty />
      </span>
      <p class="column-empty-text">{{ props.emptyText }}</p>
    </div>
  </section>
</template>

<style scoped>
.column {
  display: flex;
  flex-direction: column;
  gap: var(--app-space-3);
  box-sizing: border-box;
  /* 宽度交给网格轨道（minmax(0,1fr)）；min-width:0 防止卡片内容把列撑出轨道 */
  min-width: 0;
  /* 高度吃满网格行高（= 看板剩余高度）；min-height:0 允许短屏收缩而不是撑破布局 */
  height: 100%;
  min-height: 0;
  /* 列内滚动由 .column-list 承担，列本身裁掉圆角外的溢出。
     右内边距 8px + 滚动条槽 8px（scrollbar-gutter: stable）= 左内边距 16px，
     保证卡片左右内缩一致（16px / 16px），跨列卡片横向间距回到 16+16+16 的 8px 间距体系。 */
  overflow: hidden;
  padding: var(--app-space-3) var(--app-space-2) var(--app-space-3) var(--app-space-4);
  background: var(--app-muted-bg);
  border: 1px solid var(--app-card-border);
  border-radius: var(--app-radius);
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.column--dragover {
  border-color: var(--app-primary);
  background: var(--app-primary-light);
  box-shadow: var(--shadow-sm);
}

/* 列头固定：桌面端位于列内滚动区之外天然不滚动；
   窄屏整页滚动时 sticky 让列头吸附在视口顶部，始终能看到列名与计数。 */
.column-header {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: var(--app-space-2);
  min-width: 0;
  background: var(--app-muted-bg);
  /* 列头文字（含「待认领 3」）不允许被选中拖拽，避免其文本被当成任务 ID */
  user-select: none;
}

.column-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.column-dot--todo {
  background: var(--app-text-3);
}

.column-dot--in_progress {
  background: var(--app-primary);
}

.column-dot--done {
  background: var(--app-success);
}

.column-title {
  /* 标题可收缩并省略，绝不与计数徽标重叠 */
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  font-size: 15px;
  font-weight: 600;
  color: var(--app-text-1);
  letter-spacing: 0.02em;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* 显式计数徽标：与旧 arco-badge 计数观感一致（中性灰药丸），0 也照常展示 */
.column-badge {
  flex-shrink: 0;
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1;
  color: var(--app-text-2);
  font-variant-numeric: tabular-nums;
  background: var(--app-muted-bg-strong);
  border-radius: 10px;
}

.column-list {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: var(--app-space-3);
  /* flex 子项允许收缩到内容高度以下，滚动才真正生效 */
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  /* 轨道稳定预留滚动条宽度：有/无滚动条时卡片宽度一致，不会横向抖动 */
  scrollbar-gutter: stable;
  overscroll-behavior: contain;
  /* 底部 padding：滚到底时最后一张卡片不贴边、悬停阴影不被裁掉 */
  padding: 2px 0 var(--app-space-3);
  /* 说明：滚动条外观统一由下方 ::-webkit-scrollbar 定义（8px 宽、深色 thumb）。
     不再设置 scrollbar-width/scrollbar-color：Chromium 一旦设置这两个标准属性，
     会改用 UA 自带的 thin/颜色滚动条（实测 thin=10px），与列右内边距 8px 相加后
     卡片右缩进变成 18px、与左缩进 16px 不对称。 */
}

/* WebKit 滚动条：8px 宽 + 深色 thumb，默认状态即可看见；
   宽度与列右内边距 8px 相加正好等于左内边距 16px，卡片左右留白对称。 */
.column-list::-webkit-scrollbar {
  /* 注意：::-webkit-scrollbar 内不支持 CSS 变量，此处用字面量 8px 与列右内边距 8px 相加 = 左内边距 16px */
  width: 8px;
  height: 8px;
}

.column-list::-webkit-scrollbar-track {
  background: var(--app-muted-bg-strong);
  border-radius: 5px;
}

.column-list::-webkit-scrollbar-thumb {
  min-height: 40px;
  background: var(--app-text-3);
  border-radius: 5px;
}

.column-list::-webkit-scrollbar-thumb:hover,
.column-list::-webkit-scrollbar-thumb:active {
  background: var(--app-text-2);
}

.column-list--empty {
  flex: none;
  overflow: visible;
  scrollbar-gutter: auto;
  padding-bottom: 0;
}

.column-item {
  display: block;
  min-width: 0;
}

/* 空列：空态在列剩余高度内上下居中 */
.column--empty {
  justify-content: flex-start;
}

.column-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--app-space-2);
  padding: var(--app-space-3) 0;
}

.column-empty-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  font-size: 20px;
  color: var(--app-text-3);
  background: var(--app-muted-bg-strong);
  border-radius: 50%;
}

.column-empty-text {
  font-size: 13px;
  color: var(--app-text-3);
}

/* 窄屏（≤991.98px）：整页文档流滚动，列高随内容自适应，不再列内嵌套滚动 */
@media (max-width: 991.98px) {
  .column {
    height: auto;
    min-height: 0;
    overflow: visible;
    padding: var(--app-space-3);
  }

  .column-header {
    /* 整页滚动时列头吸附，背景补一层下边距盖住从下方滚过的卡片 */
    padding-bottom: var(--app-space-2);
    margin-bottom: calc(-1 * var(--app-space-1));
    /* 与下方卡片保持视觉间距（sticky 需要自己的背景覆盖滚动内容） */
    box-shadow: 0 4px 6px -6px rgba(15, 22, 36, 0.18);
  }

  .column-list {
    flex: none;
    overflow: visible;
    scrollbar-gutter: auto;
    padding: 2px 0 0;
  }

  .column-list--empty {
    padding-bottom: 0;
  }

  .column--empty {
    min-height: 132px;
  }
}
</style>
