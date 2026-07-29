import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  ArrowLeft,
  Bot,
  Copy,
  FileAudio,
  Headphones,
  Image as ImageIcon,
  Library,
  Link2,
  ListMusic,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  Paperclip,
  Play,
  Plus,
  Send,
  Server,
  Share2,
  Tags,
  Type,
  UsersRound,
  Video,
  X,
} from "lucide-react";
import {
  analyzeInspiration,
  createDemoTask,
  getApiConnectionLabel,
  getDemoTask,
  hasApiConnection,
  listInspirations,
  listProjects,
  saveInspiration,
  saveProject,
  uploadAudio,
  type AnalysisTag,
  type BriefAttachment,
  type BriefResponse,
  type DemoTaskResponse,
  type InspirationCard,
  type InputMode,
  type ProjectRecord,
} from "./api";

type Project = ProjectRecord;

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
  lyrics?: string;
};

type CollaborationEvent = {
  id: string;
  actor: string;
  action: string;
  time: string;
};

const initialMessages: ChatMessage[] = [
  {
    id: "msg_2",
    role: "ai",
    label: "AI",
    text: "把歌词、旋律描述、修改意见或附件发给我。你可以先加入灵感库，也可以直接生成一个版本。",
  },
];

const initialTags: AnalysisTag[] = [
  {
    label: "主题",
    value: "等待输入",
    detail: "发送内容后自动整理主题",
  },
  {
    label: "情绪",
    value: "等待输入",
    detail: "发送内容后自动识别情绪",
  },
  {
    label: "场景",
    value: "等待输入",
    detail: "发送内容后自动提取场景",
  },
  {
    label: "适用位置",
    value: "等待输入",
    detail: "发送内容后判断歌词或旋律位置",
  },
];

const STORAGE_KEYS = {
  projects: "sonic-seed.projects",
  library: "sonic-seed.library",
  versions: "sonic-seed.versions",
};

function formatBytes(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function nowLabel() {
  return "刚刚";
}

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

function summarizePrompt(prompt: string) {
  const firstLine = prompt.split("\n").find((line) => line.trim())?.trim() ?? "未命名创作";
  return firstLine.slice(0, 24);
}

function getSharedProjectId() {
  if (typeof window === "undefined") {
    return "";
  }

  return new URLSearchParams(window.location.search).get("project") ?? "";
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

function getLibraryIcon(card: InspirationCard) {
  const firstAttachment = card.attachments[0];
  return firstAttachment ? getAttachmentIcon(firstAttachment.type) : Type;
}

function getLibraryType(card: InspirationCard) {
  const firstAttachment = card.attachments[0];
  if (!firstAttachment) {
    return "文字";
  }

  if (firstAttachment.type === "audio") {
    return "音频";
  }

  if (firstAttachment.type === "image") {
    return "图片";
  }

  if (firstAttachment.type === "video") {
    return "视频";
  }

  return "灵感";
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
  const [projects, setProjects] = useState<Project[]>(() => readStorage<Project[]>(STORAGE_KEYS.projects, []));
  const [activeProjectId, setActiveProjectId] = useState<string>(() => getSharedProjectId() || (readStorage<Project[]>(STORAGE_KEYS.projects, [])[0]?.id ?? ""));
  const [historyCollapsed, setHistoryCollapsed] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<LocalAttachment[]>([]);
  const [analysisTags, setAnalysisTags] = useState<AnalysisTag[]>(initialTags);
  const [brief, setBrief] = useState<BriefResponse | null>(null);
  const [analysisState, setAnalysisState] = useState("实时分析待命");
  const [versions, setVersions] = useState<DemoVersion[]>(() => readStorage<DemoVersion[]>(STORAGE_KEYS.versions, []));
  const [activeVersionId, setActiveVersionId] = useState<string>(() => readStorage<DemoVersion[]>(STORAGE_KEYS.versions, [])[0]?.id ?? "");
  const [listenState, setListenState] = useState("暂无可试听版本");
  const [shareState, setShareState] = useState("复制协作链接");
  const [events, setEvents] = useState<CollaborationEvent[]>([]);
  const [libraryCount, setLibraryCount] = useState(() => readStorage<InspirationCard[]>(STORAGE_KEYS.library, []).length);
  const analysisRequestRef = useRef(0);

  const activeProject = useMemo(
    () =>
      projects.find((project) => project.id === activeProjectId) ?? {
        id: "",
        title: "新的创作",
        subtitle: "输入内容后会创建历史",
        status: "未保存",
        progress: 0,
        owner: "我",
        updated: "刚刚",
      },
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
    writeStorage(STORAGE_KEYS.projects, projects);
    if (!hasApiConnection() || !projects.length) {
      return;
    }

    const timer = window.setTimeout(() => {
      projects.forEach((project) => {
        void saveProject(project);
      });
    }, 360);

    return () => window.clearTimeout(timer);
  }, [projects]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.versions, versions);
  }, [versions]);

  useEffect(() => {
    if (!hasApiConnection()) {
      return;
    }

    let cancelled = false;
    void listProjects()
      .then((remoteProjects) => {
        if (cancelled || !remoteProjects.length) {
          return;
        }

        setProjects((current) => {
          const knownIds = new Set(remoteProjects.map((project) => project.id));
          return [...remoteProjects, ...current.filter((project) => !knownIds.has(project.id))];
        });

        const sharedProjectId = getSharedProjectId();
        setActiveProjectId((current) => sharedProjectId || current || (remoteProjects[0]?.id ?? ""));
      })
      .catch(() => {
        setAnalysisState("后端项目同步失败");
      });

    return () => {
      cancelled = true;
    };
  }, []);

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

  function ensureProject(prompt = currentPrompt) {
    if (activeProjectId) {
      setProjects((current) =>
        current.map((project) =>
          project.id === activeProjectId
            ? {
                ...project,
                subtitle: prompt ? summarizePrompt(prompt) : project.subtitle,
                updated: nowLabel(),
              }
            : project,
        ),
      );
      return activeProjectId;
    }

    const id = `project_${Date.now()}`;
    const title = summarizePrompt(prompt);
    const nextProject: Project = {
      id,
      title,
      subtitle: prompt ? "来自当前对话" : "新的创作",
      status: "创作中",
      progress: 12,
      owner: "我",
      updated: nowLabel(),
    };
    setProjects((current) => [nextProject, ...current]);
    setActiveProjectId(id);
    addEvent("我", "创建了新的创作历史");
    return id;
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
        projectId: activeProject.id || "draft",
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

    ensureProject(prompt);
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

  async function handleSaveInspiration() {
    const prompt = currentPrompt;
    if (!prompt.trim()) {
      setAnalysisState("先输入内容或上传附件");
      return;
    }

    const projectId = ensureProject(prompt);
    const title = brief?.title ?? summarizePrompt(prompt);

    try {
      const card = await saveInspiration({
        projectId,
        title,
        content: prompt,
        attachments: attachments.map(({ type, name, uploadId }) => ({ type, name, uploadId })),
        tags: analysisTags,
      });
      const stored = readStorage<InspirationCard[]>(STORAGE_KEYS.library, []);
      writeStorage(STORAGE_KEYS.library, [card, ...stored]);
      setLibraryCount((count) => count + 1);
      setAnalysisState("已加入灵感库");
      addEvent("我", `保存灵感：${title}`);
      setMessages((current) => [
        ...current,
        {
          id: `ai_saved_${Date.now()}`,
          role: "ai",
          label: "AI",
          text: `已加入灵感库：${title}`,
        },
      ]);
    } catch {
      setAnalysisState("加入灵感库失败");
    }
  }

  async function handleGenerateVersion() {
    if (!currentPrompt.trim() && !brief) {
      setAnalysisState("先输入内容或上传附件");
      return;
    }

    const promptForTask = currentPrompt || messages.map((message) => message.text).join("\n");
    const projectId = ensureProject(promptForTask);

    const referenceBrief =
      brief ??
      ({
        source: "local",
        title: activeProject.title || summarizePrompt(promptForTask),
        summary: "使用当前对话内容生成新的版本任务。",
        tags: analysisTags,
        suggestedStyle: "都市流行 / 中慢速 / 轻鼓组",
        dataFlow: [],
      } satisfies BriefResponse);

    setAnalysisState("创建版本任务");

    try {
      const task = await createDemoTask({
        projectId,
        prompt: promptForTask,
        referenceBrief,
      });

      const versionId = `version_${task.taskId}`;
      const nextVersion: DemoVersion = {
        id: versionId,
        title: `版本 ${versions.length + 1}`,
        meta: task.provider ? `${task.provider} · ${task.taskId}` : `任务 ${task.taskId}`,
        note: task.message,
        status: task.status === "succeeded" ? "任务完成" : task.status === "failed" ? "生成失败" : task.status === "queued" ? "排队中" : "生成中",
        progress: task.progress ?? 12,
        taskId: task.taskId,
        audioUrl: task.audioUrl,
        lyrics: task.lyrics,
      };

      setVersions((current) => [nextVersion, ...current]);
      setActiveVersionId(versionId);
      setProjects((current) =>
        current.map((project) =>
          project.id === projectId
            ? {
                ...project,
                status: task.status === "succeeded" ? "已有可听版本" : task.status === "failed" ? "生成失败" : "新版本生成中",
                progress: task.status === "succeeded" ? 100 : Math.min(96, project.progress + 7),
                updated: nowLabel(),
              }
            : project,
        ),
      );
      addEvent("我", `创建了 ${nextVersion.title}`);
      setMessages((current) => [
        ...current,
        {
          id: `ai_version_${Date.now()}`,
          role: "ai",
          label: "AI",
          text: task.lyrics ? `版本任务返回歌词：\n${task.lyrics}` : task.message,
        },
      ]);
      if (task.status === "queued" || task.status === "running") {
        void pollVersionTask(task, versionId);
      } else {
        setAnalysisState(nextVersion.status);
      }
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
                  lyrics: latestTask.lyrics ?? version.lyrics,
                }
              : version,
          ),
        );

        if (latestTask.status === "succeeded" || latestTask.status === "failed") {
          setAnalysisState(statusLabel);
          addEvent("系统", `${latestTask.taskId} ${statusLabel}`);
          if (latestTask.lyrics) {
            setMessages((current) => [
              ...current,
              {
                id: `ai_lyrics_${Date.now()}`,
                role: "ai",
                label: "AI",
                text: `生成歌词：\n${latestTask.lyrics}`,
              },
            ]);
          }
          break;
        }
      } catch {
        setAnalysisState("版本状态暂时不可用");
        break;
      }
    }
  }

  async function handleListenVersion() {
    if (!activeVersion) {
      setListenState("还没有历史版本");
      return;
    }

    setListenState(`试听 ${activeVersion.title}`);

    if (activeVersion.audioUrl) {
      try {
        await new Audio(activeVersion.audioUrl).play();
      } catch {
        setListenState("浏览器暂时不能播放该音频");
      }
    } else {
      setListenState(`${activeVersion.title} 暂无音频`);
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
    const projectId = activeProject.id || ensureProject(currentPrompt || "新的创作");
    const link = `${window.location.origin}/create?project=${encodeURIComponent(projectId)}&permission=edit`;
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
                {projects.length ? (
                  projects.map((project) => (
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
                  ))
                ) : (
                  <article className="empty-state">
                    <ListMusic size={18} />
                    <strong>还没有创作历史</strong>
                    <p>发送内容、加入灵感库或生成版本后会自动创建。</p>
                  </article>
                )}
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
                    <span>可上传 MP3/M4A/WAV/WebM、图片、视频，也可以直接写歌词、情绪或修改意见。灵感库 {libraryCount} 条。</span>
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
                    <button className="utility-button" disabled={!canSubmit} onClick={() => void handleSaveInspiration()} type="button">
                      <Library size={16} />
                      加入灵感库
                    </button>
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
                <strong>{activeVersion?.title ?? "暂无版本"}</strong>
                <span>{activeVersion?.status ?? "生成后可听"}</span>
                <span>{activeVersion ? `${activeVersion.progress}%` : `${versions.length} 个版本`}</span>
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
  const [cards, setCards] = useState<InspirationCard[]>(() => readStorage<InspirationCard[]>(STORAGE_KEYS.library, []));

  useEffect(() => {
    if (!hasApiConnection()) {
      return;
    }

    let cancelled = false;
    void listInspirations()
      .then((remoteCards) => {
        if (cancelled) {
          return;
        }

        setCards(remoteCards);
        writeStorage(STORAGE_KEYS.library, remoteCards);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

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
          <h2>{cards.length ? `${cards.length} 条已保存灵感。` : "还没有保存灵感。"}</h2>
        </div>
        <div className="tag-cluster">
          {(cards[0]?.tags.map((tag) => tag.value).slice(0, 5) ?? ["等待第一条灵感"]).map((tag) => (
            <span key={tag}>
              <Tags size={12} />
              {tag}
            </span>
          ))}
        </div>
      </section>

      <section className="library-grid">
        {cards.length ? (
          cards.map((card) => {
            const Icon = getLibraryIcon(card);
            return (
              <article className="library-tile" key={card.id}>
                <span className="tile-icon">
                  <Icon size={21} />
                </span>
                <p>{getLibraryType(card)}</p>
                <h3>{card.title}</h3>
                <span>{card.content || "仅附件灵感"}</span>
                <strong>{card.tags[0]?.value ?? "待分析"}</strong>
              </article>
            );
          })
        ) : (
          <article className="empty-state library-empty">
            <Library size={22} />
            <strong>灵感库为空</strong>
            <p>回到工作台输入内容后，点击“加入灵感库”即可保存。</p>
            <a className="entrance-button primary" href="/create">
              <Play size={18} />
              开始创作
            </a>
          </article>
        )}
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
