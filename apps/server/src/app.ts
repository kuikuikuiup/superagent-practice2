import Fastify, { type FastifyError, type FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import fastifyStatic from '@fastify/static'
import type { DatabaseSync } from 'node:sqlite'
import { registerTaskRoutes } from './routes/tasks.js'
import { registerStatRoutes } from './routes/stats.js'
import { TaskRepository } from './db/repository.js'
import { ApiError } from './errors.js'

export interface BuildAppOptions {
  /** 已初始化的 SQLite 连接；由调用方负责关闭。 */
  database: DatabaseSync
  /** 跨域配置，默认放开，便于本地前端调试。 */
  corsOrigin?: boolean | string[]
  /** apps/web/dist 目录；传入后同时托管前端产物与 SPA fallback。 */
  staticRoot?: string
  /** 覆盖内建 logger（测试中可关闭）。 */
  logger?: boolean
}

const anError = (code: string, message: string) => ({
  error: { code, message, details: null },
})

export async function buildApp(options: BuildAppOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger: options.logger ?? { level: process.env.LOG_LEVEL ?? 'info' },
  })

  await app.register(cors, { origin: options.corsOrigin ?? true })

  const repo = new TaskRepository(options.database)
  await registerTaskRoutes(app, repo)
  await registerStatRoutes(app, repo)

  if (options.staticRoot !== undefined) {
    await app.register(fastifyStatic, {
      root: options.staticRoot,
      prefix: '/',
      wildcard: false,
    })
  }

  app.setNotFoundHandler((request, reply) => {
    // SPA fallback：非 API 的 GET 请求兜底到前端入口
    if (options.staticRoot !== undefined && request.method === 'GET' && !request.url.startsWith('/api')) {
      return reply.sendFile('index.html')
    }
    return reply.status(404).send(anError('ROUTE_NOT_FOUND', `路由 ${request.method} ${request.url} 不存在`))
  })

  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error instanceof ApiError) {
      return reply.status(error.statusCode).send({
        error: { code: error.code, message: error.message, details: error.details },
      })
    }

    const statusCode = typeof error.statusCode === 'number' ? error.statusCode : 500
    const code =
      statusCode === 404
        ? 'ROUTE_NOT_FOUND'
        : statusCode === 415
          ? 'UNSUPPORTED_MEDIA_TYPE'
          : statusCode === 400
            ? 'INVALID_JSON'
            : 'INTERNAL_ERROR'
    const message = statusCode === 500 ? '服务器内部错误' : error.message

    if (statusCode === 500) {
      app.log.error({ err: error, url: request.url }, 'unhandled server error')
    }

    return reply.status(statusCode).send(anError(code, message))
  })

  return app
}
