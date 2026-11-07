import { mount } from '@vue/test-utils';
import ArcoVue from '@arco-design/web-vue';
import ArcoVueIcon from '@arco-design/web-vue/es/icon';
import type { Component } from 'vue';

// jsdom 缺少 ResizeObserver：arco 的 Modal/Drawer/Trigger 依赖到 mounted 的尺寸观察
if (typeof (globalThis as unknown as Record<string, unknown>).ResizeObserver === 'undefined') {
  (globalThis as unknown as Record<string, unknown>).ResizeObserver = class {
    observe(): void {}

    unobserve(): void {}

    disconnect(): void {}
  };
}

// jsdom 缺少 matchMedia：arco Grid(Row/Col，FormItem 内部使用) 响应式状态需要
if (typeof window.matchMedia === 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: (): void => undefined,
      removeListener: (): void => undefined,
      addEventListener: (): void => undefined,
      removeEventListener: (): void => undefined,
      dispatchEvent: (): boolean => false,
    }),
  });
}

/**
 * 注册 Arco 全量组件 + 图标库，并默认内联渲染 Teleport（modal/drawer/确认浮层），
 * 便于断言窗口内容。
 */
export function mountWithArco(
  component: Component,
  options: Parameters<typeof mount>[1] = {},
): ReturnType<typeof mount> {
  const ourGlobal = (options.global ?? {}) as Record<string, unknown>;
  const mergedStubs = (ourGlobal.stubs ?? {}) as Record<string, unknown>;
  return mount(component, {
    ...options,
    global: {
      ...ourGlobal,
      plugins: [ArcoVue, ArcoVueIcon],
      stubs: {
        teleport: true,
        ...mergedStubs,
      },
    },
  });
}
