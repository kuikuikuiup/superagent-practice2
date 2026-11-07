// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import TaskModal from '../../src/components/TaskModal.vue';
import { ApiError } from '../../src/api/client';
import type { Task } from '../../src/api/types';

const existing: Task = {
  id: 't1',
  title: '整理需求',
  description: '阅读 issue',
  status: 'in_progress',
  priority: 'low',
  dueDate: '2026-11-30',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function mountModal(props: Record<string, unknown> = {}) {
  return mount(TaskModal, {
    props: { mode: 'create', task: null, error: null, submitting: false, ...props },
  });
}

describe('TaskModal', () => {
  it('prefills form values in edit mode', () => {
    const wrapper = mountModal({ mode: 'edit', task: existing });
    expect((wrapper.find('#task-title').element as HTMLInputElement).value).toBe('整理需求');
    expect(wrapper.find('.modal-header h2').text()).toBe('编辑任务');
  });

  it('shows an inline error and does not submit an empty title', async () => {
    const wrapper = mountModal();
    await wrapper.find('form').trigger('submit');
    expect(wrapper.emitted('submit')).toBeUndefined();
    expect(wrapper.text()).toContain('请输入标题');
    expect(wrapper.find('#task-title').classes()).toContain('form-input--invalid');
  });

  it('emits a normalized payload for a valid create form', async () => {
    const wrapper = mountModal();
    await wrapper.find('#task-title').setValue('  新任务  ');
    await wrapper.find('#task-description').setValue('内容');
    await wrapper.find('#task-status').setValue('in_progress');
    await wrapper.find('#task-priority').setValue('low');
    await wrapper.find('#task-due-date').setValue('2026-12-31');
    await wrapper.find('form').trigger('submit');
    expect(wrapper.emitted('submit')?.[0]).toEqual([
      {
        title: '新任务',
        description: '内容',
        status: 'in_progress',
        priority: 'low',
        dueDate: '2026-12-31',
      },
    ]);
  });

  it('maps server VALIDATION_ERROR details onto fields', async () => {
    const wrapper = mountModal();
    await wrapper.setProps({
      error: new ApiError('VALIDATION_ERROR', '校验失败', [{ path: 'title', message: '标题已存在' }]),
    });
    expect(wrapper.text()).toContain('标题已存在');
    expect(wrapper.text()).not.toContain('校验失败');
    expect(wrapper.find('.form-banner').exists()).toBe(false);
  });

  it('shows non-validation server errors as a banner', async () => {
    const wrapper = mountModal({ mode: 'edit', task: existing });
    await wrapper.setProps({ error: new ApiError('TASK_NOT_FOUND', '任务不存在') });
    expect(wrapper.find('.form-banner').text()).toBe('任务不存在');
  });

  it('disables the submit button while submitting', () => {
    const wrapper = mountModal({ submitting: true });
    const submit = wrapper.find('button[type="submit"]');
    expect((submit.element as HTMLButtonElement).disabled).toBe(true);
    expect(submit.text()).toContain('创建中…');
  });
});
