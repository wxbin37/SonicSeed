# 声因 Sonic Seed

声因是一款面向音乐创作者的 AI 灵感管理与 Demo 创作工具原型。

当前网页重构为三页式产品原型：

- 入口页：沉浸式声场首屏，仅保留“灵感库”和“开始创作”两个主按钮
- 开始创作页：对话、文字、哼唱、图片、语音五种输入方式
- 协作空间：展示创作列表、共享进度、分享链接、版本分支和前后台任务链路
- 灵感库页：管理旋律、歌词、画面、声音等个人音乐基因

核心链路：

```text
一段哼唱 -> AI 理解与编曲 -> 可播放 Demo -> 合作方继续创作
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
