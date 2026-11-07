# 全栈任务管理看板（Task Kanban）

从零实现的可运行全栈任务管理系统：真实 REST API + SQLite 持久化 + 自动化测试 + CI。技术栈：**Vue 3 + TypeScript + Vite**（前端）、**Node.js + Fastify + TypeScript**（后端）、**SQLite**（数据库，Node 24 内置 `node:sqlite`）、**pnpm** 工作区、**Vitest** 测试、**GitHub Actions** CI。

技术方案详见 [docs/design.md](docs/design.md)。

## 快速开始

环境要求：Node.js ≥ 22.5（推荐 24.x）、pnpm ≥ 9（本仓库用 11.x）。

```bash
# 1. 安装依赖
pnpm install

# 2a. 开发模式（并行启动后端 :3000 与前端 :5173，前端 /api 自动代理）
pnpm dev        # 访问 http://localhost:5173

# 2b. 生产模式（构建后由后端 Fastify 托管前端产物）
pnpm build
pnpm --filter @kanban/server start   # 访问 http://localhost:3000
```

可选：写入演示数据（幂等，已有任务时跳过）：

```bash
pnpm seed                                        # 默认写入 apps/server/data/app.db
pnpm --filter @kanban/server run db:seed -- /tmp/demo.db   # 也可指定文件
```

数据库文件默认位置：`apps/server/data/app.db`，已在 `.gitignore` 中排除，**不会提交运行时数据**；首次启动自动创建目录与表结构，服务重启后数据保留。

## 运行测试

```bash
pnpm test        # 运行所有包的测试（Vitest）
pnpm typecheck   # TypeScript 类型检查（tsc / vue-tsc）
pnpm build       # 前端构建 + 后端编译
```

- `apps/server/test/`：**API 集成测试**（内存 SQLite + Fastify inject），覆盖 CRUD、路径/查询参数校验、404/400/204、CORS、统计聚合精度、拖拽场景的状态切换，以及 **真实 SQLite 文件的服务重启持久化验证**。
- `apps/web/test/`：前端纯函数与组件测试（过滤/排序逻辑、逾期判断、表单校验与交互）。
- CI（`.github/workflows/ci.yml`）：类型检查 → 全部测试 → 前后端构建 → 启动真实服务做 API 冒烟（健康检查、建任务、统计、非法输入返回 400、SPA 首页可访问）。

## 功能

- **任务管理**：创建、编辑、详情、删除（带二次确认），字段含标题/描述/状态/优先级/截止日期/创建时间/更新时间；前后端都做输入校验并给出字段级错误提示。
- **看板**：三列（待办/进行中/已完成），HTML5 拖拽移动卡片即改状态，移动端与键盘亦可通过卡片上的“移至”下拉操作；任何修改成功后看板与统计同步刷新。
- **筛选与排序**：关键词（标题+描述，大小写不敏感）、状态筛选、优先级筛选、按截止日期升/降序（实现在服务端：`GET /api/tasks` 查询参数）。
- **统计仪表盘**：任务总数、待办、进行中、已完成、完成率、已逾期（`dueDate < 今天` 且非已完成），全部来自真实聚合数据（`GET /api/stats`）。
- **UI**：白色背景、简洁科技感，主色 `#165DFF`；桌面三列、移动端纵向堆叠；有加载、错误（可重试）与空状态提示。

## REST API

统一响应：成功 `{ "data": … }`；失败 `{ "error": { "code", "message", "details" } }`，`details` 为字段级数组（`{ path, message }`，仅校验错误有）。

| 方法 | 路径 | 说明 | 成功 | 主要错误 |
| --- | --- | --- | --- | --- |
| GET | `/api/tasks?keyword=&status=&priority=&sort=&order=` | 列表 + 筛选/排序 | 200 `{data:{items,total}}` | 400 `VALIDATION_ERROR` |
| POST | `/api/tasks` | 创建（`title` 必填 1..100；其余可选，默认 `todo / medium / null`） | 201 `{data:Task}` | 400 |
| GET | `/api/tasks/:id` | 详情 | 200 `{data:Task}` | 404 `TASK_NOT_FOUND` |
| PATCH | `/api/tasks/:id` | 部分更新（至少一个字段） | 200 `{data:Task}` | 400 / 404 |
| DELETE | `/api/tasks/:id` | 删除 | 204 空响应体 | 404 |
| GET | `/api/stats` | 统计：`{total,todo,inProgress,done,doneRate,overdue}` | 200 | — |
| GET | `/api/health` | 健康检查 | 200 `{data:{status:"ok"}}` | — |

`Task` 结构（`status`: `todo|in_progress|done`；`priority`: `high|medium|low`；`dueDate`: `YYYY-MM-DD` 或 `null`；时间为 ISO8601 UTC）：

```jsonc
{ "id": "…", "title": "…", "description": "…", "status": "todo",
  "priority": "medium", "dueDate": "2026-11-30", "createdAt": "…", "updatedAt": "…" }
```

错误码：`VALIDATION_ERROR`(400)、`TASK_NOT_FOUND`(404)、`ROUTE_NOT_FOUND`(404)、`INVALID_JSON`(400)、`UNSUPPORTED_MEDIA_TYPE`(415)、`INTERNAL_ERROR`(500)。

环境变量（均有默认值）：`PORT`(3000)、`HOST`(127.0.0.1)、`DATABASE_PATH`(apps/server/data/app.db)、`WEB_DIST`(apps/web/dist)、`LOG_LEVEL`(info)。

## 项目结构

```
apps/server   # Fastify + node:sqlite：路由、zod 校验、仓库层、集成测试
apps/web      # Vue 3 + Vite：看板/统计/弹窗、useTasks 数据同步、前端测试
docs          # design.md 技术方案
.github       # ci.yml：typecheck → test → build → 启动冒烟
```

## 已知限制

- 单用户本地系统：无鉴权、无多人并发合并策略（超出本次 Issue 范围）。
- 列表接口不分页（单次最多返回 500 条，教学用途足够）。
- 拖拽基于原生 HTML5 Drag & Drop，触屏设备请使用卡片上的“移至”下拉。

---

## superagent-practice2 试用说明

这是一个练习仓库。如需提交任务，请使用 @kuikuikuiup 并附上具体需求来发起任务。
