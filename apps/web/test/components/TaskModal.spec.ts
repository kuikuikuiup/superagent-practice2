// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { nextTick } from 'vue';
import { mountWithArco } from '../helpers/arco';
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

async function mountModal(props: Record<string, unknown> = {}) {
  const wrapper = mountWithArco(TaskModal, {
    props: { mode: 'create', task: null, error: null, submitting: false, ...props },
  });
  await flushPromises();
  await nextTick();
  await flushPromises();
  return wrapper;
}

function cancelButton(wrapper: Awaited<ReturnType<typeof mountModal>>) {
  return wrapper.findAll('button').find((b) => b.text().trim() === '取消');
}

function submitButton(wrapper: Awaited<ReturnType<typeof mountModal>>) {
  return wrapper
    .findAll('button')
    .find((b) => ['创建', '保存', '创建中…', '保存中…'].includes(b.text().trim()));
}

describe('TaskModal', () => {
  it('prefills form values in edit mode', async () => {
    const wrapper = await mountModal({ mode: 'edit', task: existing });
    expect((wrapper.find('#task-title').element as HTMLInputElement).value).toBe('整理需求');
    expect(wrapper.text()).toContain('编辑任务');
  });

  it('shows an inline error and does not submit an empty title', async () => {
    const wrapper = await mountModal();
    await submitButton(wrapper)?.trigger('click');
    await flushPromises();
    await nextTick();
    await flushPromises();
    expect(wrapper.emitted('submit')).toBeUndefined();
    expect(wrapper.text()).toContain('请输入标题');
  });

  it('emits a normalized payload for a valid create form', async () => {
    const wrapper = await mountModal();
    await wrapper.find('#task-title').setValue('  新任务  ');
    await wrapper.find('textarea').setValue('内容');
    const selects = wrapper.findAllComponents({ name: 'Select' });
    selects[0]?.vm.$emit('update:modelValue', 'in_progress');
    selects[0]?.vm.$emit('change', 'in_progress');
    selects[1]?.vm.$emit('update:modelValue', 'low');
    selects[1]?.vm.$emit('change', 'low');
    await submitButton(wrapper)?.trigger('click');
    await flushPromises();
    await nextTick();
    await flushPromises();
    expect(wrapper.emitted('submit')?.[0]).toEqual([
      {
        title: '新任务',
        description: '内容',
        status: 'in_progress',
        priority: 'low',
        dueDate: null,
      },
    ]);
  });

  it('maps server VALIDATION_ERROR details onto fields', async () => {
    const wrapper = await mountModal();
    await wrapper.setProps({
      error: new ApiError('VALIDATION_ERROR', '校验失败', [{ path: 'title', message: '标题已存在' }]),
    });
    await flushPromises();
    await nextTick();
    await flushPromises();
    expect(wrapper.text()).toContain('标题已存在');
    expect(wrapper.text()).not.toContain('校验失败');
    expect(wrapper.find('.task-modal-banner').exists()).toBe(false);
  });

  it('shows non-validation server errors as an alert', async () => {
    const wrapper = await mountModal({ mode: 'edit', task: existing });
    await wrapper.setProps({ error: new ApiError('TASK_NOT_FOUND', '任务不存在') });
    await flushPromises();
    await nextTick();
    await flushPromises();
    expect(wrapper.find('.task-modal-banner').text()).toBe('任务不存在');
  });

  it('disables the submit button while submitting', async () => {
    const wrapper = await mountModal({ submitting: true });
    const submit = submitButton(wrapper);
    expect((submit?.element as HTMLButtonElement).className).toContain('arco-btn-loading');
    expect(submit?.text()).toContain('创建中…');
  });

  it('close button emits close', async () => {
    const wrapper = await mountModal();
    await cancelButton(wrapper)?.trigger('click');
    expect(wrapper.emitted('close')?.length).toBe(1);
  });
});
