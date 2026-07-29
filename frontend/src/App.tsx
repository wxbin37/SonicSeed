import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Database,
  Ellipsis,
  FolderPlus,
  GitBranch,
  HardDrive,
  Headphones,
  Image as ImageIcon,
  Library,
  LayoutGrid,
  Link2,
  List,
  ListMusic,
  MessageCircle,
  Mic,
  Music2,
  Network,
  Paperclip,
  Play,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Send,
  Server,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Tags,
  Type,
  Upload,
  UsersRound,
  X,
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

type InspirationKind = "歌词句" | "哼唱" | "旋律" | "故事" | "图片" | "环境声音" | "创作反馈" | "Demo";

type Inspiration = {
  id: string;
  kind: InspirationKind;
  title: string;
  excerpt: string;
  tags: string[];
  theme: string;
  emotion: string;
  scene: string;
  genre: string;
  status: "待发展" | "已关联" | "已用于 Demo";
  project: string;
  relations: number;
  updatedDays: number;
  duration?: string;
  coreImagery?: string;
  melodyFeatures?: string;
  creationPosition?: string;
  usage?: string;
  originalContent?: string;
  originalDialogue?: string[];
  dialogueSummary?: string;
  relationSuggestion?: string;
  icon: LucideIcon;
};

type LibraryView = "navigation" | "graph";
type LibraryLayout = "grid" | "list";

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

const inspirations: Inspiration[] = [
  {
    id: "morning-hook",
    kind: "哼唱",
    title: "清晨副歌哼唱 01",
    excerpt: "一段向上抬升后突然留白的副歌旋律，第二遍可以增加高音爆发。",
    tags: ["哼唱", "短句 Hook", "中慢速", "副歌"],
    theme: "重逢",
    emotion: "释然",
    scene: "清晨",
    genre: "流行",
    status: "待发展",
    project: "离开城市之前",
    relations: 3,
    updatedDays: 0,
    duration: "0:32",
    coreImagery: "晨光、空车厢、逐渐远去的站台",
    melodyFeatures: "上行短句 Hook、高音爆发、节奏记忆点",
    creationPosition: "副歌 / 高潮",
    usage: "核心素材、保留旋律",
    originalContent: "一段 32 秒的清唱录音，第二遍旋律比第一遍高一个发展层级。",
    originalDialogue: ["我想先记下这个副歌，像是忍了很久之后终于说出口。", "已保留原始录音，建议将第二遍上行旋律作为副歌高潮。"],
    relationSuggestion: "适合与「把告别说得像明天还会见」组合成副歌。",
    icon: Music2,
  },
  {
    id: "tomorrow-line",
    kind: "歌词句",
    title: "把告别说得像明天还会见",
    excerpt: "我们把告别说得像明天还会见。",
    tags: ["歌词句", "告别", "克制", "Hook"],
    theme: "告别",
    emotion: "克制",
    scene: "车站",
    genre: "流行",
    status: "已关联",
    project: "离开城市之前",
    relations: 4,
    updatedDays: 1,
    coreImagery: "车票、站台、没有说出口的再见",
    creationPosition: "副歌 Hook / 主歌结尾",
    usage: "核心素材、保留原文、允许扩写",
    originalContent: "我们把告别说得像明天还会见。",
    originalDialogue: ["这句话先不要润色，我想保留那种故作轻松的感觉。", "原句已锁定，可围绕“明天还会见”扩写前后两句。"],
    dialogueSummary: "创作者希望保留原句故作轻松的告别感，不做润色，并围绕“明天还会见”扩写副歌前后两句。",
    relationSuggestion: "和「清晨副歌哼唱 01」主题一致，可作为旋律落点。",
    icon: Type,
  },
  {
    id: "taxi-window",
    kind: "图片",
    title: "出租车窗上的雨",
    excerpt: "霓虹在车窗水痕里断开，远处是最后一次路过的街口。",
    tags: ["图片", "雨夜", "霓虹灯", "孤独"],
    theme: "告别",
    emotion: "孤独",
    scene: "雨夜",
    genre: "电子",
    status: "已关联",
    project: "雨夜出租车 Demo",
    relations: 3,
    updatedDays: 2,
    coreImagery: "雨、霓虹灯、车窗倒影、空街",
    creationPosition: "视觉参考 / Intro",
    usage: "参考素材、提取情绪",
    originalContent: "一张雨夜车窗照片，画面主体是被水痕切开的绿色霓虹。",
    relationSuggestion: "可与站台环境声共同建立城市夜晚的开场氛围。",
    icon: ImageIcon,
  },
  {
    id: "station-ambience",
    kind: "环境声音",
    title: "末班车站台广播",
    excerpt: "列车进站前的风噪、提示音和一段模糊的人声广播。",
    tags: ["环境声音", "车站", "开场", "参考素材"],
    theme: "离开",
    emotion: "遗憾",
    scene: "车站",
    genre: "民谣",
    status: "待发展",
    project: "站台采样 Intro",
    relations: 2,
    updatedDays: 5,
    duration: "0:47",
    coreImagery: "末班车、提示灯、空站台",
    melodyFeatures: "广播提示音形成三音节动机，风噪可作节奏底纹",
    creationPosition: "开场 / 过渡",
    usage: "参考素材、提取环境声",
    originalContent: "47 秒现场录音，包含列车进站风噪、提示音和一段模糊广播。",
    relationSuggestion: "建议清理低频后加入 Demo V1 的前八小节。",
    icon: Radio,
  },
  {
    id: "last-goodnight",
    kind: "歌词句",
    title: "最后一句晚安",
    excerpt: "把所有的遗憾留给最后一句晚安。",
    tags: ["歌词句", "遗憾", "深夜", "收束"],
    theme: "告别",
    emotion: "遗憾",
    scene: "卧室",
    genre: "R&B",
    status: "待发展",
    project: "凌晨副歌接力",
    relations: 2,
    updatedDays: 8,
    coreImagery: "床头灯、未发送的消息、凌晨时钟",
    creationPosition: "收束 / 尾句",
    usage: "保留原文、参考素材",
    originalContent: "把所有的遗憾留给最后一句晚安。",
    originalDialogue: ["想把它放在最后一句，唱完以后伴奏直接停掉。"],
    dialogueSummary: "这条灵感来自结尾设计讨论：最后一句唱完后让伴奏直接停止，用突然的安静放大遗憾。",
    relationSuggestion: "与告别主题素材高度相似，可作为第二版结尾分支。",
    icon: Type,
  },
  {
    id: "leave-story",
    kind: "故事",
    title: "离开城市的那天",
    excerpt: "地铁口的风很大，我们各自往不同方向走，谁也没有回头。",
    tags: ["故事", "城市", "离开", "回忆"],
    theme: "告别",
    emotion: "克制",
    scene: "街道",
    genre: "民谣",
    status: "已关联",
    project: "离开城市之前",
    relations: 4,
    updatedDays: 12,
    coreImagery: "地铁口、逆向人群、被风吹动的衣角",
    creationPosition: "主歌叙事 / 转折",
    usage: "提取情绪、允许扩写",
    originalContent: "离开那天，地铁口的风很大。我们各自往不同的方向走去，谁也没有回头。",
    originalDialogue: ["这是一个真实片段，但不用写得太具体。", "可以保留地铁口和逆向行走两个动作，弱化人物身份。"],
    dialogueSummary: "灵感来自一段真实离别经历。创作时保留地铁口、风和两个人逆向行走的动作，同时弱化人物身份与具体背景。",
    relationSuggestion: "可补足「把告别说得像明天还会见」之前的主歌叙事。",
    icon: MessageCircle,
  },
  {
    id: "demo-v1",
    kind: "Demo",
    title: "离开城市之前 V1",
    excerpt: "钢琴与电子氛围的第一版编曲，副歌鼓组需要继续收敛。",
    tags: ["Demo", "都市流行", "保留原文", "过渡"],
    theme: "告别",
    emotion: "释放",
    scene: "城市夜晚",
    genre: "流行",
    status: "已用于 Demo",
    project: "离开城市之前",
    relations: 5,
    updatedDays: 15,
    duration: "1:12",
    coreImagery: "城市远景、车流、逐渐熄灭的灯",
    melodyFeatures: "76 BPM、A 小调、副歌长线条、段末留白",
    creationPosition: "完整 Demo",
    usage: "版本基底、保留旋律、继续演化",
    originalContent: "钢琴与电子氛围编曲，主歌保持近距离人声，副歌加入宽阔铺底。",
    relationSuggestion: "已融合 5 条灵感，下一版建议吸收副歌留白反馈。",
    icon: Play,
  },
  {
    id: "hook-feedback",
    kind: "创作反馈",
    title: "副歌需要留出呼吸",
    excerpt: "第二句以后不要立刻铺满，让主唱的尾音和环境声多停留两拍。",
    tags: ["创作反馈", "副歌", "留白", "参考素材"],
    theme: "成长",
    emotion: "热烈",
    scene: "舞台",
    genre: "摇滚",
    status: "已用于 Demo",
    project: "凌晨副歌接力",
    relations: 2,
    updatedDays: 24,
    creationPosition: "副歌 / 过渡",
    usage: "创作约束、版本修改",
    originalContent: "第二句以后不要立刻铺满，让主唱的尾音和环境声多停留两拍。",
    originalDialogue: ["现在副歌太满了，听不到歌词最后几个字。", "建议第二句尾部减少鼓组和铺底，让人声尾音多停留两拍。"],
    dialogueSummary: "试听 Demo 后发现副歌编曲过满，歌词尾字不清楚，因此建议第二句后减少鼓组和铺底，给人声尾音留出两拍空间。",
    relationSuggestion: "适用于「离开城市之前 V1」的下一条版本分支。",
    icon: MessageCircle,
  },
];

const graphLinks = [
  ["tomorrow-line", "morning-hook"],
  ["tomorrow-line", "taxi-window"],
  ["tomorrow-line", "last-goodnight"],
  ["tomorrow-line", "leave-story"],
  ["morning-hook", "demo-v1"],
  ["taxi-window", "demo-v1"],
  ["station-ambience", "demo-v1"],
  ["leave-story", "station-ambience"],
  ["demo-v1", "hook-feedback"],
] as const;

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
  const selectedInspirations = useMemo(() => {
    const selectedIds = new URLSearchParams(window.location.search)
      .get("inspirations")
      ?.split(",")
      .filter(Boolean);

    return selectedIds?.length
      ? inspirations.filter((inspiration) => selectedIds.includes(inspiration.id))
      : [];
  }, []);
  const [activeMode, setActiveMode] = useState<InputMode>("humming");
  const [activeProjectId, setActiveProjectId] = useState(projects[0].id);
  const [draft, setDraft] = useState(() =>
    selectedInspirations.length
      ? `请融合这些灵感继续创作：${selectedInspirations.map((item) => item.title).join("、")}。`
      : "我们把告别说得像明天还会见。",
  );
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

            {selectedInspirations.length > 0 && (
              <section className="selected-context" aria-label="已带入的灵感">
                <span>
                  <Sparkles size={15} />
                  已带入 {selectedInspirations.length} 条灵感
                </span>
                <div>
                  {selectedInspirations.map((item) => (
                    <span key={item.id}>{item.title}</span>
                  ))}
                </div>
              </section>
            )}

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

const filterGroups = [
  { id: "theme", label: "主题", options: ["全部主题", "告别", "成长", "重逢", "离开"] },
  { id: "emotion", label: "情绪", options: ["全部情绪", "克制", "遗憾", "释然", "孤独", "释放", "热烈"] },
  { id: "scene", label: "场景", options: ["全部场景", "雨夜", "车站", "卧室", "街道", "舞台", "清晨"] },
  { id: "genre", label: "曲风", options: ["全部曲风", "流行", "民谣", "R&B", "摇滚", "电子"] },
  { id: "status", label: "状态", options: ["全部状态", "待发展", "已关联", "已用于 Demo"] },
  { id: "time", label: "时间", options: ["全部时间", "今天", "7 天内", "30 天内"] },
] as const;

const graphPositions: Record<string, { x: number; y: number }> = {
  "tomorrow-line": { x: 48, y: 43 },
  "morning-hook": { x: 17, y: 28 },
  "taxi-window": { x: 77, y: 21 },
  "station-ambience": { x: 17, y: 69 },
  "last-goodnight": { x: 81, y: 51 },
  "leave-story": { x: 39, y: 73 },
  "demo-v1": { x: 64, y: 76 },
  "hook-feedback": { x: 88, y: 82 },
};

function InspirationPreview({ inspiration }: { inspiration: Inspiration }) {
  const [showFullSummary, setShowFullSummary] = useState(false);

  if (inspiration.kind === "图片") {
    return (
      <div className="inspiration-preview image-preview" aria-hidden="true">
        <ImageIcon size={30} />
        <span />
        <span />
        <span />
      </div>
    );
  }

  if (inspiration.duration) {
    return (
      <div className="inspiration-preview audio-preview" aria-label={`音频时长 ${inspiration.duration}`}>
        {inspiration.kind === "Demo" && (
          <span className="mini-play">
            <Play size={15} />
          </span>
        )}
        <span className="waveform" aria-hidden="true">
          {[8, 18, 12, 26, 20, 34, 17, 24, 11, 29, 19, 36, 16, 25, 9, 21, 14, 28].map((height, index) => (
            <i key={`${height}-${index}`} style={{ height }} />
          ))}
        </span>
        <small>{inspiration.duration}</small>
      </div>
    );
  }

  if (inspiration.dialogueSummary) {
    const canExpand = inspiration.dialogueSummary.length > 46;
    return (
      <div
        className="inspiration-preview dialogue-summary-preview"
        data-expanded={showFullSummary}
      >
        <span className="dialogue-summary-label">
          <MessageCircle size={14} />
          对话概括
        </span>
        <p>{inspiration.dialogueSummary}</p>
        {canExpand && (
          <button
            aria-expanded={showFullSummary}
            aria-label={`${showFullSummary ? "收起" : "展开"}${inspiration.title}的对话概括`}
            onClick={(event) => {
              event.stopPropagation();
              setShowFullSummary((current) => !current);
            }}
            type="button"
          >
            {showFullSummary ? "收起" : "展开"}
            <ChevronDown size={13} />
          </button>
        )}
      </div>
    );
  }

  return null;
}

function InspirationCard({
  inspiration,
  selected,
  layout,
  onToggle,
  onFocusGraph,
}: {
  inspiration: Inspiration;
  selected: boolean;
  layout: LibraryLayout;
  onToggle: () => void;
  onFocusGraph: () => void;
}) {
  const Icon = inspiration.icon;
  const [showDetails, setShowDetails] = useState(false);
  const [showOriginalDialogue, setShowOriginalDialogue] = useState(false);
  const profileFields = [
    ["核心主题", inspiration.theme],
    ["情绪", inspiration.emotion],
    ["场景", inspiration.scene],
    ["核心意象", inspiration.coreImagery],
    ["曲风", inspiration.genre],
    ["旋律特征", inspiration.melodyFeatures],
    ["创作位置", inspiration.creationPosition],
    ["使用方式", inspiration.usage],
  ].filter((field): field is [string, string] => Boolean(field[1]));

  return (
    <article
      className="inspiration-card"
      data-expanded={showDetails}
      data-inspiration-id={inspiration.id}
      data-layout={layout}
      data-selected={selected}
      onClick={onToggle}
    >
      <div className="inspiration-card-heading">
        <span className="kind-icon">
          <Icon size={19} />
        </span>
        <div>
          <p><span>灵感类型</span>{inspiration.kind}</p>
          <h3>{inspiration.title}</h3>
        </div>
        <button
          aria-label={selected ? `取消选择${inspiration.title}` : `选择${inspiration.title}`}
          aria-pressed={selected}
          className="selection-indicator"
          onClick={(event) => {
            event.stopPropagation();
            onToggle();
          }}
          type="button"
        >
          {selected ? <Check size={16} /> : null}
        </button>
      </div>

      <InspirationPreview inspiration={inspiration} />

      {inspiration.excerpt && (
        <section className="inspiration-section inspiration-overview">
          <span className="section-label">概况</span>
          <p>{inspiration.excerpt}</p>
          <div className="overview-actions">
            <button
              className="graph-jump-button"
              onClick={(event) => {
                event.stopPropagation();
                onFocusGraph();
              }}
              type="button"
            >
              <Network size={14} />
              图谱定位
            </button>
            <button
              aria-expanded={showDetails}
              className="details-toggle"
              onClick={(event) => {
                event.stopPropagation();
                setShowDetails((current) => {
                  if (current) setShowOriginalDialogue(false);
                  return !current;
                });
              }}
              type="button"
            >
              {showDetails ? "收起详情" : "展开详情"}
              <ChevronDown size={15} />
            </button>
          </div>
        </section>
      )}

      {showDetails && (
        <div className="inspiration-details">
          {profileFields.length > 0 && (
            <dl className="inspiration-profile" aria-label="创作画像">
              {profileFields.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          )}

          {(inspiration.originalContent || inspiration.originalDialogue?.length) && (
            <section className="inspiration-section original-section">
              <span className="section-label">原始内容</span>
              {inspiration.originalContent && <p>{inspiration.originalContent}</p>}
              {inspiration.originalDialogue?.length ? (
                <>
                  <button
                    aria-expanded={showOriginalDialogue}
                    className="dialogue-toggle"
                    onClick={(event) => {
                      event.stopPropagation();
                      setShowOriginalDialogue((current) => !current);
                    }}
                    type="button"
                  >
                    <MessageCircle size={14} />
                    {showOriginalDialogue ? "收起原始对话" : "查看原始对话"}
                    <ChevronDown size={14} />
                  </button>
                  {showOriginalDialogue && (
                    <div className="original-dialogue" onClick={(event) => event.stopPropagation()}>
                      {inspiration.originalDialogue.map((message, index) => (
                        <p data-speaker={index % 2 === 0 ? "user" : "ai"} key={message}>
                          <span>{index % 2 === 0 ? "我" : "AI"}</span>
                          {message}
                        </p>
                      ))}
                    </div>
                  )}
                </>
              ) : null}
            </section>
          )}

          {(inspiration.relationSuggestion || inspiration.project || inspiration.status) && (
            <section className="inspiration-section relation-section">
              {inspiration.relationSuggestion && (
                <div>
                  <span className="section-label">关联建议</span>
                  <p>{inspiration.relationSuggestion}</p>
                </div>
              )}
              {(inspiration.project || inspiration.status) && (
                <dl>
                  {inspiration.project && (
                    <div><dt>所属项目</dt><dd>{inspiration.project}</dd></div>
                  )}
                  {inspiration.status && (
                    <div><dt>状态</dt><dd data-status={inspiration.status}>{inspiration.status}</dd></div>
                  )}
                </dl>
              )}
            </section>
          )}

          <div className="inspiration-tags" aria-label="灵感标签">
            {inspiration.tags.map((tag, index) => (
              <span data-primary={index === 0} key={tag}>{tag}</span>
            ))}
          </div>

          <footer className="inspiration-card-footer">
            <span>关联 {inspiration.relations} 条</span>
            <button
              className="card-more-button"
              aria-label={`${inspiration.title}更多操作`}
              onClick={(event) => event.stopPropagation()}
              type="button"
            >
              <Ellipsis size={18} />
            </button>
          </footer>
        </div>
      )}
    </article>
  );
}

function LibraryPage() {
  const [view, setView] = useState<LibraryView>("navigation");
  const [layout, setLayout] = useState<LibraryLayout>("grid");
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [focusedGraphId, setFocusedGraphId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [relationMode, setRelationMode] = useState("主题");
  const [actionMessage, setActionMessage] = useState("");

  const filteredInspirations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return inspirations.filter((item) => {
      const matchesQuery =
        !normalizedQuery ||
        [item.title, item.excerpt, item.project, item.kind, ...item.tags]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesTheme = !filters.theme || item.theme === filters.theme;
      const matchesEmotion = !filters.emotion || item.emotion === filters.emotion;
      const matchesScene = !filters.scene || item.scene === filters.scene;
      const matchesGenre = !filters.genre || item.genre === filters.genre;
      const matchesStatus = !filters.status || item.status === filters.status;
      const matchesTime =
        !filters.time ||
        (filters.time === "今天" && item.updatedDays === 0) ||
        (filters.time === "7 天内" && item.updatedDays <= 7) ||
        (filters.time === "30 天内" && item.updatedDays <= 30);

      return matchesQuery && matchesTheme && matchesEmotion && matchesScene && matchesGenre && matchesStatus && matchesTime;
    });
  }, [filters, query]);

  const visibleGraphItems = useMemo(() => {
    const graphRoots = focusedGraphId ? [...selectedIds, focusedGraphId] : selectedIds;
    if (relationMode !== "当前灵感附近" || graphRoots.length === 0) {
      return filteredInspirations;
    }

    const nearby = new Set(graphRoots);
    graphLinks.forEach(([source, target]) => {
      if (nearby.has(source)) nearby.add(target);
      if (nearby.has(target)) nearby.add(source);
    });
    return filteredInspirations.filter((item) => nearby.has(item.id));
  }, [filteredInspirations, focusedGraphId, relationMode, selectedIds]);

  const visibleGraphIds = new Set(visibleGraphItems.map((item) => item.id));
  const selectedInspirations = inspirations.filter((item) => selectedIds.includes(item.id));
  const createHref = `/create?inspirations=${selectedIds.join(",")}`;

  function toggleSelection(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
    setActionMessage("");
  }

  function updateFilter(id: string, value: string) {
    setFilters((current) => ({ ...current, [id]: value.startsWith("全部") ? "" : value }));
  }

  function showRelations() {
    setView("graph");
    setRelationMode("当前灵感附近");
    setActionMessage("已在图谱中聚焦所选灵感及其关系");
  }

  function focusInGraph(id: string) {
    setFocusedGraphId(id);
    setView("graph");
    setRelationMode("当前灵感附近");
    window.setTimeout(() => {
      document.querySelector(`[data-node-id="${id}"]`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 0);
  }

  return (
    <main className="library-shell" aria-label="灵感库">
      <header className="studio-topbar library-topbar">
        <a className="icon-link" href="/" aria-label="返回首页">
          <ArrowLeft size={19} />
        </a>
        <div>
          <p>创作历史</p>
          <h1>灵感库</h1>
        </div>
        <a className="icon-link" href="/create" aria-label="开始创作">
          <Play size={18} />
        </a>
      </header>

      <section className="library-controls" aria-label="灵感库工具栏">
        <div className="library-search">
          <Search size={18} />
          <input
            aria-label="搜索灵感、标签或项目"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索灵感、标签或项目..."
            type="search"
            value={query}
          />
          {query && (
            <button aria-label="清空搜索" onClick={() => setQuery("")} type="button">
              <X size={16} />
            </button>
          )}
        </div>

        <div className="view-switcher" aria-label="视图切换">
          <button data-active={view === "navigation"} onClick={() => setView("navigation")} type="button">
            <LayoutGrid size={17} />
            导航视图
          </button>
          <button data-active={view === "graph"} onClick={() => setView("graph")} type="button">
            <Network size={17} />
            图谱视图
          </button>
        </div>

        <div className="filter-row">
          {filterGroups.map((group) => (
            <label className="filter-select" data-active={Boolean(filters[group.id])} key={group.id}>
              <span>{filters[group.id] || group.label}</span>
              <select
                aria-label={`按${group.label}筛选`}
                onChange={(event) => updateFilter(group.id, event.target.value)}
                value={filters[group.id] || group.options[0]}
              >
                {group.options.map((option) => <option key={option}>{option}</option>)}
              </select>
              <ChevronDown size={14} />
            </label>
          ))}

          {Object.values(filters).some(Boolean) && (
            <button className="clear-filters" onClick={() => setFilters({})} type="button">
              <X size={14} />
              清除筛选
            </button>
          )}

          {view === "navigation" && (
            <div className="layout-switcher" aria-label="卡片布局">
              <button aria-label="网格布局" data-active={layout === "grid"} onClick={() => setLayout("grid")} type="button">
                <LayoutGrid size={17} />
              </button>
              <button aria-label="列表布局" data-active={layout === "list"} onClick={() => setLayout("list")} type="button">
                <List size={18} />
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="library-summary">
        <div>
          <strong>{filteredInspirations.length}</strong>
          <span>条灵感</span>
          <span className="summary-divider" />
          <span>{inspirations.reduce((total, item) => total + item.relations, 0)} 条关系</span>
        </div>
        <span>{selectedIds.length ? `已选择 ${selectedIds.length} 条，可继续融合创作` : "选择灵感，发现新的创作组合"}</span>
      </section>

      {view === "navigation" ? (
        <section className="inspiration-grid" data-layout={layout} aria-label="灵感导航视图">
          {filteredInspirations.map((inspiration) => (
            <InspirationCard
              inspiration={inspiration}
              key={inspiration.id}
              layout={layout}
              onFocusGraph={() => focusInGraph(inspiration.id)}
              onToggle={() => toggleSelection(inspiration.id)}
              selected={selectedIds.includes(inspiration.id)}
            />
          ))}
          {filteredInspirations.length === 0 && (
            <div className="library-empty">
              <Search size={24} />
              <strong>没有匹配的灵感</strong>
              <span>调整搜索词或清除部分筛选条件</span>
            </div>
          )}
        </section>
      ) : (
        <section className="graph-panel" aria-label="灵感图谱视图">
          <div className="graph-toolbar">
            <div>
              {["主题", "情绪", "项目", "当前灵感附近"].map((mode) => (
                <button data-active={relationMode === mode} key={mode} onClick={() => setRelationMode(mode)} type="button">
                  {mode === "主题" ? "按主题" : mode === "情绪" ? "按情绪" : mode === "项目" ? "按项目" : mode}
                </button>
              ))}
            </div>
            <span><SlidersHorizontal size={15} /> 节点大小表示关联度</span>
          </div>

          <div className="graph-canvas">
            <svg aria-hidden="true" className="graph-links" preserveAspectRatio="none" viewBox="0 0 100 100">
              {graphLinks.map(([source, target], index) => {
                if (!visibleGraphIds.has(source) || !visibleGraphIds.has(target)) return null;
                const sourceItem = inspirations.find((item) => item.id === source);
                const targetItem = inspirations.find((item) => item.id === target);
                const matchesRelation =
                  relationMode === "当前灵感附近" ||
                  (relationMode === "主题" && sourceItem?.theme === targetItem?.theme) ||
                  (relationMode === "情绪" && sourceItem?.emotion === targetItem?.emotion) ||
                  (relationMode === "项目" && sourceItem?.project === targetItem?.project);
                if (!matchesRelation) return null;
                const start = graphPositions[source];
                const end = graphPositions[target];
                return (
                  <line
                    className={index % 3 === 0 ? "confirmed" : "suggested"}
                    key={`${source}-${target}`}
                    x1={start.x}
                    x2={end.x}
                    y1={start.y}
                    y2={end.y}
                  />
                );
              })}
            </svg>

            {visibleGraphItems.map((item) => {
              const Icon = item.icon;
              const position = graphPositions[item.id];
              const nodeSize = 62 + Math.min(item.relations, 5) * 7;
              return (
                <button
                  aria-current={focusedGraphId === item.id ? "true" : undefined}
                  aria-pressed={selectedIds.includes(item.id)}
                  className="graph-node"
                  data-focused={focusedGraphId === item.id}
                  data-node-id={item.id}
                  data-selected={selectedIds.includes(item.id)}
                  key={item.id}
                  onClick={() => toggleSelection(item.id)}
                  style={{ left: `${position.x}%`, top: `${position.y}%`, width: nodeSize, height: nodeSize }}
                  type="button"
                >
                  <Icon size={19} />
                  <span>{item.title}</span>
                </button>
              );
            })}

            <div className="graph-legend">
              <span><i className="solid" /> 已确认关联</span>
              <span><i className="dashed" /> AI 潜在关联</span>
            </div>
          </div>
        </section>
      )}

      {selectedIds.length > 0 && (
        <aside className="selection-bar" aria-label="已选灵感操作">
          <div className="selection-details">
            <button aria-label="清空选择" onClick={() => setSelectedIds([])} type="button"><X size={17} /></button>
            <div>
              <strong>已选 {selectedIds.length} 条灵感</strong>
              <span>{selectedInspirations.map((item) => item.title).join(" · ")}</span>
            </div>
          </div>
          {actionMessage && <span className="action-message">{actionMessage}</span>}
          <div className="selection-actions">
            <button onClick={showRelations} type="button"><Network size={16} />建立关联</button>
            <button onClick={() => setActionMessage("已加入项目「离开城市之前」")} type="button"><FolderPlus size={16} />加入项目</button>
            <a href={createHref}><Sparkles size={16} />融合并开始创作</a>
          </div>
        </aside>
      )}
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
