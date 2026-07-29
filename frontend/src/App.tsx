import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  Clock3,
  Database,
  GitBranch,
  HardDrive,
  Headphones,
  Image as ImageIcon,
  Library,
  Link2,
  ListMusic,
  MessageCircle,
  Mic,
  Music2,
  Paperclip,
  Play,
  Plus,
  Radio,
  RefreshCw,
  Send,
  Server,
  Share2,
  Tags,
  Type,
  Upload,
  UsersRound,
} from "lucide-react";
import {
  analyzeInspiration,
  createDemoTask,
  getApiConnectionLabel,
  type AnalysisTag,
  type BriefResponse,
  type InputMode,
} from "./api";

type InputSource = {
  id: InputMode;
  label: string;
  icon: LucideIcon;
  placeholder: string;
  hint: string;
};

type Project = {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  progress: number;
  owner: string;
  updated: string;
};

type DemoVersion = {
  title: string;
  meta: string;
  note: string;
  status: string;
};

const inputSources: InputSource[] = [
  {
    id: "dialogue",
    label: "对话",
    icon: MessageCircle,
    placeholder: "直接说清楚你想要的歌：情绪、故事、参考曲、不要什么。",
    hint: "自然语言会先整理成创作 Brief",
  },
  {
    id: "text",
    label: "文字",
    icon: Type,
    placeholder: "写一句歌词、一段故事，或一个模糊的风格方向。",
    hint: "保留原文，同时生成主题和标签",
  },
  {
    id: "humming",
    label: "哼唱",
    icon: Mic,
    placeholder: "录一段旋律，或上传 MP3、M4A、WAV、WebM。",
    hint: "服务端统一转码后提取旋律轮廓",
  },
  {
    id: "image",
    label: "图片",
    icon: ImageIcon,
    placeholder: "上传一张能代表情绪的照片，补充你想保留的画面细节。",
    hint: "画面会转成场景、意象和氛围参考",
  },
  {
    id: "voice",
    label: "语音",
    icon: Radio,
    placeholder: "口述故事、编曲要求、协作者反馈，AI 会整理成可执行修改点。",
    hint: "适合长描述和协作反馈回流",
  },
];

const projects: Project[] = [
  {
    id: "city-leave",
    title: "离开城市之前",
    subtitle: "副歌哼唱 + 两句歌词",
    status: "Mureka 伴奏生成中",
    progress: 68,
    owner: "我",
    updated: "2分钟前",
  },
  {
    id: "midnight-hook",
    title: "凌晨副歌接力",
    subtitle: "合作方正在改 Hook",
    status: "等待歌词确认",
    progress: 42,
    owner: "林雨",
    updated: "12分钟前",
  },
  {
    id: "taxi-rain",
    title: "雨夜出租车 Demo",
    subtitle: "V1 试听反馈沉淀",
    status: "准备生成分支",
    progress: 86,
    owner: "陈舟",
    updated: "今天 15:20",
  },
  {
    id: "station-noise",
    title: "站台采样 Intro",
    subtitle: "声音卡待清理",
    status: "音频预处理中",
    progress: 24,
    owner: "我",
    updated: "昨天 22:08",
  },
];

const initialTags: AnalysisTag[] = [
  {
    label: "主题",
    value: "离开一座生活很久的城市",
    detail: "告别、重逢、未完成关系",
  },
  {
    label: "情绪",
    value: "克制、不舍、后半段释放",
    detail: "副歌需要更开阔的能量",
  },
  {
    label: "场景",
    value: "雨夜、出租车、霓虹、站台",
    detail: "适合保留环境声作为 Intro",
  },
  {
    label: "适用位置",
    value: "主歌结尾 / 副歌 Hook",
    detail: "原句建议作为 Hook 落点",
  },
];

const dataFlow = [
  "浏览器录音 / 上传",
  "应用后端",
  "音频校验与转码",
  "旋律分析",
  "DeepSeek Brief",
  "Mureka / MiniMax",
  "数据库与音频存储",
  "分享页",
];

const stack = [
  { label: "前端", value: "Vite React + MediaRecorder", icon: Upload },
  { label: "后端", value: "Python FastAPI 服务", icon: Server },
  { label: "音频", value: "FFmpeg 转码 + YIN/pYIN", icon: Music2 },
  { label: "数据", value: "SQLite -> PostgreSQL", icon: Database },
  { label: "文件", value: "本地卷 -> COS / OSS", icon: HardDrive },
  { label: "状态", value: "轮询，可选 SSE", icon: RefreshCw },
];

const initialDemos: DemoVersion[] = [
  {
    title: "Demo V1",
    meta: "都市流行 · 76 BPM · 钢琴与电子氛围",
    note: "主歌情绪对了，副歌鼓组还需要更轻。",
    status: "已试听 6 次",
  },
  {
    title: "Demo V2",
    meta: "Instrumental · Mureka task_48",
    note: "等待生成完成后自动保存到成品区。",
    status: "生成中",
  },
  {
    title: "Hook 分支",
    meta: "合作方改词 · 编辑权限链接",
    note: "林雨正在把第二句改得更口语。",
    status: "协作中",
  },
];

const libraryCards = [
  {
    type: "旋律",
    title: "凌晨副歌哼唱01",
    meta: "BPM 76 · A小调 · Hook",
    status: "可进入编曲",
    icon: Music2,
  },
  {
    type: "歌词",
    title: "像明天还会见",
    meta: "告别 · 城市夜晚 · 主歌结尾",
    status: "待发展",
    icon: Type,
  },
  {
    type: "画面",
    title: "雨夜出租车照片",
    meta: "霓虹 · 离开深圳 · 克制",
    status: "已关联 Demo",
    icon: ImageIcon,
  },
  {
    type: "声音",
    title: "风噪与站台广播",
    meta: "现场采样 · Intro 参考",
    status: "待清理",
    icon: Radio,
  },
];

function HomePage() {
  return (
    <main className="home-shell" aria-label="声因入口">
      <section className="entry-panel" aria-label="主入口">
        <h1>声因</h1>
        <nav className="home-actions" aria-label="页面入口">
          <a className="entrance-button secondary" href="/library">
            <Library size={20} />
            灵感库
          </a>
          <a className="entrance-button primary" href="/create">
            <Play size={20} />
            开始创作
          </a>
        </nav>
      </section>
    </main>
  );
}

function CreatePage() {
  const [activeMode, setActiveMode] = useState<InputMode>("humming");
  const [activeProjectId, setActiveProjectId] = useState(projects[0].id);
  const [draft, setDraft] = useState("我们把告别说得像明天还会见。");
  const [analysisTags, setAnalysisTags] = useState<AnalysisTag[]>(initialTags);
  const [brief, setBrief] = useState<BriefResponse | null>(null);
  const [analysisState, setAnalysisState] = useState("等待输入");
  const [demos, setDemos] = useState<DemoVersion[]>(initialDemos);

  const activeSource = useMemo(
    () => inputSources.find((source) => source.id === activeMode) ?? inputSources[2],
    [activeMode],
  );

  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId) ?? projects[0],
    [activeProjectId],
  );

  async function handleAnalyze() {
    setAnalysisState("分析中");
    try {
      const nextBrief = await analyzeInspiration({
        projectId: activeProject.id,
        mode: activeMode,
        content: draft,
      });

      setBrief(nextBrief);
      setAnalysisTags(nextBrief.tags);
      setAnalysisState(nextBrief.source === "backend" ? "后端已同步" : "本地模拟完成");
    } catch {
      setAnalysisState("后端请求失败，保留当前标签");
    }
  }

  async function handleCreateDemo() {
    const referenceBrief =
      brief ??
      ({
        source: "local",
        title: activeProject.title,
        summary: "使用当前工作台内容生成 Demo 任务。",
        tags: analysisTags,
        suggestedStyle: "都市流行 / 中慢速 / 轻鼓组",
        dataFlow,
      } satisfies BriefResponse);

    setAnalysisState("创建 Demo 任务");
    try {
      const task = await createDemoTask({
        projectId: activeProject.id,
        prompt: draft,
        referenceBrief,
      });

      setDemos((current) => [
        {
          title: `Demo ${current.length + 1}`,
          meta: `任务 ${task.taskId} · ${task.status}`,
          note: task.message,
          status: "新任务",
        },
        ...current,
      ]);
      setAnalysisState("Demo 任务已创建");
    } catch {
      setAnalysisState("Demo 任务创建失败");
    }
  }

  return (
    <main className="create-shell" aria-label="开始创作">
      <header className="studio-topbar">
        <a className="icon-link" href="/" aria-label="返回首页">
          <ArrowLeft size={19} />
        </a>
        <h1>创作工作台</h1>
        <button className="icon-button" type="button" aria-label="分享创作空间">
          <Share2 size={18} />
        </button>
      </header>

      <section className="studio-layout">
        <aside className="history-sidebar" aria-label="创作历史记录列表">
          <div className="panel-heading">
            <div>
              <p>协作空间</p>
              <h2>创作历史</h2>
            </div>
            <button className="tiny-button" type="button" aria-label="新建创作">
              <Plus size={17} />
            </button>
          </div>

          <div className="history-list">
            {projects.map((project) => (
              <button
                className="history-item"
                data-active={project.id === activeProjectId}
                key={project.id}
                onClick={() => setActiveProjectId(project.id)}
                type="button"
              >
                <span className="history-meta">
                  <ListMusic size={14} />
                  {project.updated}
                </span>
                <strong>{project.title}</strong>
                <em>{project.subtitle}</em>
                <span className="progress-track" aria-label={`${project.title}进度 ${project.progress}%`}>
                  <span style={{ width: `${project.progress}%` }} />
                </span>
                <span className="history-footer">
                  <span>
                    <UsersRound size={14} />
                    {project.owner}
                  </span>
                  <span>{project.status}</span>
                </span>
              </button>
            ))}
          </div>

          <button className="share-link" type="button">
            <Link2 size={16} />
            复制协作链接
          </button>
        </aside>

        <section className="studio-main" aria-label="创作工作区">
          <section className="workbench-panel" aria-label="Codex 风格创作工作台">
            <div className="panel-heading compact">
              <div>
                <p>工作台</p>
                <h2>{activeProject.title}</h2>
              </div>
              <span className="status-pill">
                <Bot size={14} />
                {analysisState}
              </span>
            </div>

            <div className="chat-window" aria-label="创作对话">
              <article className="chat-message user">
                <span>{activeProject.subtitle}</span>
                <p>{draft || activeSource.placeholder}</p>
              </article>
              <article className="chat-message ai">
                <span>
                  <Bot size={14} />
                  DeepSeek Brief
                </span>
                <p>
                  {brief?.summary ??
                    "已保留原始灵感，并拆成歌词、旋律参考、情绪曲线和可执行编曲方向。输入后会实时更新右侧分析。"}
                </p>
              </article>
            </div>

            <div className="source-toolbar" aria-label="输入源">
              {inputSources.map(({ id, label, icon: Icon }) => (
                <button
                  data-active={activeMode === id}
                  key={id}
                  onClick={() => setActiveMode(id)}
                  type="button"
                >
                  <Icon size={18} />
                  {label}
                </button>
              ))}
            </div>

            <div className="composer-box">
              <div className="composer-context">
                <Tags size={15} />
                <span>{activeSource.hint}</span>
              </div>
              <textarea
                aria-label="输入灵感"
                onChange={(event) => setDraft(event.target.value)}
                placeholder={activeSource.placeholder}
                value={draft}
              />
              <div className="composer-actions">
                <button className="utility-button" type="button">
                  <Paperclip size={16} />
                  上传素材
                </button>
                <button className="utility-button" onClick={handleCreateDemo} type="button">
                  <Headphones size={16} />
                  创建 Demo 任务
                </button>
                <button className="send-button" onClick={handleAnalyze} type="button">
                  <Send size={16} />
                  发送给 AI 分析
                </button>
              </div>
            </div>
          </section>

          <aside className="analysis-panel" aria-label="AI 分析后台">
            <div className="panel-heading compact">
              <div>
                <p>实时标签</p>
                <h2>AI 分析后台</h2>
              </div>
              <span className="analysis-dot" aria-hidden="true" />
            </div>

            <span className="backend-chip">
              <Server size={14} />
              {getApiConnectionLabel()}
            </span>

            <div className="analysis-list">
              {analysisTags.map((item) => (
                <article className="analysis-item" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  <p>{item.detail}</p>
                </article>
              ))}
            </div>

            <div className="flow-panel" aria-label="数据流">
              <h3>数据流</h3>
              <ol>
                {(brief?.dataFlow ?? dataFlow).map((step) => (
                  <li key={step}>
                    <CheckCircle2 size={14} />
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            <div className="stack-grid" aria-label="前后台架构">
              {stack.map(({ label, value, icon: Icon }) => (
                <div key={label}>
                  <Icon size={16} />
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </aside>

          <section className="demo-panel" aria-label="Demo成品区">
            <div className="panel-heading compact">
              <div>
                <p>可播放版本</p>
                <h2>Demo 成品区</h2>
              </div>
              <span className="status-pill">
                <Headphones size={14} />
                可反复试听
              </span>
            </div>

            <div className="demo-list">
              {demos.map((demo) => (
                <article className="demo-item" key={`${demo.title}-${demo.meta}`}>
                  <button className="play-button" type="button" aria-label={`播放 ${demo.title}`}>
                    <Play size={18} />
                  </button>
                  <div>
                    <span className="demo-status">
                      <Clock3 size={13} />
                      {demo.status}
                    </span>
                    <h3>{demo.title}</h3>
                    <p>{demo.meta}</p>
                    <em>{demo.note}</em>
                  </div>
                  <button className="branch-button" type="button">
                    <GitBranch size={15} />
                    新分支
                  </button>
                </article>
              ))}
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}

function LibraryPage() {
  return (
    <main className="library-shell" aria-label="灵感库">
      <header className="studio-topbar">
        <a className="icon-link" href="/" aria-label="返回首页">
          <ArrowLeft size={19} />
        </a>
        <h1>灵感库</h1>
        <a className="icon-link" href="/create" aria-label="开始创作">
          <Play size={18} />
        </a>
      </header>

      <section className="library-hero">
        <div>
          <p>个人音乐基因库</p>
          <h2>128 条灵感，42 条已建立关系，9 个可播放 Demo。</h2>
        </div>
        <div className="tag-cluster">
          {["告别", "R&B", "城市夜晚", "Hook", "雨夜"].map((tag) => (
            <span key={tag}>
              <Tags size={12} />
              {tag}
            </span>
          ))}
        </div>
      </section>

      <section className="library-grid">
        {libraryCards.map(({ type, title, meta, status, icon: Icon }) => (
          <article className="library-tile" key={title}>
            <span className="tile-icon">
              <Icon size={21} />
            </span>
            <p>{type}</p>
            <h3>{title}</h3>
            <span>{meta}</span>
            <strong>{status}</strong>
          </article>
        ))}
      </section>
    </main>
  );
}

export default function App() {
  const pathname = window.location.pathname;

  if (pathname.startsWith("/create")) {
    return <CreatePage />;
  }

  if (pathname.startsWith("/library")) {
    return <LibraryPage />;
  }

  return <HomePage />;
}
