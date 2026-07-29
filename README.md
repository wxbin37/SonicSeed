# 声因 Sonic Seed

声因是一款面向音乐创作者的 AI 灵感管理与 Demo 创作工具原型。

当前网页重构为三页式产品原型：

- 入口页：仅保留居中标题、“灵感库”和“开始创作”两个主按钮
- 开始创作页：左侧创作历史列表，右侧 Codex 风格创作工作台
- AI 分析后台：实时沉淀主题、情绪、场景、适用位置和数据流状态
- Demo 成品区：保留可播放版本、试听反馈、协作进度和新分支入口
- 灵感库页：管理旋律、歌词、画面、声音等个人音乐基因

核心链路：

```text
浏览器录音/上传 -> 应用后端 -> 音频校验与转码 -> 旋律分析 -> DeepSeek Brief -> Mureka/MiniMax -> 数据库与音频存储 -> 分享页
```

## 运行

```bash
pnpm install
pnpm run dev
pnpm run build
```

## Netlify 部署

项目已包含 `netlify.toml`，在 Netlify 导入 GitHub 仓库后使用以下设置：

- Build command: `pnpm run build:netlify`
- Publish directory: `.next`
- Node version: `22`

## 设计约束

页面按同目录 `design.md` 的 QQ 音乐 token 落地：深色背景、实色卡片、品牌绿高亮、PingFang SC 字体栈、20px 大容器圆角、12px 间距节奏和柔和阴影。

视觉实现不使用渐变背景、不使用玻璃态、不使用 emoji 图标；界面图标来自 `lucide-react`。
