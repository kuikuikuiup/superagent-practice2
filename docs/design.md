# 技术方案：全栈任务管理看板

实现 GitHub Issue #3 的需求：真实 API + 真实持久化 + 自动化测试 + CI 的全栈任务管理看板。

## 1. 总体架构

```
superagent-practice2/
├─ apps/
│  ├─ server/          # Node.js + TypeScript + Fastify + node:sqlite
│  │  ├─ src/
│  │  │  ├─ index.ts        # Fastify 启动入口（注册路由、CORS、静态托管）
│  │  │  ├─ app.ts          # buildApp(): 可注入 DB 的 Fastify 实例（测试用）
│  │  │  ├─ plugins/
│  │  │  ├─ routes/
│  │  │  │  ├─ tasks.ts     # /api/tasks CRUD
│  │  │  │  └─ stats.ts     # /api/stats、/api/health
│  │  │  ├─ db/
│  │  │  │  ├─ database.ts  # node:sqlite 连接、初始化、迁移
│  │  │  │  └─ repository.ts# 任务数据的 SQL 访问层
│  │  │  ├─ schemas.ts      # zod 校验 schema 与错误码
│  │  │  └─ types.ts
│  │  └─ test/         # Vitest 集成测试（内存 SQLite）
│  └─ web/             # Vue 3 + TypeScript + Vite
│     ├─ index.html
│     ├─ src/
│     │  ├─ api/            # fetch 封装 + 类型
│     │  ├─ composables/    # useTasks（数据获取/同步状态机）
│     │  ├─ utils/          # 过滤、排序、逾期判断（纯函数，可测）
│     │  ├─ components/     # 看板、列、卡片、弹窗、统计等
│     │  ├─ App.vue
│     │  ├─ main.ts
│     │  └─ styles.css
│     └─ test/         # Vitest 纯函数 / 组件测试
├─ docs/design.md
├─ .github/workflows/ci.yml
├─ pnpm-workspace.yaml
└─ package.json
```

- **pnpm workspaces** 管理两个应用与公共依赖，`pnpm dev` / `pnpm build` / `pnpm test` / `pnpm typecheck` 一键执行。
- 后端本地开发默认 `http://localhost:3000`；Vite dev server 通过 `server.proxy` 将 `/api` 转发到后端，生产构建产物由后端 Fastify 静态托管（`apps/web/dist`）。
- 数据库文件默认 `apps/server/data/app.db`（`.gitignore` 排除 `data/*.db*`），首次启动自动建表，服务重启数据不丢失。

## 2. 技术选型

| 关注点 | 选择 | 理由 |
| --- | --- | --- |
| 前端框架 | Vue 3 `<script setup>` + TypeScript + Vite | 需求指定 |
| 后端框架 | Fastify 5 | 需求指定，内置 JSON Schema 校验与 http2 基础 |
| 数据库 | `node:sqlite`（Node 24 内置，`DatabaseSync`） | 零原生依赖、无 Prisma/Drizzle 等重制品，满足 SQLite 持久化要求；CI 无需预编译二进制 |
| 校验 | zod v4 | 单一来源声明请求体 schema，错误映射为 `VALIDATION_ERROR` 与字段级 `details` |
| ID | `crypto.randomUUID()` | 标准库即可，任务 ID 形如 `uuid` |
| 测试 | Vitest | 需求指定；服务端以 `buildApp({ database })` 注入内存 SQLite 做集成测试 |
| CI | GitHub Actions（Node 24 + pnpm cache） | 需求指定 |
| 状态管理 | 后端为真源，前端 `useTasks` composable 同步 | 任何修改（拖拽/编辑/删除）成功后重新拉取看板与统计 |

显著不引入的东西：不做 WebSocket 实时推送（多标签页非需求），不引入 UI 组件库与拖拽依赖（原生 HTML5 Drag & Drop + 无障碍键盘/移动端兜底按钮）。

## 3. 数据模型（SQLite）

```sql
CREATE TABLE tasks (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL CHECK (status IN ('todo','in_progress','done')),
  priority    TEXT NOT NULL CHECK (priority IN ('high','medium','low')),
  due_date    TEXT,              -- 'YYYY-MM-DD' 或 NULL
  created_at  TEXT NOT NULL,     -- ISO8601 UTC
  updated_at  TEXT NOT NULL
);
CREATE INDEX idx_tasks_status ON tasks(status);
```

### 任务对象（API JSON）

```jsonc
{
  "id": "b34c99a2-…",
  "title": "整理需求",
  "description": "…",
  "status": "todo",            // todo | in_progress | done
  "priority": "medium",        // high | medium | low
  "dueDate": "2026-11-30",     // 或 null
  "createdAt": "2026-11-07T04:00:00.000Z",
  "updatedAt": "2026-11-07T04:00:00.000Z"
}
```

状态与优先级为固定枚举（`待办/进行中/已完成` ↔ `todo/in_progress/done`；`高/中/低` ↔ `high/medium/low`）。无隐式状态机：`PATCH` 允许任意在三个状态间切换（看板拖拽可达任意列），这与看板交互一致。

## 4. REST API 契约

统一响应包：

```jsonc
// 成功
{ "data": <T> }
// 失败（HTTP 状态随 code 变化）
{ "error": { "code": "TASK_NOT_FOUND", "message": "…", "details": <字段级错误数组|null> } }
```

统一错误码：`VALIDATION_ERROR`(400)，`TASK_NOT_FOUND`(404)，`INVALID_JSON`(400)，`INTERNAL_ERROR`(500)；`details` 为 `{ path, message }[]`（仅校验错误）。

### `GET /api/tasks`

查询参数（所有可选，非法值 → `VALIDATION_ERROR`）：

- `keyword`: 非空字符串，按 `title`/`description` 子串（大小写不敏感）
- `status`: `todo|in_progress|done`
- `priority`: `high|medium|low`
- `sort`: `createdAt|updatedAt|dueDate`（默认 `createdAt`；`dueDate` 为 `NULL` 的排最后）
- `order`: `asc|desc`（默认 `desc`）
- 返回：`{ "data": { "items": Task[], "total": number } }`

### `POST /api/tasks`

Body（JSON）：

| 字段 | 必填 | 规则 |
| --- | --- | --- |
| `title` | 是 | 字符串 1..100，去除首尾空白 |
| `description` | 否 | 字符串 0..2000，默认 `''` |
| `status` | 否 | `todo|in_progress|done`，缺省 `todo` |
| `priority` | 否 | `high|medium|low`，缺省 `medium` |
| `dueDate` | 否 | `YYYY-MM-DD` 或 `null`，代表截止日期 |

返回 201 `{ "data": Task }`。

### `GET /api/tasks/:id` / `PATCH /api/tasks/:id`

- `GET` 返回 200 `{ "data": Task }`；不存在 → 404 `TASK_NOT_FOUND`。
- `PATCH` 接受以下字段的可选组合，**至少一个字段**，否则 `VALIDATION_ERROR`：`title`、`description`、`status`、`priority`、`dueDate`；成功返回 200 最新任务，更新 `updatedAt`；不存在 → 404。
- 字段错误：空 title、超长、未知枚举值、`dueDate` 非法格式均返回 400，且不执行任何写操作。

### `DELETE /api/tasks/:id`

- 存在 → `204 No Content`（响应体为空）；不存在 → 404 `TASK_NOT_FOUND`。

### `GET /api/stats`

返回真实聚合数据：

```jsonc
{ "data": {
  "total": 12, "todo": 5, "inProgress": 3, "done": 4,
  "doneRate": 33.33, "overdue": 2
} }
```

- `overdue`：`due_date < 今天(本地)` 且 `status != 'done'` 的任务数。
- `doneRate`：`round(done/total*10000)/100`（百分比，保留两位；`total=0` 时为 `0`）。

### `GET /api/health`

`{ "data": { "status": "ok" } }`，无鉴权，供探活与 CI 冒烟。

## 5. 前端设计

- 单页看板视图 + 模态编辑：顶部统计卡（6 个指标）→ 工具栏（关键词搜索、状态/优先级筛选、按截止日期排序、新建任务按钮）→ 三列看板。
- 视觉规范（Issue #3 指定）：白色背景、简洁科技感、主色 `#165DFF`，整洁留白，适度图标，桌面与移动端自适应（>=992px 三列并排，<992px 单列纵向堆叠）。
- 交互：原生 drag-and-drop 移动卡片修改状态；移动端/键盘提供卡片下拉“移至”操作；新建/编辑弹窗用表单校验；删除弹窗二次确认。
- 状态展示：加载骨架/指示、错误横幅（可重试）、空列/空筛选提示。
- 数据同步机制：任何变更成功后，`useTasks` 重新拉取任务列表与统计（乐观更新仅用于演示意图不做，保证真实同步）。

## 6. 测试策略

- **服务端集成测试**（`apps/server/test/*.test.ts`）：
  - 内存 SQLite（`:memory:`）+ `buildApp()`，覆盖全部路由的合法/非法参数、400/404/204、聚合统计精度与逾期边界、持久化（真实临时目录文件重启后数据保留）、筛选排序语义。
- **共享/前端纯函数测试**（`apps/web/test/*.test.ts`）：过滤器组合排序、逾期判断、表单校验等纯逻辑优先放 `apps/web/src/utils`，避免依赖 DOM。
- 组件测试：`@vue/test-utils` + `jsdom` 覆盖看板交互（点击删除弹出确认、表单提交调用 API、筛选变更触发刷新）。
- **CI**：`pnpm -r typecheck && pnpm -r test && pnpm -r build`（外加 pnpm 缓存、Node 24）。

## 7. 风险与备注

- 不做用户系统 / 多人编辑冲突任务，超出 Issue 范围。
- `node:sqlite` 要求 Node >= 22.5（CI 与 README 明确 Node 24）。
- 删除任务为物理删除（Issue 未要求回收站）。
- 服务重启后任务不丢（真实 SQLite 文件）+ 可选演示数据命令：`pnpm --filter @kanban/server run db:seed` 提供初始本地数据。

## 8. 视觉证据基线

改动前仓库仅含 README（无任何前端产物，见 git 历史 `03aa491`/`1d5495d`），本 PR 的 UI 为从零实现，因此“Before”截图不存在真实业务界面；After 截图覆盖桌面看板 + 移动端，并附上统计/筛选/拖拽等状态。
