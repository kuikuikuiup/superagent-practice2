import { z } from 'zod'
import type { FieldError, TaskPriority, TaskStatus } from './types.js'

export const TASK_STATUSES = ['todo', 'in_progress', 'done'] as const satisfies readonly TaskStatus[]
export const TASK_PRIORITIES = ['high', 'medium', 'low'] as const satisfies readonly TaskPriority[]

const dateRe = /^\d{4}-\d{2}-\d{2}$/

const dueDateSchema = z
  .string()
  .regex(dateRe, 'dueDate 必须是 YYYY-MM-DD 格式，例如 2026-11-30')
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`)
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
  }, 'dueDate 必须是一个真实存在的日期')

const statusSchema = z.enum(TASK_STATUSES)
const prioritySchema = z.enum(TASK_PRIORITIES)

export const createTaskSchema = z.object({
  title: z
    .string('title 必须是字符串')
    .trim()
    .min(1, 'title 不能为空')
    .max(100, 'title 最长 100 个字符'),
  description: z
    .string('description 必须是字符串')
    .max(2000, 'description 最长 2000 个字符')
    .optional(),
  status: statusSchema.default('todo'),
  priority: prioritySchema.default('medium'),
  dueDate: dueDateSchema.nullish().default(null),
})

export const updateTaskSchema = z
  .object({
    title: z
      .string('title 必须是字符串')
      .trim()
      .min(1, 'title 不能为空')
      .max(100, 'title 最长 100 个字符')
      .optional(),
    description: z
      .string('description 必须是字符串')
      .max(2000, 'description 最长 2000 个字符')
      .optional(),
    status: statusSchema.optional(),
    priority: prioritySchema.optional(),
    dueDate: dueDateSchema.nullable().optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    'PATCH 请求体必须包含至少一个可更新字段'
  )

export const taskIdParamSchema = z.object({
  id: z.string('id 必须是字符串').min(1, 'id 不能为空'),
})

export const listQuerySchema = z.object({
  keyword: z.string().min(1).max(200).optional(),
  status: statusSchema.optional(),
  priority: prioritySchema.optional(),
  sort: z.enum(['createdAt', 'updatedAt', 'dueDate']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
})

export function toFieldErrors(error: z.ZodError): FieldError[] {
  return error.issues.map((issue) => ({
    path: issue.path.length > 0 ? issue.path.map(String).join('.') : '(body)',
    message: issue.message,
  }))
}

export type { TaskPriority, TaskStatus }
export type { Task } from './types.js'
