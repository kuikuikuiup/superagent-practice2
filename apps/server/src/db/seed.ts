import { accessSync, constants as fsConstants } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { TaskRepository } from './repository.js'

const appDir = dirname(fileURLToPath(import.meta.url))

/** 从任意运行位置（tsx 直跑 src 或编译后的 dist）向上找到 apps/server 包根。 */
function findPackageRoot(startDir: string): string {
  let dir = resolve(startDir)
  for (;;) {
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

const serverRoot = findPackageRoot(appDir)

/**
 * 可选演示数据初始化命令：向真实数据库写入示例任务（幂等：已有任务时跳过）。
 * 用法：pnpm --filter @kanban/server run db:seed [-- DATABASE_PATH]
 */
async function seed(): Promise<void> {
  const argPath = process.argv[2]
  const databasePath = argPath ? resolve(argPath) : resolve(serverRoot, 'data/app.db')
  const { openDatabase } = await import('./database.js')
  const database = openDatabase(databasePath)
  const repo = new TaskRepository(database)
  const existing = repo.list({ sort: 'createdAt', order: 'asc' })
  if (existing.length > 0) {
    console.log(`数据库已有 ${existing.length} 条任务，跳过演示数据写入 (${databasePath})`)
    database.close()
    return
  }

  const daysFromNow = (n: number): string => {
    const d = new Date()
    d.setDate(d.getDate() + n)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${dd}`
  }
  // Agent 消费示例：真实字段（tokens / cost），随演示数据一并写入；
  // 已有条据保持默认 0，由执行后真实写入或人工补录。
  const demos: Parameters<typeof repo.create>[0][] = [
    { title: '梳理看板需求与数据模型', description: '拆分任务实体，确定状态与优先级枚举。', status: 'done', priority: 'high', dueDate: daysFromNow(-2), tokens: 12480, cost: 1.24 },
    { title: '实现任务 REST API', description: 'Fastify + SQLite，覆盖 CRUD 与统计端点。', status: 'in_progress', priority: 'high', dueDate: daysFromNow(0), tokens: 8640, cost: 0.86 },
    { title: '前端看板交互联调', description: '拖拽改状态、筛选排序与统计刷新。', status: 'todo', priority: 'medium', dueDate: daysFromNow(3), tokens: 3200, cost: 0.32 },
    { title: '编写 API 集成测试', description: '覆盖合法输入、非法输入与持久化。', status: 'todo', priority: 'medium', dueDate: daysFromNow(5) },
    { title: '归档旧数据迁移脚本', description: '', status: 'todo', priority: 'low', dueDate: daysFromNow(-1) },
  ]

  for (const demo of demos) {
    repo.create(demo)
  }
  const stats = repo.stats()
  console.log(`演示数据已写入 (${databasePath}): 共 ${demos.length} 条任务；当前统计:`, stats)
  database.close()
}

await seed()
