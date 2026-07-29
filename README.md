# 声因 Sonic Seed

声因是一款面向音乐创作者的 AI 灵感管理与 Demo 协作创作工具。

本仓库已重构为前后端分离：

- `frontend/`：Vite React 前端，部署到 Netlify
- `backend/`：Python FastAPI 后端，部署到 Render / Railway / Fly.io / Cloud Run / VPS

核心链路：

```text
浏览器录音/上传 -> Python 后端 -> 音频校验与转码 -> 旋律分析 -> DeepSeek Brief -> Mureka/MiniMax -> 数据库与音频存储 -> 分享页
```

## 本地运行

前端：

```bash
pnpm install
pnpm run dev
```

后端：

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

前端连接后端：

```bash
cd frontend
echo "VITE_API_BASE_URL=http://localhost:8000" > .env.local
```

如果不配置 `VITE_API_BASE_URL`，前端会使用本地模拟分析，便于先验收界面。

## Netlify 前端部署

仓库根目录已经配置 `netlify.toml`：

- Base directory: `frontend`
- Build command: `pnpm build`
- Publish directory: `dist`
- Node version: `22`

在 Netlify 的环境变量里添加：

```text
VITE_API_BASE_URL=https://your-python-api.example.com
```

## Python 后端部署

后端入口：

```text
backend/app/main.py
```

部署平台启动命令：

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

需要配置的环境变量见：

```text
backend/.env.example
```

如果前端域名不是 `https://museed.netlify.app`，需要把新的 Netlify 域名追加到后端 `CORS_ORIGINS`，否则浏览器会拦截前端请求。

当前后端已提供最小 API 契约：

- `GET /api/health`
- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/{project_id}/workspace`
- `PUT /api/projects/{project_id}/workspace`
- `POST /api/share-links`
- `POST /api/share-links/{token}/join`
- `GET /api/projects/{project_id}/collaboration-sessions`
- `GET /api/collaboration-sessions/{session_id}`
- `PATCH /api/collaboration-sessions/{session_id}`
- `POST /api/brief`
- `GET /api/inspirations`
- `POST /api/inspirations`
- `POST /api/uploads`
- `POST /api/demo-tasks`
- `GET /api/demo-tasks`
- `GET /api/demo-tasks/{task_id}`

## SQLite 数据结构

后端默认使用 SQLite 持久化，路径由 `SONIC_SEED_DB_PATH` 控制，默认是 `backend/data/sonicseed.sqlite3`。前端配置 `VITE_API_BASE_URL` 后，会从这些接口读取后台数据；浏览器 `localStorage` 只作为未连接后端时的离线缓存。

`projects` 保存创作历史 / 协作空间：

| 字段 | 含义 |
| --- | --- |
| `id` | 创作空间唯一 ID，分享链接和前端选中项目都靠它定位 |
| `title` | 创作标题 |
| `subtitle` | 摘要或当前素材说明 |
| `status` | 当前进度状态，如“创作中”“生成失败”“已有可听版本” |
| `progress` | 0-100 的进度数字 |
| `owner` | 当前创建者或负责人显示名 |
| `updated` | 给界面显示的更新时间文案 |
| `creator_client_id` | 创建者浏览器身份 ID；当前无登录系统时用于限制“只有创建者可分享” |
| `created_at` / `updated_at` | 后台真实创建 / 更新时间 |

`project_workspaces` 保存创建者主工作台的完整状态：

| 字段 | 含义 |
| --- | --- |
| `project_id` | 创作空间 ID，也是主键 |
| `client_id` | 最后保存主工作台的创建者浏览器身份 ID |
| `workbench_json` | 完整工作台快照：聊天记录、AI 标签、草稿、Brief、版本列表、当前版本 |
| `created_at` / `updated_at` | 后台真实创建 / 更新时间 |

`inspirations` 保存灵感库：

| 字段 | 含义 |
| --- | --- |
| `id` | 灵感卡唯一 ID |
| `project_id` | 所属创作空间 ID，对应前端 `projectId` |
| `title` | 灵感标题 |
| `content` | 原始文字、说明或附件上下文 |
| `attachments_json` | 附件列表 JSON，包含 `type`、`name`、`uploadId` |
| `tags_json` | AI 标签 JSON，包含主题、情绪、场景、适用位置 |
| `created_at` | 创建时间 |

`demo_tasks` 保存生成版本 / Demo 历史：

| 字段 | 含义 |
| --- | --- |
| `id` | 后台任务 ID，对应前端 `taskId` |
| `project_id` | 所属创作空间 ID |
| `status` | `queued` / `running` / `succeeded` / `failed` |
| `message` | 给用户看的任务状态说明 |
| `progress` | 0-100 任务进度 |
| `audio_url` | 供应商返回的音频地址，后续应转存到对象存储 |
| `lyrics` | 本次生成使用或返回的歌词文本 |
| `provider` | 音乐模型供应商，如 MiniMax |
| `trace_id` | 供应商追踪 ID，用于排查错误 |
| `prompt` | 送给模型的生成描述 |
| `reference_brief_json` | 生成时使用的 AI Brief JSON |
| `created_at` / `updated_at` | 后台真实创建 / 更新时间 |

`share_links` 保存私域接力链接：

| 字段 | 含义 |
| --- | --- |
| `token` | 分享链接令牌，对应前端 URL 的 `share` 参数 |
| `project_id` | 被分享的创作空间 ID |
| `creator_client_id` | 创建该链接的浏览器身份 ID |
| `status` | 链接状态，当前使用 `active` |
| `created_at` / `updated_at` | 后台真实创建 / 更新时间 |

`collaboration_sessions` 保存协作者接力进度：

| 字段 | 含义 |
| --- | --- |
| `id` | 协作者会话 ID |
| `share_token` | 对应 `share_links.token` |
| `project_id` | 所属创作空间 ID |
| `creator_client_id` | 原创作空间创建者 ID |
| `collaborator_client_id` | 协作者浏览器身份 ID |
| `collaborator_name` | 协作者显示名 |
| `status` | 协作者当前状态，如“实时分析中”“已加入灵感库” |
| `progress` | 0-100 的接力进度 |
| `last_message` | 最近一次修改摘要 |
| `workbench_json` | 协作者完整工作台快照：聊天、AI 标签、草稿、版本、当前版本 |
| `created_at` / `updated_at` | 后台真实创建 / 更新时间 |

音乐生成走后端调用 MiniMax，不会在前端暴露密钥。未配置 `MINIMAX_API_KEY` 时，生成版本会返回明确失败状态，不会把固定样例伪装成 AI 结果。需要在后端平台配置：

```text
MINIMAX_API_KEY=...
MINIMAX_BASE_URL=https://api.minimaxi.com
MINIMAX_MUSIC_MODEL=music-3.0
```

MiniMax 返回的 URL 有有效期，生产环境需要把音频保存到 COS / OSS / S3 等对象存储，再把持久地址写入数据库。

## 设计约束

页面继续按同目录 `design.md` 的 QQ 音乐 token 落地：深色背景、实色卡片、品牌绿高亮、PingFang SC 字体栈、20px 大容器圆角、12px 间距节奏和柔和阴影。

视觉实现不使用渐变背景、不使用玻璃态、不使用 emoji 图标；界面图标来自 `lucide-react`。
