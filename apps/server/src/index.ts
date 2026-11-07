import { dirname, join, resolve } from 'node:path'
import { accessSync, constants as fsConstants } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { buildApp } from './app.js'
import { openDatabase } from './db/database.js'

// 以本模块所在位置为准（编译到 dist/ 下运行同样成立），避免依赖进程 cwd
const appDir = dirname(fileURLToPath(import.meta.url)) // src（dev）或 dist（prod）
const serverRoot = findPackageRoot(appDir)


/** 从任意运行位置（tsx 直跑 src 或编译后的 dist）向上找到 apps/server 包根。 */
function findPackageRoot(startDir: string): string {
  let dir = resolve(startDir)
  while (true) {
    try {
      accessSync(join(dir, 'package.json'), fsConstants.F_OK)
      return dir
    } catch {
      const parent = dirname(dir)
      if (parent === dir) return startDir
      dir = parent
    }
  }
}

const PORT = Number.parseInt(process.env.PORT ?? '3000', 10)
const HOST = process.env.HOST ?? '127.0.0.1'
const DATABASE_PATH = process.env.DATABASE_PATH
  ? resolve(process.env.DATABASE_PATH)
  : resolve(serverRoot, 'data/app.db')
const WEB_DIST = process.env.WEB_DIST
  ? resolve(process.env.WEB_DIST)
  : resolve(serverRoot, '../web/dist')

async function main(): Promise<void> {
  const database = openDatabase(DATABASE_PATH)

  let staticRoot: string | undefined
  try {
    accessSync(join(WEB_DIST, 'index.html'), fsConstants.F_OK)
    staticRoot = WEB_DIST
  } catch {
    console.warn(`[warn] 未找到 ${WEB_DIST}/index.html，跳过前端静态托管（开发模式请使用 Vite dev server）`)
  }

  const app = await buildApp({ database, staticRoot })
  await app.listen({ port: PORT, host: HOST })
  app.log.info(`任务看板服务已启动: http://${HOST}:${PORT} (数据库: ${DATABASE_PATH})`)

  const close = async (): Promise<void> => {
    await app.close()
    database.close()
    process.exit(0)
  }
  process.on('SIGINT', () => void close())
  process.on('SIGTERM', () => void close())
}

main().catch((error) => {
  console.error('服务启动失败:', error)
  process.exit(1)
})
