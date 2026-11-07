import type { Task, TaskInput, TaskPage, TaskPatch, TaskStats, TaskFilter } from './types';
import { request } from './client';
import { buildTaskQuery } from '../utils/filters';

const BASE = '/api';

export function fetchTasks(filter: TaskFilter): Promise<TaskPage> {
  return request<TaskPage>(`${BASE}/tasks${buildTaskQuery(filter)}`);
}

export function fetchStats(): Promise<TaskStats> {
  return request<TaskStats>(`${BASE}/stats`);
}

export function createTask(input: TaskInput): Promise<Task> {
  return request<Task>(`${BASE}/tasks`, { method: 'POST', body: input });
}

export function updateTask(id: string, patch: TaskPatch): Promise<Task> {
  return request<Task>(`${BASE}/tasks/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch });
}

/** 成功返回 204 无内容 → undefined。 */
export function deleteTask(id: string): Promise<void> {
  return request<void>(`${BASE}/tasks/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
