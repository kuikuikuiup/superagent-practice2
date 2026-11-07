import type { FastifyInstance, FastifyReply } from 'fastify'
import {
  createTaskSchema,
  listQuerySchema,
  taskIdParamSchema,
  toFieldErrors,
  updateTaskSchema,
} from '../schemas.js'
import { TaskRepository } from '../db/repository.js'
import type { FieldError } from '../types.js'

function validationReply(reply: FastifyReply, message: string, details: FieldError[]): FastifyReply {
  return reply.status(400).send({
    error: { code: 'VALIDATION_ERROR', message, details },
  })
}

export async function registerTaskRoutes(
  app: FastifyInstance,
  repo: TaskRepository
): Promise<void> {
  app.get('/api/tasks', async (request, reply) => {
    const parsedQuery = listQuerySchema.safeParse(request.query)
    if (!parsedQuery.success) {
      return validationReply(reply, '查询参数不合法', toFieldErrors(parsedQuery.error))
    }
    const items = repo.list(parsedQuery.data)
    return reply.send({ data: { items, total: items.length } })
  })

  app.post('/api/tasks', async (request, reply) => {
    const parsedBody = createTaskSchema.safeParse(request.body)
    if (!parsedBody.success) {
      return validationReply(reply, '请求体校验失败', toFieldErrors(parsedBody.error))
    }
    const task = repo.create(parsedBody.data)
    return reply.status(201).send({ data: task })
  })

  app.get('/api/tasks/:id', async (request, reply) => {
    const parsedParam = taskIdParamSchema.safeParse(request.params)
    if (!parsedParam.success) {
      return validationReply(reply, '路径参数不合法', toFieldErrors(parsedParam.error))
    }
    const task = repo.getById(parsedParam.data.id)
    return reply.send({ data: task })
  })

  app.patch('/api/tasks/:id', async (request, reply) => {
    const parsedParam = taskIdParamSchema.safeParse(request.params)
    if (!parsedParam.success) {
      return validationReply(reply, '路径参数不合法', toFieldErrors(parsedParam.error))
    }
    const parsedBody = updateTaskSchema.safeParse(request.body)
    if (!parsedBody.success) {
      return validationReply(reply, '请求体校验失败', toFieldErrors(parsedBody.error))
    }
    const task = repo.update(parsedParam.data.id, parsedBody.data)
    return reply.send({ data: task })
  })

  app.delete('/api/tasks/:id', async (request, reply) => {
    const parsedParam = taskIdParamSchema.safeParse(request.params)
    if (!parsedParam.success) {
      return validationReply(reply, '路径参数不合法', toFieldErrors(parsedParam.error))
    }
    repo.remove(parsedParam.data.id)
    return reply.status(204).send()
  })
}
