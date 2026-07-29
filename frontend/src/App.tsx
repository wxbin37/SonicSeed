import { useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  Clock3,
  Copy,
  Database,
  FileText,
  GitBranch,
  HardDrive,
  Headphones,
  Image as ImageIcon,
  ImagePlus,
  Library,
  Link2,
  ListMusic,
  Loader2,
  MessageCircle,
  Mic,
  Music2,
  Pause,
  Play,
  Plus,
  Radio,
  RefreshCw,
  Send,
  Server,
  Share2,
  Square,
  Tags,
  Type,
  Upload,
  UsersRound,
  Wand2,
} from "lucide-react";
import {
  analyzeInspiration,
  createDemoTask,
  getApiConnectionLabel,
  getDemoTask,
  uploadAudio,
  type AnalysisTag,
  type BriefAttachment,
  type BriefResponse,
  type InputMode,
  type UploadResponse,
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
  id: string;
  title: string;
  meta: string;
  note: string;
  status: string;
  progress: number;
  taskId?: string;
  audioUrl?: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "ai";
  label: string;
  text: string;
};

type CollaborationEvent = {
  id: string;
  actor: string;
  action: string;
  time: string;
};

type SourceData = {
  dialogue: {
    draft: string;
    messages: ChatMessage[];
  };
  text: {
    title: string;
    body: string;
    section: "主歌" | "副歌 Hook" | "Bridge";
    preserveOriginal: boolean;
    allowExpand: boolean;
  };
  humming: {
    note: string;
    fileName: string;
    fileSize: string;
    audioUrl: string;
    uploadId: string;
    uploadStatus: string;
  };
  image: {
    note: string;
    mood: string;
    fileName: string;
    previewUrl: string;
    uploadStatus: string;
  };
  voice: {
    transcript: string;
    note: string;
    fileName: string;
    fileSize: string;
    audioUrl: string;
    uploadId: string;
    uploadStatus: string;
  };
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

const initialProjects: Project[] = [
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

const initialSources: SourceData = {
  dialogue: {
    draft: "这首歌想像一个人离开深圳前的最后一晚，鼓要轻一点。",
    messages: [
      {
        id: "msg_intro",
        role: "user",
        label: "我",
        text: "我们把告别说得像明天还会见。",
      },
      {
        id: "msg_ai",
        role: "ai",
        label: "AI",
        text: "这句可以作为 Hook 落点；建议补一段离开城市的具体场景。",
      },
    ],
  },
  text: {
    title: "像明天还会见",
    body: "我们把告别说得像明天还会见。",
    section: "副歌 Hook",
    preserveOriginal: true,
    allowExpand: true,
  },
  humming: {
    note: "副歌想要上行，最后一个音停得久一点，适合中慢速都市流行。",
    fileName: "",
    fileSize: "",
    audioUrl: "",
    uploadId: "",
    uploadStatus: "等待录音或上传",
  },
  image: {
    note: "雨夜出租车，窗外霓虹有点糊，画面不要太悲伤，像忍住了。",
    mood: "雨夜 / 霓虹 / 克制",
    fileName: "",
    previewUrl: "",
    uploadStatus: "等待图片",
  },
  voice: {
    transcript: "合作方说副歌旋律可以保留，但第二句歌词太书面，希望更口语一点。",
    note: "作为协作反馈回流，不覆盖原版本，生成一个歌词修改分支。",
    fileName: "",
    fileSize: "",
    audioUrl: "",
    uploadId: "",
    uploadStatus: "等待口述录音",
  },
};

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
    id: "demo_v1",
    title: "Demo V1",
    meta: "都市流行 · 76 BPM · 钢琴与电子氛围",
    note: "主歌情绪对了，副歌鼓组还需要更轻。",
    status: "已试听 6 次",
    progress: 100,
  },
  {
    id: "demo_v2",
    title: "Demo V2",
    meta: "Instrumental · Mureka task_48",
    note: "等待生成完成后自动保存到成品区。",
    status: "生成中",
    progress: 64,
  },
  {
    id: "hook_branch",
    title: "Hook 分支",
    meta: "合作方改词 · 编辑权限链接",
    note: "林雨正在把第二句改得更口语。",
    status: "协作中",
    progress: 48,
  },
];

const initialEvents: CollaborationEvent[] = [
  { id: "evt_1", actor: "我", action: "上传了副歌哼唱参考", time: "2分钟前" },
  { id: "evt_2", actor: "林雨", action: "修改了 Hook 第二句", time: "12分钟前" },
  { id: "evt_3", actor: "陈舟", action: "给 Demo V1 留下试听反馈", time: "今天 15:20" },
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

function formatBytes(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function nowLabel() {
  return "刚刚";
}

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
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [activeProjectId, setActiveProjectId] = useState(initialProjects[0].id);
  const [sources, setSources] = useState<SourceData>(initialSources);
  const [analysisTags, setAnalysisTags] = useState<AnalysisTag[]>(initialTags);
  const [brief, setBrief] = useState<BriefResponse | null>(null);
  const [analysisState, setAnalysisState] = useState("实时分析待命");
  const [demos, setDemos] = useState<DemoVersion[]>(initialDemos);
  const [events, setEvents] = useState<CollaborationEvent[]>(initialEvents);
  const [shareState, setShareState] = useState("复制协作链接");
  const [recordingTarget, setRecordingTarget] = useState<"humming" | "voice" | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const analysisRequestRef = useRef(0);

  const activeSource = useMemo(
    () => inputSources.find((source) => source.id === activeMode) ?? inputSources[2],
    [activeMode],
  );

  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId) ?? projects[0],
    [activeProjectId, projects],
  );

  const activeContent = useMemo(() => buildModeContent(activeMode, sources), [activeMode, sources]);

  const canSubmit = activeContent.content.trim().length > 2 || activeContent.attachments.length > 0;

  useEffect(() => {
    if (!canSubmit) {
      setAnalysisState("等待输入");
      return;
    }

    const timer = window.setTimeout(() => {
      void runAnalysis("auto");
    }, 850);

    return () => window.clearTimeout(timer);
  }, [activeMode, activeProject.id, activeContent.content, canSubmit]);

  function addEvent(actor: string, action: string) {
    setEvents((current) => [{ id: `evt_${Date.now()}`, actor, action, time: nowLabel() }, ...current].slice(0, 5));
  }

  function updateSource<K extends InputMode>(mode: K, patch: Partial<SourceData[K]>) {
    setSources((current) => ({ ...current, [mode]: { ...current[mode], ...patch } }) as SourceData);
  }

  function buildModeContent(mode: InputMode, state: SourceData) {
    if (mode === "dialogue") {
      const transcript = state.dialogue.messages.map((message) => `${message.label}: ${message.text}`).join("\n");
      return {
        content: `${transcript}\n当前输入: ${state.dialogue.draft}`.trim(),
        attachments: [] as BriefAttachment[],
      };
    }

    if (mode === "text") {
      return {
        content: [
          `标题: ${state.text.title || "未命名歌词"}`,
          `位置: ${state.text.section}`,
          `保留原文: ${state.text.preserveOriginal ? "是" : "否"}`,
          `允许扩写: ${state.text.allowExpand ? "是" : "否"}`,
          `原文: ${state.text.body}`,
        ].join("\n"),
        attachments: [{ type: "note" as const, name: state.text.title || "歌词草稿" }],
      };
    }

    if (mode === "humming") {
      return {
        content: [
          state.humming.fileName ? `参考音频: ${state.humming.fileName} ${state.humming.fileSize}` : "还没有上传哼唱音频",
          state.humming.uploadId ? `uploadId: ${state.humming.uploadId}` : "",
          `旋律说明: ${state.humming.note}`,
        ]
          .filter(Boolean)
          .join("\n"),
        attachments: state.humming.fileName
          ? [{ type: "audio" as const, name: state.humming.fileName, uploadId: state.humming.uploadId || undefined }]
          : [],
      };
    }

    if (mode === "image") {
      return {
        content: [
          state.image.fileName ? `图片: ${state.image.fileName}` : "还没有上传图片",
          `视觉情绪: ${state.image.mood}`,
          `画面说明: ${state.image.note}`,
        ].join("\n"),
        attachments: state.image.fileName ? [{ type: "image" as const, name: state.image.fileName }] : [],
      };
    }

    return {
      content: [
        state.voice.fileName ? `口述录音: ${state.voice.fileName} ${state.voice.fileSize}` : "还没有上传口述录音",
        state.voice.uploadId ? `uploadId: ${state.voice.uploadId}` : "",
        `转写/摘要: ${state.voice.transcript}`,
        `处理要求: ${state.voice.note}`,
      ]
        .filter(Boolean)
        .join("\n"),
      attachments: state.voice.fileName
        ? [{ type: "audio" as const, name: state.voice.fileName, uploadId: state.voice.uploadId || undefined }]
        : [],
    };
  }

  async function runAnalysis(reason: "auto" | "manual") {
    if (!canSubmit) {
      setAnalysisState("等待输入");
      return;
    }

    const requestId = analysisRequestRef.current + 1;
    analysisRequestRef.current = requestId;
    setAnalysisState(reason === "auto" ? "实时分析中" : "手动分析中");

    try {
      const nextBrief = await analyzeInspiration({
        projectId: activeProject.id,
        mode: activeMode,
        content: activeContent.content,
        attachments: activeContent.attachments,
      });

      if (analysisRequestRef.current !== requestId) {
        return;
      }

      setBrief(nextBrief);
      setAnalysisTags(nextBrief.tags);
      setAnalysisState(nextBrief.source === "backend" ? "后端已同步" : "本地模拟完成");
    } catch {
      if (analysisRequestRef.current === requestId) {
        setAnalysisState("后端请求失败");
      }
    }
  }

  function handleSendDialogue() {
    const text = sources.dialogue.draft.trim();
    if (!text) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: "user",
      label: "我",
      text,
    };

    setSources((current) => ({
      ...current,
      dialogue: {
        draft: "",
        messages: [
          ...current.dialogue.messages,
          userMessage,
          {
            id: `msg_ai_${Date.now()}`,
            role: "ai",
            label: "AI",
            text: "已加入当前创作上下文，右侧标签会重新整理。",
          },
        ],
      },
    }));
    addEvent("我", "补充了一条创作对话");
  }

  async function handleAudioFile(file: File, target: "humming" | "voice", audioUrl: string) {
    const fileInfo = {
      fileName: file.name,
      fileSize: formatBytes(file.size),
      audioUrl,
      uploadStatus: "上传到后端预处理",
    };

    updateSource(target, fileInfo);

    try {
      const result: UploadResponse = await uploadAudio(file);
      updateSource(target, {
        uploadId: result.uploadId,
        uploadStatus: `已预处理为 ${result.normalizedFormat}`,
      });
      addEvent("我", `${target === "humming" ? "上传了哼唱" : "上传了语音"}：${result.filename}`);
    } catch {
      updateSource(target, {
        uploadStatus: "上传失败，保留本地预览",
      });
    }
  }

  function handleAudioSelect(event: React.ChangeEvent<HTMLInputElement>, target: "humming" | "voice") {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    void handleAudioFile(file, target, URL.createObjectURL(file));
    event.target.value = "";
  }

  function handleImageSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    updateSource("image", {
      fileName: file.name,
      previewUrl: URL.createObjectURL(file),
      uploadStatus: `${formatBytes(file.size)} · 本地预览`,
    });
    addEvent("我", `加入了一张视觉参考：${file.name}`);
    event.target.value = "";
  }

  async function startRecording(target: "humming" | "voice") {
    if (!navigator.mediaDevices?.getUserMedia) {
      updateSource(target, { uploadStatus: "当前浏览器不支持录音" });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      mediaRecorderRef.current = recorder;
      setRecordingTarget(target);
      updateSource(target, { uploadStatus: "录音中" });

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const fileName = target === "humming" ? "humming-take.webm" : "voice-note.webm";
        const file = new File([blob], fileName, { type: blob.type || "audio/webm" });
        void handleAudioFile(file, target, URL.createObjectURL(blob));
      };

      recorder.start();
    } catch {
      updateSource(target, { uploadStatus: "没有麦克风权限" });
      setRecordingTarget(null);
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setRecordingTarget(null);
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
        prompt: activeContent.content,
        referenceBrief,
      });

      const demoId = `demo_${task.taskId}`;
      const nextDemo: DemoVersion = {
        id: demoId,
        title: `Demo ${demos.length + 1}`,
        meta: `任务 ${task.taskId} · ${activeSource.label}输入`,
        note: task.message,
        status: task.status === "queued" ? "排队中" : "生成中",
        progress: task.progress ?? 12,
        taskId: task.taskId,
        audioUrl: task.audioUrl,
      };

      setDemos((current) => [nextDemo, ...current]);
      setProjects((current) =>
        current.map((project) =>
          project.id === activeProject.id
            ? { ...project, status: "Demo 任务已创建", progress: Math.min(96, project.progress + 8), updated: nowLabel() }
            : project,
        ),
      );
      setAnalysisState("Demo 任务已创建");
      addEvent("我", `创建了 ${nextDemo.title}`);
      void pollDemoTask(task.taskId, demoId);
    } catch {
      setAnalysisState("Demo 任务创建失败");
    }
  }

  async function pollDemoTask(taskId: string, demoId: string) {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 1400));

      try {
        const task = await getDemoTask(taskId);
        const statusLabel =
          task.status === "succeeded"
            ? "任务完成"
            : task.status === "failed"
              ? "生成失败"
              : task.status === "running"
                ? "生成中"
                : "排队中";

        setDemos((current) =>
          current.map((demo) =>
            demo.id === demoId
              ? {
                  ...demo,
                  note: task.message,
                  status: statusLabel,
                  progress: task.progress ?? (task.status === "succeeded" ? 100 : Math.min(92, demo.progress + 18)),
                  audioUrl: task.audioUrl ?? demo.audioUrl,
                }
              : demo,
          ),
        );

        if (task.status === "succeeded" || task.status === "failed") {
          addEvent("系统", `${taskId} ${statusLabel}`);
          break;
        }
      } catch {
        setDemos((current) =>
          current.map((demo) => (demo.id === demoId ? { ...demo, status: "轮询失败", note: "后端任务状态暂时不可用。" } : demo)),
        );
        break;
      }
    }
  }

  function handleCreateProject() {
    const id = `project_${Date.now()}`;
    const nextProject: Project = {
      id,
      title: `未命名创作 ${projects.length + 1}`,
      subtitle: "等待第一条灵感",
      status: "新建协作空间",
      progress: 6,
      owner: "我",
      updated: nowLabel(),
    };

    setProjects((current) => [nextProject, ...current]);
    setActiveProjectId(id);
    addEvent("我", "新建了一个创作空间");
  }

  async function handleCopyShareLink() {
    const link = `${window.location.origin}/create?project=${encodeURIComponent(activeProject.id)}&permission=edit`;
    try {
      await navigator.clipboard.writeText(link);
      setShareState("链接已复制");
    } catch {
      setShareState(link);
    }

    window.setTimeout(() => setShareState("复制协作链接"), 2200);
  }

  function handleCreateBranch(demo: DemoVersion) {
    const id = `branch_${Date.now()}`;
    const branchProject: Project = {
      id,
      title: `${demo.title} 修改分支`,
      subtitle: "基于成品反馈继续创作",
      status: "分支已创建",
      progress: 18,
      owner: "我",
      updated: nowLabel(),
    };
    setProjects((current) => [branchProject, ...current]);
    setActiveProjectId(id);
    addEvent("我", `从 ${demo.title} 创建了修改分支`);
  }

  const visibleMessages =
    activeMode === "dialogue"
      ? sources.dialogue.messages.slice(-5)
      : [
          {
            id: "mode_preview",
            role: "user" as const,
            label: activeSource.label,
            text: activeContent.content || activeSource.placeholder,
          },
          {
            id: "brief_preview",
            role: "ai" as const,
            label: "AI",
            text: brief?.summary ?? "输入内容后，右侧会自动整理主题、情绪、场景和适用位置。",
          },
        ];

  return (
    <main className="create-shell" aria-label="开始创作">
      <header className="studio-topbar">
        <a className="icon-link" href="/" aria-label="返回首页">
          <ArrowLeft size={19} />
        </a>
        <h1>创作工作台</h1>
        <button className="icon-button" onClick={handleCopyShareLink} type="button" aria-label="分享创作空间">
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
            <button className="tiny-button" onClick={handleCreateProject} type="button" aria-label="新建创作">
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

          <button className="share-link" onClick={handleCopyShareLink} type="button">
            {shareState === "复制协作链接" ? <Link2 size={16} /> : <Copy size={16} />}
            {shareState}
          </button>

          <div className="event-feed" aria-label="协作动态">
            {events.map((event) => (
              <article key={event.id}>
                <span>{event.time}</span>
                <strong>{event.actor}</strong>
                <p>{event.action}</p>
              </article>
            ))}
          </div>
        </aside>

        <section className="studio-main" aria-label="创作工作区">
          <section className="workbench-panel" aria-label="Codex 风格创作工作台">
            <div className="panel-heading compact">
              <div>
                <p>工作台</p>
                <h2>{activeProject.title}</h2>
              </div>
              <span className="status-pill">
                {analysisState.includes("中") ? <Loader2 size={14} className="spin" /> : <Bot size={14} />}
                {analysisState}
              </span>
            </div>

            <div className="chat-window" aria-label="创作对话">
              {visibleMessages.map((message) => (
                <article className={`chat-message ${message.role}`} key={message.id}>
                  <span>
                    {message.role === "ai" ? <Bot size={14} /> : <UsersRound size={14} />}
                    {message.label}
                  </span>
                  <p>{message.text}</p>
                </article>
              ))}
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

              {activeMode === "dialogue" && (
                <div className="mode-form">
                  <label className="field-label">
                    <span>对话输入</span>
                    <textarea
                      aria-label="对话输入"
                      onChange={(event) => updateSource("dialogue", { draft: event.target.value })}
                      placeholder={activeSource.placeholder}
                      value={sources.dialogue.draft}
                    />
                  </label>
                  <div className="composer-actions">
                    <button className="utility-button" onClick={handleSendDialogue} type="button">
                      <MessageCircle size={16} />
                      加入对话
                    </button>
                    <button className="send-button" onClick={() => void runAnalysis("manual")} type="button">
                      <Send size={16} />
                      分析当前对话
                    </button>
                  </div>
                </div>
              )}

              {activeMode === "text" && (
                <div className="mode-form">
                  <div className="field-grid">
                    <label className="field-label">
                      <span>灵感标题</span>
                      <input
                        aria-label="歌词标题"
                        onChange={(event) => updateSource("text", { title: event.target.value })}
                        value={sources.text.title}
                      />
                    </label>
                    <label className="field-label">
                      <span>适用段落</span>
                      <select
                        aria-label="适用段落"
                        onChange={(event) => updateSource("text", { section: event.target.value as SourceData["text"]["section"] })}
                        value={sources.text.section}
                      >
                        <option>主歌</option>
                        <option>副歌 Hook</option>
                        <option>Bridge</option>
                      </select>
                    </label>
                  </div>
                  <label className="field-label">
                    <span>歌词 / 故事文本</span>
                    <textarea
                      aria-label="文字输入"
                      onChange={(event) => updateSource("text", { body: event.target.value })}
                      placeholder={activeSource.placeholder}
                      value={sources.text.body}
                    />
                  </label>
                  <div className="option-row">
                    <label>
                      <input
                        checked={sources.text.preserveOriginal}
                        onChange={(event) => updateSource("text", { preserveOriginal: event.target.checked })}
                        type="checkbox"
                      />
                      必须保留原文
                    </label>
                    <label>
                      <input
                        checked={sources.text.allowExpand}
                        onChange={(event) => updateSource("text", { allowExpand: event.target.checked })}
                        type="checkbox"
                      />
                      允许 AI 扩写
                    </label>
                  </div>
                </div>
              )}

              {activeMode === "humming" && (
                <div className="mode-form">
                  <div className="media-actions">
                    <button
                      className="utility-button"
                      onClick={() => (recordingTarget === "humming" ? stopRecording() : void startRecording("humming"))}
                      type="button"
                    >
                      {recordingTarget === "humming" ? <Square size={16} /> : <Mic size={16} />}
                      {recordingTarget === "humming" ? "停止录音" : "录一段哼唱"}
                    </button>
                    <label className="upload-button">
                      <Upload size={16} />
                      上传音频
                      <input accept="audio/*,.mp3,.m4a,.wav,.webm" onChange={(event) => handleAudioSelect(event, "humming")} type="file" />
                    </label>
                  </div>
                  {sources.humming.audioUrl && <audio controls src={sources.humming.audioUrl} />}
                  <span className="upload-status">{sources.humming.uploadStatus}</span>
                  <label className="field-label">
                    <span>旋律说明</span>
                    <textarea
                      aria-label="哼唱说明"
                      onChange={(event) => updateSource("humming", { note: event.target.value })}
                      placeholder={activeSource.placeholder}
                      value={sources.humming.note}
                    />
                  </label>
                </div>
              )}

              {activeMode === "image" && (
                <div className="mode-form">
                  <label className="upload-drop">
                    {sources.image.previewUrl ? (
                      <img alt="图片灵感预览" src={sources.image.previewUrl} />
                    ) : (
                      <span>
                        <ImagePlus size={22} />
                        选择图片
                      </span>
                    )}
                    <input accept="image/*" onChange={handleImageSelect} type="file" />
                  </label>
                  <span className="upload-status">{sources.image.fileName || sources.image.uploadStatus}</span>
                  <div className="field-grid">
                    <label className="field-label">
                      <span>视觉情绪</span>
                      <input
                        aria-label="视觉情绪"
                        onChange={(event) => updateSource("image", { mood: event.target.value })}
                        value={sources.image.mood}
                      />
                    </label>
                    <label className="field-label">
                      <span>处理方式</span>
                      <input aria-label="图片处理方式" readOnly value="只提取场景与意象" />
                    </label>
                  </div>
                  <label className="field-label">
                    <span>画面说明</span>
                    <textarea
                      aria-label="图片说明"
                      onChange={(event) => updateSource("image", { note: event.target.value })}
                      placeholder={activeSource.placeholder}
                      value={sources.image.note}
                    />
                  </label>
                </div>
              )}

              {activeMode === "voice" && (
                <div className="mode-form">
                  <div className="media-actions">
                    <button
                      className="utility-button"
                      onClick={() => (recordingTarget === "voice" ? stopRecording() : void startRecording("voice"))}
                      type="button"
                    >
                      {recordingTarget === "voice" ? <Pause size={16} /> : <Radio size={16} />}
                      {recordingTarget === "voice" ? "结束口述" : "录口述反馈"}
                    </button>
                    <label className="upload-button">
                      <Upload size={16} />
                      上传语音
                      <input accept="audio/*,.mp3,.m4a,.wav,.webm" onChange={(event) => handleAudioSelect(event, "voice")} type="file" />
                    </label>
                  </div>
                  {sources.voice.audioUrl && <audio controls src={sources.voice.audioUrl} />}
                  <span className="upload-status">{sources.voice.uploadStatus}</span>
                  <label className="field-label">
                    <span>转写 / 反馈摘要</span>
                    <textarea
                      aria-label="语音转写"
                      onChange={(event) => updateSource("voice", { transcript: event.target.value })}
                      value={sources.voice.transcript}
                    />
                  </label>
                  <label className="field-label">
                    <span>希望 AI 怎么处理</span>
                    <textarea aria-label="语音处理要求" onChange={(event) => updateSource("voice", { note: event.target.value })} value={sources.voice.note} />
                  </label>
                </div>
              )}

              <div className="composer-actions">
                <button className="utility-button" onClick={handleCreateDemo} type="button">
                  <Headphones size={16} />
                  创建 Demo 任务
                </button>
                <button className="send-button" onClick={() => void runAnalysis("manual")} type="button">
                  <Wand2 size={16} />
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

            <div className="brief-card" aria-label="当前 Brief">
              <span>
                <FileText size={14} />
                当前 Brief
              </span>
              <strong>{brief?.title ?? activeProject.title}</strong>
              <p>{brief?.suggestedStyle ?? "等待 AI 根据当前输入生成曲风、速度、乐器和歌词建议。"}</p>
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
                <article className="demo-item" key={demo.id}>
                  <button
                    className="play-button"
                    onClick={() => !demo.audioUrl && setAnalysisState("当前 Demo 还没有可播放音频")}
                    type="button"
                    aria-label={`播放 ${demo.title}`}
                  >
                    <Play size={18} />
                  </button>
                  <div>
                    <span className="demo-status">
                      <Clock3 size={13} />
                      {demo.status}
                    </span>
                    <h3>{demo.title}</h3>
                    <p>{demo.meta}</p>
                    <span className="progress-track demo-progress" aria-label={`${demo.title}进度 ${demo.progress}%`}>
                      <span style={{ width: `${demo.progress}%` }} />
                    </span>
                    <em>{demo.note}</em>
                    {demo.audioUrl ? <audio controls src={demo.audioUrl} /> : <small>未连接音乐模型时不会生成真实音频。</small>}
                  </div>
                  <button className="branch-button" onClick={() => handleCreateBranch(demo)} type="button">
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
