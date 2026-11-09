import type { FastifyInstance } from 'fastify'
import type { TaskRepository } from '../db/repository.js'
import { validationError } from '../errors.js'

export async function registerStatRoutes(
  app: FastifyInstance,
  repo: TaskRepository
): Promise<void> {
  app.get('/api/stats', async (_request, reply) => {
    return reply.send({ data: repo.stats() })
  })

  /** GET /api/stats/trend?days=N：最近 N 天（含今天）新增任务趋势，N 限 1..30。 */
  app.get('/api/stats/trend', async (request, reply) => {
    const raw = (request.query as Record<string, unknown>).days
    let days = 14
    if (raw !== undefined) {
      const parsed = typeof raw === 'string' ? Number(raw) : NaN
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 30) {
        throw validationError('days 必须是 1..30 的整数', [
          { path: 'days', message: 'days 必须是 1..30 的整数' },
        ])
      }
      days = parsed
    }
    return reply.send({ data: repo.createdAtTrend(days) })
  })

  app.get('/api/health', async (_request, reply) => {
    return reply.send({ data: { status: 'ok' } })
  })
}

