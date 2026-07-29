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

当前后端已提供最小 API 契约：

- `GET /api/health`
- `GET /api/projects`
- `POST /api/projects`
- `POST /api/brief`
- `GET /api/inspirations`
- `POST /api/inspirations`
- `POST /api/uploads`
- `POST /api/demo-tasks`
- `GET /api/demo-tasks/{task_id}`

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
