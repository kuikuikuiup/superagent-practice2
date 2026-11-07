import type { FastifyInstance } from 'fastify'
import type { TaskRepository } from '../db/repository.js'

export async function registerStatRoutes(
  app: FastifyInstance,
  repo: TaskRepository
): Promise<void> {
  app.get('/api/stats', async (_request, reply) => {
    return reply.send({ data: repo.stats() })
  })

  app.get('/api/health', async (_request, reply) => {
    return reply.send({ data: { status: 'ok' } })
  })
}
