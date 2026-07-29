import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  Bot,
  Clock3,
  Copy,
  FileAudio,
  Headphones,
  Image as ImageIcon,
  Library,
  Link2,
  ListMusic,
  Loader2,
  Music2,
  PanelLeftClose,
  PanelLeftOpen,
  Paperclip,
  Play,
  Plus,
  Radio,
  Send,
  Server,
  Share2,
  Tags,
  Type,
  Upload,
  UsersRound,
  Video,
  Wand2,
  X,
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
  type DemoTaskResponse,
  type InputMode,
} from "./api";

type Project = {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  progress: number;
  owner: string;
  updated: string;
};

type LocalAttachment = BriefAttachment & {
  id: string;
  size: string;
  status: string;
  previewUrl?: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "ai";
  label: string;
  text: string;
  attachments?: LocalAttachment[];
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

type CollaborationEvent = {
  id: string;
  actor: string;
  action: string;
  time: string;
};

const initialProjects: Project[] = [
  {
    id: "city-leave",
    title: "离开城市之前",
    subtitle: "副歌哼唱 + 两句歌词",
    status: "正在改 V2",
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

const initialMessages: ChatMessage[] = [
  {
    id: "msg_1",
    role: "user",
    label: "我",
    text: "我们把告别说得像明天还会见。",
  },
  {
    id: "msg_2",
    role: "ai",
    label: "AI",
    text: "这句适合放在副歌 Hook 落点。可以继续上传哼唱、图片或旧 Demo，我会把它们整理成同一版创作上下文。",
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

const initialVersions: DemoVersion[] = [
  {
    id: "demo_v2",
    title: "Demo V2",
    meta: "Instrumental · 76 BPM · 轻鼓组",
    note: "副歌空间更大，但主歌还可以更贴近口语。",
    status: "上一版",
    progress: 100,
  },
  {
    id: "demo_v1",
    title: "Demo V1",
    meta: "都市流行 · 钢琴与电子氛围",
    note: "主歌情绪对了，副歌鼓组略重。",
    status: "已试听 6 次",
    progress: 100,
  },
];

const initialEvents: CollaborationEvent[] = [
  { id: "evt_1", actor: "我", action: "上传了副歌哼唱参考", time: "2分钟前" },
  { id: "evt_2", actor: "林雨", action: "修改了 Hook 第二句", time: "12分钟前" },
  { id: "evt_3", actor: "陈舟", action: "给 Demo V1 留下试听反馈", time: "今天 15:20" },
];

const libraryCards: Array<{
  type: string;
  title: string;
  meta: string;
  status: string;
  icon: LucideIcon;
}> = [
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

function getAttachmentType(file: File): BriefAttachment["type"] {
  if (file.type.startsWith("audio/")) {
    return "audio";
  }

  if (file.type.startsWith("image/")) {
    return "image";
  }

  if (file.type.startsWith("video/")) {
    return "video";
  }

  return "note";
}

function getAttachmentIcon(type: BriefAttachment["type"]) {
  if (type === "audio") {
    return FileAudio;
  }

  if (type === "image") {
    return ImageIcon;
  }

  if (type === "video") {
    return Video;
  }

  return Tags;
}

function inferMode(attachments: LocalAttachment[]): InputMode {
  if (attachments.some((attachment) => attachment.type === "audio")) {
    return "humming";
  }

  if (attachments.some((attachment) => attachment.type === "image" || attachment.type === "video")) {
    return "image";
  }

  return "dialogue";
}

function buildPrompt(text: string, attachments: LocalAttachment[]) {
  const attachmentLines = attachments.map((attachment) => `附件: ${attachment.type} / ${attachment.name} / ${attachment.status}`);
  return [text.trim(), ...attachmentLines].filter(Boolean).join("\n");
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
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [activeProjectId, setActiveProjectId] = useState(initialProjects[0].id);
  const [historyCollapsed, setHistoryCollapsed] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState("这首歌想像一个人离开深圳前的最后一晚，鼓要轻一点。");
  const [attachments, setAttachments] = useState<LocalAttachment[]>([]);
  const [analysisTags, setAnalysisTags] = useState<AnalysisTag[]>(initialTags);
  const [brief, setBrief] = useState<BriefResponse | null>(null);
  const [analysisState, setAnalysisState] = useState("实时分析待命");
  const [versions, setVersions] = useState<DemoVersion[]>(initialVersions);
  const [activeVersionId, setActiveVersionId] = useState(initialVersions[0].id);
  const [listenState, setListenState] = useState("点击试听上一版");
  const [shareState, setShareState] = useState("复制协作链接");
  const [events, setEvents] = useState<CollaborationEvent[]>(initialEvents);
  const analysisRequestRef = useRef(0);

  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId) ?? projects[0],
    [activeProjectId, projects],
  );

  const activeVersion = useMemo(
    () => versions.find((version) => version.id === activeVersionId) ?? versions[0],
    [activeVersionId, versions],
  );

  const currentPrompt = useMemo(() => buildPrompt(draft, attachments), [draft, attachments]);
  const currentMode = useMemo(() => inferMode(attachments), [attachments]);
  const canSubmit = currentPrompt.trim().length > 2;

  useEffect(() => {
    if (!canSubmit) {
      setAnalysisState("等待输入");
      return;
    }

    const timer = window.setTimeout(() => {
      void runAnalysis("auto", currentPrompt, attachments, false);
    }, 900);

    return () => window.clearTimeout(timer);
  }, [activeProject.id, canSubmit, currentMode, currentPrompt, attachments]);

  function addEvent(actor: string, action: string) {
    setEvents((current) => [{ id: `evt_${Date.now()}`, actor, action, time: nowLabel() }, ...current].slice(0, 5));
  }

  async function runAnalysis(
    reason: "auto" | "manual",
    prompt = currentPrompt,
    nextAttachments = attachments,
    appendMessage = reason === "manual",
  ) {
    if (!prompt.trim()) {
      setAnalysisState("等待输入");
      return null;
    }

    const requestId = analysisRequestRef.current + 1;
    analysisRequestRef.current = requestId;
    setAnalysisState(reason === "auto" ? "实时分析中" : "分析中");

    try {
      const nextBrief = await analyzeInspiration({
        projectId: activeProject.id,
        mode: inferMode(nextAttachments),
        content: prompt,
        attachments: nextAttachments.map(({ type, name, uploadId }) => ({ type, name, uploadId })),
      });

      if (analysisRequestRef.current !== requestId) {
        return null;
      }

      setBrief(nextBrief);
      setAnalysisTags(nextBrief.tags);
      setAnalysisState(nextBrief.source === "backend" ? "后端已同步" : "本地模拟完成");

      if (appendMessage) {
        setMessages((current) => [
          ...current,
          {
            id: `ai_${Date.now()}`,
            role: "ai",
            label: "AI",
            text: nextBrief.summary,
          },
        ]);
      }

      return nextBrief;
    } catch {
      if (analysisRequestRef.current === requestId) {
        setAnalysisState("后端请求失败");
      }

      return null;
    }
  }

  async function handleAttachmentChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (!files.length) {
      return;
    }

    const nextItems: LocalAttachment[] = files.map((file) => {
      const type = getAttachmentType(file);
      return {
        id: `att_${Date.now()}_${file.name}`,
        type,
        name: file.name,
        size: formatBytes(file.size),
        status: type === "audio" ? "上传到后端预处理" : "随消息发送",
        previewUrl: type === "image" || type === "video" || type === "audio" ? URL.createObjectURL(file) : undefined,
      };
    });

    setAttachments((current) => [...current, ...nextItems]);
    addEvent("我", `添加了 ${nextItems.length} 个附件`);

    for (const item of nextItems) {
      if (item.type !== "audio") {
        continue;
      }

      const file = files.find((candidate) => candidate.name === item.name);
      if (!file) {
        continue;
      }

      try {
        const result = await uploadAudio(file);
        setAttachments((current) =>
          current.map((attachment) =>
            attachment.id === item.id
              ? {
                  ...attachment,
                  uploadId: result.uploadId,
                  status: `已预处理为 ${result.normalizedFormat}`,
                }
              : attachment,
          ),
        );
      } catch {
        setAttachments((current) =>
          current.map((attachment) => (attachment.id === item.id ? { ...attachment, status: "上传失败，保留本地预览" } : attachment)),
        );
      }
    }
  }

  function removeAttachment(id: string) {
    setAttachments((current) => current.filter((attachment) => attachment.id !== id));
  }

  async function handleSend() {
    const prompt = currentPrompt;
    const sentAttachments = attachments;
    if (!prompt.trim()) {
      return;
    }

    setMessages((current) => [
      ...current,
      {
        id: `user_${Date.now()}`,
        role: "user",
        label: "我",
        text: draft.trim() || "已发送附件素材",
        attachments: sentAttachments,
      },
    ]);
    setDraft("");
    setAttachments([]);
    addEvent("我", "发送了一条创作上下文");
    await runAnalysis("manual", prompt, sentAttachments, true);
  }

  async function handleGenerateVersion() {
    if (!currentPrompt.trim() && !brief) {
      setAnalysisState("先输入内容或上传附件");
      return;
    }

    const referenceBrief =
      brief ??
      ({
        source: "local",
        title: activeProject.title,
        summary: "使用当前对话内容生成新的版本任务。",
        tags: analysisTags,
        suggestedStyle: "都市流行 / 中慢速 / 轻鼓组",
        dataFlow: [],
      } satisfies BriefResponse);

    setAnalysisState("创建版本任务");

    try {
      const task = await createDemoTask({
        projectId: activeProject.id,
        prompt: currentPrompt || messages.map((message) => message.text).join("\n"),
        referenceBrief,
      });

      const versionId = `version_${task.taskId}`;
      const nextVersion: DemoVersion = {
        id: versionId,
        title: `版本 ${versions.length + 1}`,
        meta: `任务 ${task.taskId}`,
        note: task.message,
        status: task.status === "queued" ? "排队中" : "生成中",
        progress: task.progress ?? 12,
        taskId: task.taskId,
        audioUrl: task.audioUrl,
      };

      setVersions((current) => [nextVersion, ...current]);
      setActiveVersionId(versionId);
      setProjects((current) =>
        current.map((project) =>
          project.id === activeProject.id ? { ...project, status: "新版本生成中", progress: Math.min(96, project.progress + 7), updated: nowLabel() } : project,
        ),
      );
      addEvent("我", `创建了 ${nextVersion.title}`);
      void pollVersionTask(task, versionId);
    } catch {
      setAnalysisState("版本任务创建失败");
    }
  }

  async function pollVersionTask(task: DemoTaskResponse, versionId: string) {
    let latestTask = task;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 1400));

      try {
        latestTask = await getDemoTask(latestTask.taskId);
        const statusLabel =
          latestTask.status === "succeeded"
            ? "任务完成"
            : latestTask.status === "failed"
              ? "生成失败"
              : latestTask.status === "running"
                ? "生成中"
                : "排队中";

        setVersions((current) =>
          current.map((version) =>
            version.id === versionId
              ? {
                  ...version,
                  note: latestTask.message,
                  status: statusLabel,
                  progress: latestTask.progress ?? (latestTask.status === "succeeded" ? 100 : Math.min(92, version.progress + 16)),
                  audioUrl: latestTask.audioUrl ?? version.audioUrl,
                }
              : version,
          ),
        );

        if (latestTask.status === "succeeded" || latestTask.status === "failed") {
          setAnalysisState(statusLabel);
          addEvent("系统", `${latestTask.taskId} ${statusLabel}`);
          break;
        }
      } catch {
        setAnalysisState("版本状态暂时不可用");
        break;
      }
    }
  }

  function playFallbackTone() {
    const AudioContextClass =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) {
      setListenState("当前浏览器无法播放预览");
      return;
    }

    const context = new AudioContextClass();
    const gain = context.createGain();
    gain.connect(context.destination);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.8);

    [220, 277, 330].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, context.currentTime + index * 0.16);
      oscillator.connect(gain);
      oscillator.start(context.currentTime + index * 0.16);
      oscillator.stop(context.currentTime + index * 0.16 + 0.28);
    });
  }

  async function handleListenVersion() {
    if (!activeVersion) {
      return;
    }

    setListenState(`试听 ${activeVersion.title}`);

    if (activeVersion.audioUrl) {
      await new Audio(activeVersion.audioUrl).play();
    } else {
      playFallbackTone();
      setListenState(`${activeVersion.title} 暂无后端音频`);
    }

    setVersions((current) => {
      if (current.length < 2) {
        return current;
      }

      const currentIndex = current.findIndex((version) => version.id === activeVersion.id);
      const nextVersion = current[(currentIndex + 1) % current.length];
      setActiveVersionId(nextVersion.id);
      return current;
    });
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

      <section className="studio-layout" data-history-collapsed={historyCollapsed}>
        <aside className="history-sidebar" data-collapsed={historyCollapsed} aria-label="创作历史记录列表">
          <div className="history-top">
            <button
              className="tiny-button"
              onClick={() => setHistoryCollapsed((value) => !value)}
              type="button"
              aria-label={historyCollapsed ? "展开创作历史" : "折叠创作历史"}
            >
              {historyCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
            </button>
            {!historyCollapsed && (
              <>
                <div>
                  <p>协作空间</p>
                  <h2>创作历史</h2>
                </div>
                <button className="tiny-button" onClick={handleCreateProject} type="button" aria-label="新建创作">
                  <Plus size={17} />
                </button>
              </>
            )}
          </div>

          {historyCollapsed ? (
            <button className="history-rail-button" onClick={() => setHistoryCollapsed(false)} type="button">
              <ListMusic size={18} />
            </button>
          ) : (
            <>
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
            </>
          )}
        </aside>

        <section className="studio-main" aria-label="创作工作区">
          <section className="workbench-panel" aria-label="AI 对话创作工作台">
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

            <div className="workbench-body">
              <div className="conversation-area">
                <div className="chat-window" aria-label="创作对话">
                  {messages.map((message) => (
                    <article className={`chat-message ${message.role}`} key={message.id}>
                      <span>
                        {message.role === "ai" ? <Bot size={14} /> : <UsersRound size={14} />}
                        {message.label}
                      </span>
                      <p>{message.text}</p>
                      {!!message.attachments?.length && (
                        <div className="message-attachments">
                          {message.attachments.map((attachment) => {
                            const Icon = getAttachmentIcon(attachment.type);
                            return (
                              <span key={attachment.id}>
                                <Icon size={13} />
                                {attachment.name}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </article>
                  ))}
                </div>

                <div className="composer-box">
                  <div className="composer-context">
                    <Paperclip size={15} />
                    <span>可上传 MP3/M4A/WAV/WebM、图片、视频，也可以直接写歌词、情绪或修改意见。</span>
                  </div>

                  {!!attachments.length && (
                    <div className="attachment-strip" aria-label="已选择附件">
                      {attachments.map((attachment) => {
                        const Icon = getAttachmentIcon(attachment.type);
                        return (
                          <article key={attachment.id}>
                            <Icon size={15} />
                            <div>
                              <strong>{attachment.name}</strong>
                              <span>
                                {attachment.size} · {attachment.status}
                              </span>
                            </div>
                            <button onClick={() => removeAttachment(attachment.id)} type="button" aria-label={`移除 ${attachment.name}`}>
                              <X size={14} />
                            </button>
                          </article>
                        );
                      })}
                    </div>
                  )}

                  <textarea
                    aria-label="输入创作内容"
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                        event.preventDefault();
                        void handleSend();
                      }
                    }}
                    placeholder="说一句歌词、描述一段旋律、贴一段反馈，或上传旧 Demo 让 AI 帮你整理问题。"
                    value={draft}
                  />

                  <div className="composer-actions">
                    <label className="attach-button">
                      <Paperclip size={17} />
                      <span>附件</span>
                      <input accept="audio/*,image/*,video/*,.mp3,.m4a,.wav,.webm,.mp4,.mov" multiple onChange={handleAttachmentChange} type="file" />
                    </label>
                    <button className="utility-button" onClick={() => void handleGenerateVersion()} type="button">
                      <Headphones size={16} />
                      生成版本
                    </button>
                    <button className="send-button" disabled={!canSubmit} onClick={() => void handleSend()} type="button">
                      <Send size={16} />
                      发送
                    </button>
                  </div>
                </div>
              </div>

              <aside className="version-rail" aria-label="历史版本试听">
                <button className="version-listen-button" onClick={() => void handleListenVersion()} type="button" aria-label="试听之前版本">
                  <Headphones size={24} />
                </button>
                <p>{listenState}</p>
                <strong>{activeVersion?.title}</strong>
                <span>{activeVersion?.status}</span>
                <span>{activeVersion?.progress}%</span>
              </aside>
            </div>
          </section>

          <aside className="analysis-panel" aria-label="AI 标签">
            <div className="panel-heading compact">
              <div>
                <p>实时标签</p>
                <h2>AI 标签</h2>
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
          </aside>
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
