import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  ArrowLeft,
  Bot,
  ChevronDown,
  Check,
  Copy,
  FileAudio,
  Heart,
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
  SlidersHorizontal,
  Tags,
  Type,
  UsersRound,
  Video,
  X,
} from "lucide-react";
import {
  analyzeInspiration,
  createDemoTask,
  createShareLink,
  getApiConnectionLabel,
  getCollaborationSession,
  getDemoTask,
  getProjectWorkspace,
  hasApiConnection,
  joinShareLink,
  listCollaborationSessions,
  listDemoTasks,
  listInspirations,
  listProjects,
  saveInspiration,
  saveProject,
  saveProjectWorkspace,
  updateCollaborationSession,
  uploadAudio,
  type AnalysisTag,
  type BriefAttachment,
  type BriefResponse,
  type CollaborationSession,
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
  projectId?: string;
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

type WorkbenchSnapshot = {
  messages?: ChatMessage[];
  analysisTags?: AnalysisTag[];
  versions?: DemoVersion[];
  draft?: string;
  brief?: BriefResponse | null;
  projectId?: string;
  activeVersionId?: string;
  updatedAt?: string;
};

type CreationSeed = {
  id: string;
  kind: "歌词卡" | "旋律卡" | "氛围图" | "情绪卡" | "节奏卡" | "故事卡";
  title: string;
  description: string;
  source: string;
  tone: "coral" | "mint" | "night" | "blue" | "rose" | "violet";
  attachments: BriefAttachment[];
};

type CreationSetting = {
  id: string;
  label: string;
  options: string[];
};

const initialMessages: ChatMessage[] = [
  {
    id: "msg_2",
    role: "ai",
    label: "AI",
    text: "把歌词、旋律描述、修改意见或附件发给我。你可以先加入灵感库，也可以直接生成一个版本。",
  },
];

const defaultCreationPrompt = "保留原有歌词和主旋律，加入电子合成器元素，节奏偏中速，前半段氛围克制，副歌部分情绪上升，整体风格偏未来都市感。";

const promptChips = [
  {
    label: "参考：原生版Prompt",
    value: defaultCreationPrompt,
  },
  {
    label: "电子风格模板",
    value: "保留原有歌词和主旋律，加入电子合成器、低频脉冲和轻量鼓组，整体偏未来都市流行。",
  },
  {
    label: "情绪：克制到爆发",
    value: "前半段人声和钢琴保持克制，副歌加入更开阔的和声与鼓组，让情绪从隐忍推进到释放。",
  },
];

const creationSettingRows: CreationSetting[] = [
  {
    id: "lyric",
    label: "核心歌词",
    options: ["锁定", "允许微调", "仅提取意象"],
  },
  {
    id: "melody",
    label: "主旋律",
    options: ["参考，不强制", "锁定主旋律", "只保留轮廓"],
  },
  {
    id: "newMelody",
    label: "新增旋律",
    options: ["核心", "参考", "不使用"],
  },
  {
    id: "arrangement",
    label: "编曲风格",
    options: ["允许AI自由生成", "电子流行", "钢琴与电子氛围"],
  },
  {
    id: "emotion",
    label: "情绪氛围",
    options: ["仅提取情绪", "作为核心情绪", "允许重新创作"],
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
  workspaces: "sonic-seed.workspaces",
  clientId: "sonic-seed.client-id",
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

function readStringStorage(key: string, fallback: string) {
  if (typeof window === "undefined") {
    return fallback;
  }

  return window.localStorage.getItem(key) ?? fallback;
}

function writeStringStorage(key: string, value: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, value);
}

function getOrCreateClientId() {
  const current = readStringStorage(STORAGE_KEYS.clientId, "");
  if (current) {
    return current;
  }

  const next = `client_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  writeStringStorage(STORAGE_KEYS.clientId, next);
  return next;
}

function getCollaboratorName(clientId: string) {
  return clientId.startsWith("client_") ? `接力者 ${clientId.slice(-4)}` : "接力者";
}

function summarizePrompt(prompt: string) {
  const firstLine = prompt.split("\n").find((line) => line.trim())?.trim() ?? "未命名创作";
  return firstLine.slice(0, 24);
}

function getTaskStatusLabel(status: DemoTaskResponse["status"]) {
  if (status === "succeeded") {
    return "任务完成";
  }

  if (status === "failed") {
    return "生成失败";
  }

  if (status === "running") {
    return "生成中";
  }

  return "排队中";
}

function versionFromTask(task: DemoTaskResponse, index: number): DemoVersion {
  return {
    id: `version_${task.taskId}`,
    title: `版本 ${index + 1}`,
    meta: task.provider ? `${task.provider} · ${task.taskId}` : `任务 ${task.taskId}`,
    note: task.message,
    status: getTaskStatusLabel(task.status),
    progress: task.progress ?? 0,
    projectId: task.projectId,
    taskId: task.taskId,
    audioUrl: task.audioUrl,
    lyrics: task.lyrics,
  };
}

function formatDemoTaskMessage(task: DemoTaskResponse) {
  const statusPrefix =
    task.status === "succeeded" ? "版本任务完成" : task.status === "failed" ? `生成失败：${task.message}` : task.message;

  if (!task.lyrics) {
    return statusPrefix;
  }

  return `${statusPrefix}\n\n歌词上下文：\n${task.lyrics}`;
}

function getSharedProjectId() {
  if (typeof window === "undefined") {
    return "";
  }

  return new URLSearchParams(window.location.search).get("project") ?? "";
}

function getShareToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return new URLSearchParams(window.location.search).get("share") ?? "";
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

function getCreationSeedIcon(kind: CreationSeed["kind"]) {
  if (kind === "歌词卡" || kind === "故事卡") {
    return Type;
  }

  if (kind === "氛围图") {
    return ImageIcon;
  }

  if (kind === "情绪卡") {
    return Heart;
  }

  if (kind === "节奏卡") {
    return SlidersHorizontal;
  }

  return FileAudio;
}

function cardToCreationSeed(card: InspirationCard): CreationSeed {
  const firstAttachment = card.attachments[0];
  const kind: CreationSeed["kind"] = firstAttachment?.type === "image" || firstAttachment?.type === "video" ? "氛围图" : firstAttachment?.type === "audio" ? "旋律卡" : "歌词卡";

  return {
    id: `library_${card.id}`,
    kind,
    title: card.title,
    description: card.content || card.tags[0]?.value || "来自灵感库的素材",
    source: "来自 灵感库",
    tone: kind === "氛围图" ? "night" : kind === "旋律卡" ? "mint" : "coral",
    attachments: card.attachments,
  };
}

function inferMode(attachments: BriefAttachment[]): InputMode {
  if (attachments.some((attachment) => attachment.type === "audio")) {
    return "humming";
  }

  if (attachments.some((attachment) => attachment.type === "image" || attachment.type === "video")) {
    return "image";
  }

  return "dialogue";
}

function toBriefAttachments(items: BriefAttachment[]): BriefAttachment[] {
  return items.map(({ type, name, uploadId }) => ({ type, name, uploadId }));
}

function uniqueBriefAttachments(items: BriefAttachment[]): BriefAttachment[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.uploadId ?? `${item.type}:${item.name}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function buildPrompt(text: string, attachments: LocalAttachment[]) {
  const attachmentLines = attachments.map((attachment) => `附件: ${attachment.type} / ${attachment.name} / ${attachment.status}`);
  return [text.trim(), ...attachmentLines].filter(Boolean).join("\n");
}

function mergeProjectList(current: Project[], incoming: Project) {
  return current.some((project) => project.id === incoming.id)
    ? current.map((project) => (project.id === incoming.id ? { ...project, ...incoming } : project))
    : [incoming, ...current];
}

function mergeSessionList(current: CollaborationSession[], incoming: CollaborationSession) {
  return current.some((session) => session.id === incoming.id)
    ? current.map((session) => (session.id === incoming.id ? incoming : session))
    : [incoming, ...current];
}

function readWorkbenchArray<T>(workbench: Record<string, unknown>, key: keyof WorkbenchSnapshot) {
  const value = workbench[key];
  return Array.isArray(value) ? (value as T[]) : null;
}

function readWorkbenchString(workbench: Record<string, unknown>, key: keyof WorkbenchSnapshot) {
  const value = workbench[key];
  return typeof value === "string" ? value : null;
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
  const clientId = useMemo(getOrCreateClientId, []);
  const shareToken = useMemo(getShareToken, []);
  const [projects, setProjects] = useState<Project[]>(() => (hasApiConnection() ? [] : readStorage<Project[]>(STORAGE_KEYS.projects, [])));
  const [activeProjectId, setActiveProjectId] = useState<string>(() =>
    getSharedProjectId() || (hasApiConnection() ? "" : (readStorage<Project[]>(STORAGE_KEYS.projects, [])[0]?.id ?? "")),
  );
  const [historyCollapsed, setHistoryCollapsed] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<LocalAttachment[]>([]);
  const [analysisTags, setAnalysisTags] = useState<AnalysisTag[]>(initialTags);
  const [brief, setBrief] = useState<BriefResponse | null>(null);
  const [analysisState, setAnalysisState] = useState("实时分析待命");
  const [versions, setVersions] = useState<DemoVersion[]>(() => (hasApiConnection() ? [] : readStorage<DemoVersion[]>(STORAGE_KEYS.versions, [])));
  const [activeVersionId, setActiveVersionId] = useState<string>(() =>
    hasApiConnection() ? "" : (readStorage<DemoVersion[]>(STORAGE_KEYS.versions, [])[0]?.id ?? ""),
  );
  const [listenState, setListenState] = useState("暂无可试听版本");
  const [shareState, setShareState] = useState("复制协作链接");
  const [events, setEvents] = useState<CollaborationEvent[]>([]);
  const [libraryCount, setLibraryCount] = useState(() => (hasApiConnection() ? 0 : readStorage<InspirationCard[]>(STORAGE_KEYS.library, []).length));
  const [libraryCards, setLibraryCards] = useState<InspirationCard[]>(() =>
    hasApiConnection() ? [] : readStorage<InspirationCard[]>(STORAGE_KEYS.library, []),
  );
  const [creationModalOpen, setCreationModalOpen] = useState(false);
  const [creationTab, setCreationTab] = useState<"creation" | "versionTree">("creation");
  const [creationPrompt, setCreationPrompt] = useState(defaultCreationPrompt);
  const [selectedCreationIds, setSelectedCreationIds] = useState<string[]>([]);
  const [creationFilter, setCreationFilter] = useState<"全部" | CreationSeed["kind"]>("全部");
  const [creationSettings, setCreationSettings] = useState<Record<string, string>>(() =>
    Object.fromEntries(creationSettingRows.map((row) => [row.id, row.options[0]])),
  );
  const [activeSession, setActiveSession] = useState<CollaborationSession | null>(null);
  const [collaborationSessions, setCollaborationSessions] = useState<CollaborationSession[]>([]);
  const [reviewSessionId, setReviewSessionId] = useState("");
  const [collaborationState, setCollaborationState] = useState(() => (hasApiConnection() ? "接力未开启" : "连接后端后可共享"));
  const analysisRequestRef = useRef(0);
  const sessionSyncRef = useRef("");
  const projectWorkspaceSyncRef = useRef("");
  const newProjectRef = useRef("");
  const creationSelectionInitializedRef = useRef(false);
  const [loadedWorkspaceProjectId, setLoadedWorkspaceProjectId] = useState("");

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

  const visibleVersions = useMemo(
    () => (activeProject.id ? versions.filter((version) => version.projectId === activeProject.id || !version.projectId) : versions),
    [activeProject.id, versions],
  );

  const activeVersion = useMemo(
    () => visibleVersions.find((version) => version.id === activeVersionId) ?? visibleVersions[0],
    [activeVersionId, visibleVersions],
  );

  const currentPrompt = useMemo(() => buildPrompt(draft, attachments), [draft, attachments]);
  const currentMode = useMemo(() => inferMode(attachments), [attachments]);
  const canSubmit = currentPrompt.trim().length > 2;
  const activeCollaborationSessions = useMemo(
    () => collaborationSessions.filter((session) => session.projectId === activeProject.id),
    [activeProject.id, collaborationSessions],
  );
  const isShareViewer = Boolean(shareToken && (!activeSession || activeSession.creatorClientId !== clientId));
  const visibleCollaborationSessions = useMemo(
    () => (isShareViewer ? activeCollaborationSessions.filter((session) => session.collaboratorClientId === clientId) : activeCollaborationSessions),
    [activeCollaborationSessions, clientId, isShareViewer],
  );
  const hasCreatorConflict = Boolean(activeProject.creatorClientId && activeProject.creatorClientId !== clientId);
  const canShareWorkspace = hasApiConnection() && !isShareViewer && !hasCreatorConflict;
  const shareButtonText = !hasApiConnection() ? "连接后端后可分享" : canShareWorkspace ? shareState : "创建者可分享";
  const creationSeeds = useMemo(() => libraryCards.map(cardToCreationSeed), [libraryCards]);
  const visibleCreationSeeds = useMemo(
    () => creationSeeds.filter((seed) => creationFilter === "全部" || seed.kind === creationFilter),
    [creationFilter, creationSeeds],
  );
  const selectedCreationSeeds = useMemo(
    () => creationSeeds.filter((seed) => selectedCreationIds.includes(seed.id)),
    [creationSeeds, selectedCreationIds],
  );
  const creationKinds = useMemo(() => Array.from(new Set(creationSeeds.map((seed) => seed.kind))), [creationSeeds]);

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
    const availableIds = new Set(creationSeeds.map((seed) => seed.id));
    setSelectedCreationIds((current) => {
      const retained = current.filter((id) => availableIds.has(id));
      if (!creationSelectionInitializedRef.current && creationSeeds.length) {
        creationSelectionInitializedRef.current = true;
        return creationSeeds.map((seed) => seed.id);
      }

      return retained;
    });
  }, [creationSeeds]);

  useEffect(() => {
    if (!activeVersion && activeVersionId) {
      setActiveVersionId("");
    }
  }, [activeVersion, activeVersionId]);

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
    if (!activeProject.id || isShareViewer) {
      return;
    }

    if (newProjectRef.current === activeProject.id) {
      setLoadedWorkspaceProjectId(activeProject.id);
      projectWorkspaceSyncRef.current = "";
      newProjectRef.current = "";
      return;
    }

    setLoadedWorkspaceProjectId("");
    projectWorkspaceSyncRef.current = "";
    setAnalysisState("正在恢复完整对话");

    if (!hasApiConnection()) {
      const localWorkspaces = readStorage<Record<string, WorkbenchSnapshot>>(STORAGE_KEYS.workspaces, {});
      const localWorkspace = localWorkspaces[activeProject.id];
      if (localWorkspace) {
        applyWorkbenchSnapshot(localWorkspace as Record<string, unknown>, "已恢复完整对话");
      } else {
        resetWorkbenchForProject();
      }
      setLoadedWorkspaceProjectId(activeProject.id);
      return;
    }

    let cancelled = false;

    void getProjectWorkspace(activeProject.id)
      .then((workspace) => {
        if (cancelled) {
          return;
        }

        if (workspace && Object.keys(workspace.workbench).length) {
          applyWorkbenchSnapshot(workspace.workbench, "已恢复完整对话");
        } else {
          resetWorkbenchForProject();
        }

        setLoadedWorkspaceProjectId(activeProject.id);
      })
      .catch(() => {
        if (!cancelled) {
          resetWorkbenchForProject("完整对话恢复失败");
          setLoadedWorkspaceProjectId(activeProject.id);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeProject.id, isShareViewer]);

  useEffect(() => {
    if (!shareToken) {
      return;
    }

    if (!hasApiConnection()) {
      setCollaborationState("需要连接 Python 后端才能加入接力");
      return;
    }

    let cancelled = false;
    setCollaborationState("正在加入私域接力");

    void joinShareLink(shareToken, clientId, getCollaboratorName(clientId))
      .then(({ project, session }) => {
        if (cancelled) {
          return;
        }

        setProjects((current) => mergeProjectList(current, project));
        setActiveProjectId(project.id);
        setActiveSession(session);
        setReviewSessionId(session.id);
        setCollaborationSessions((current) => mergeSessionList(current, session));
        setCollaborationState("已加入私域接力");
        addEvent(session.collaboratorName, "通过私域链接进入工作台");

        if (Object.keys(session.workbench).length) {
          applySessionWorkbench(session);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCollaborationState("私域链接不可用");
          setAnalysisState("私域链接加入失败");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [clientId, shareToken]);

  useEffect(() => {
    if (!activeProject.id) {
      setCollaborationSessions([]);
      return;
    }

    if (!hasApiConnection()) {
      setCollaborationState("连接后端后可共享");
      return;
    }

    let cancelled = false;

    const refreshSessions = () => {
      void listCollaborationSessions(activeProject.id)
        .then((sessions) => {
          if (cancelled) {
            return;
          }

          setCollaborationSessions(sessions);
          setCollaborationState(sessions.length ? `${sessions.length} 个接力进度` : "暂无接力进度");
        })
        .catch(() => {
          if (!cancelled) {
            setCollaborationState("接力进度同步失败");
          }
        });
    };

    refreshSessions();
    const interval = window.setInterval(refreshSessions, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeProject.id]);

  useEffect(() => {
    if (!hasApiConnection()) {
      return;
    }

    let cancelled = false;
    void Promise.all([listInspirations(), listDemoTasks()])
      .then(([remoteCards, remoteTasks]) => {
        if (cancelled) {
          return;
        }

        const remoteVersions = remoteTasks.map(versionFromTask);
        setLibraryCount(remoteCards.length);
        setLibraryCards(remoteCards);
        setVersions(remoteVersions);
        setActiveVersionId((current) => current || (remoteVersions[0]?.id ?? ""));
        writeStorage(STORAGE_KEYS.library, remoteCards);
      })
      .catch(() => {
        setAnalysisState("后端历史同步失败");
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

  useEffect(() => {
    if (!hasApiConnection() || !activeSession || activeSession.collaboratorClientId !== clientId) {
      return;
    }

    const snapshot = buildWorkbenchSnapshot();
    const latestMessage = messages.length ? messages[messages.length - 1].text.slice(0, 220) : "正在整理创作工作台";
    const nextProgress = Math.max(activeProject.progress || 0, activeVersion?.progress ?? 0, activeSession.progress);
    const signature = JSON.stringify({
      sessionId: activeSession.id,
      status: analysisState,
      progress: nextProgress,
      latestMessage,
      snapshot,
    });

    if (sessionSyncRef.current === signature) {
      return;
    }

    const timer = window.setTimeout(() => {
      void updateCollaborationSession(activeSession.id, {
        collaboratorClientId: clientId,
        collaboratorName: getCollaboratorName(clientId),
        status: analysisState,
        progress: nextProgress,
        lastMessage: latestMessage,
        workbench: snapshot,
      })
        .then((session) => {
          sessionSyncRef.current = signature;
          setActiveSession(session);
          setCollaborationSessions((current) => mergeSessionList(current, session));
          setCollaborationState("接力进度已同步");
        })
        .catch(() => {
          setCollaborationState("接力进度同步失败");
        });
    }, 900);

    return () => window.clearTimeout(timer);
  }, [activeProject.progress, activeSession, activeVersion?.progress, analysisState, analysisTags, brief, clientId, draft, messages, versions]);

  useEffect(() => {
    if (!activeProject.id || isShareViewer || loadedWorkspaceProjectId !== activeProject.id) {
      return;
    }

    const snapshot = buildWorkbenchSnapshot();
    const signature = JSON.stringify({
      projectId: activeProject.id,
      clientId,
      snapshot,
    });

    if (projectWorkspaceSyncRef.current === signature) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (!hasApiConnection()) {
        const localWorkspaces = readStorage<Record<string, WorkbenchSnapshot>>(STORAGE_KEYS.workspaces, {});
        writeStorage(STORAGE_KEYS.workspaces, {
          ...localWorkspaces,
          [activeProject.id]: snapshot,
        });
        projectWorkspaceSyncRef.current = signature;
        return;
      }

      void saveProjectWorkspace(activeProject.id, {
        clientId,
        workbench: snapshot,
      })
        .then(() => {
          projectWorkspaceSyncRef.current = signature;
        })
        .catch(() => {
          setAnalysisState("完整对话保存失败");
        });
    }, 700);

    return () => window.clearTimeout(timer);
  }, [activeProject.id, activeVersionId, analysisTags, brief, clientId, draft, isShareViewer, loadedWorkspaceProjectId, messages, versions]);

  function addEvent(actor: string, action: string) {
    setEvents((current) => [{ id: `evt_${Date.now()}`, actor, action, time: nowLabel() }, ...current].slice(0, 5));
  }

  function buildWorkbenchSnapshot(overrides: Partial<WorkbenchSnapshot> = {}): WorkbenchSnapshot {
    return {
      messages: overrides.messages ?? messages,
      analysisTags: overrides.analysisTags ?? analysisTags,
      versions: overrides.versions ?? visibleVersions,
      draft: overrides.draft ?? draft,
      brief: overrides.brief ?? brief,
      projectId: activeProject.id,
      activeVersionId: overrides.activeVersionId ?? activeVersionId,
      updatedAt: new Date().toISOString(),
    };
  }

  function resetWorkbenchForProject(status = "已打开创作历史") {
    setMessages(initialMessages);
    setAnalysisTags(initialTags);
    setBrief(null);
    setDraft("");
    setAttachments([]);
    setActiveVersionId("");
    setAnalysisState(status);
  }

  function applyWorkbenchSnapshot(workbench: Record<string, unknown>, status: string) {
    const nextMessages = readWorkbenchArray<ChatMessage>(workbench, "messages");
    const nextTags = readWorkbenchArray<AnalysisTag>(workbench, "analysisTags");
    const nextVersions = readWorkbenchArray<DemoVersion>(workbench, "versions");
    const nextDraft = readWorkbenchString(workbench, "draft");
    const nextActiveVersionId = readWorkbenchString(workbench, "activeVersionId");
    const nextProjectId = readWorkbenchString(workbench, "projectId") ?? activeProject.id;

    if (nextMessages) {
      setMessages(nextMessages);
    }

    if (nextTags) {
      setAnalysisTags(nextTags);
    }

    if (nextVersions) {
      const nextIds = new Set(nextVersions.map((version) => version.id));
      setVersions((current) => [...nextVersions, ...current.filter((version) => !nextIds.has(version.id) && version.projectId !== nextProjectId)]);
    }

    if (typeof workbench.brief === "object") {
      setBrief((workbench.brief ?? null) as BriefResponse | null);
    }

    if (nextDraft !== null) {
      setDraft(nextDraft);
    }

    if (nextActiveVersionId) {
      setActiveVersionId(nextActiveVersionId);
    }

    setAnalysisState(status);
  }

  function applySessionWorkbench(session: CollaborationSession) {
    applyWorkbenchSnapshot(session.workbench, `${session.collaboratorName} 的接力工作台`);
    setCollaborationState(`${session.collaboratorName} 最新进度 ${session.progress}%`);
  }

  function handleSelectProject(projectId: string) {
    setActiveProjectId(projectId);
    setReviewSessionId("");
    setActiveSession((session) => (session?.projectId === projectId && session.collaboratorClientId === clientId ? session : null));
    resetWorkbenchForProject("正在打开创作历史");
  }

  async function handleOpenCollaborationSession(sessionId: string) {
    setReviewSessionId(sessionId);
    const localSession = collaborationSessions.find((session) => session.id === sessionId);

    if (localSession) {
      setActiveSession(localSession);
      setActiveProjectId(localSession.projectId);
      applySessionWorkbench(localSession);
    }

    try {
      const session = await getCollaborationSession(sessionId);
      setActiveSession(session);
      setActiveProjectId(session.projectId);
      setCollaborationSessions((current) => mergeSessionList(current, session));
      applySessionWorkbench(session);
      addEvent(session.collaboratorName, "打开了接力工作台快照");
    } catch {
      setCollaborationState("接力工作台读取失败");
    }
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
                creatorClientId: project.creatorClientId ?? clientId,
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
      creatorClientId: clientId,
    };
    setProjects((current) => [nextProject, ...current]);
    setActiveProjectId(id);
    newProjectRef.current = id;
    setLoadedWorkspaceProjectId(id);
    addEvent("我", "创建了新的创作历史");
    return id;
  }

  function toggleCreationSeed(id: string) {
    setSelectedCreationIds((current) => (current.includes(id) ? current.filter((seedId) => seedId !== id) : [...current, id]));
  }

  async function handleAddCreationSeed() {
    try {
      const cards = hasApiConnection() ? await listInspirations() : readStorage<InspirationCard[]>(STORAGE_KEYS.library, []);
      setLibraryCards(cards);
      setLibraryCount(cards.length);
      writeStorage(STORAGE_KEYS.library, cards);

      if (!cards.length) {
        setAnalysisState("暂无可加入的灵感记录");
        return;
      }

      const nextIds = cards.map((card) => `library_${card.id}`);
      setSelectedCreationIds((current) => Array.from(new Set([...current, ...nextIds])));
      addEvent("我", `载入 ${cards.length} 条灵感记录`);
    } catch {
      setAnalysisState("灵感库读取失败");
    }
  }

  function handlePromptChip(value: string) {
    setCreationPrompt(value);
  }

  function updateCreationSetting(id: string, value: string) {
    setCreationSettings((current) => ({
      ...current,
      [id]: value,
    }));
  }

  function getCreationSettingSource(id: string) {
    const lyricSeed = selectedCreationSeeds.find((seed) => seed.kind === "歌词卡" || seed.kind === "故事卡");
    const melodySeed = selectedCreationSeeds.find((seed) => seed.kind === "旋律卡");
    const sceneSeed = selectedCreationSeeds.find((seed) => seed.kind === "氛围图");
    const emotionSeed = selectedCreationSeeds.find((seed) => seed.kind === "情绪卡");

    if (id === "lyric") {
      return lyricSeed?.title ?? "未选择歌词灵感";
    }

    if (id === "melody" || id === "newMelody") {
      return melodySeed?.title ?? "未选择旋律灵感";
    }

    if (id === "emotion") {
      return emotionSeed?.title ?? sceneSeed?.title ?? "未选择情绪灵感";
    }

    return sceneSeed?.title ?? selectedCreationSeeds[0]?.title ?? "未选择参考灵感";
  }

  function buildCreationSetupPrompt() {
    const seedLines = selectedCreationSeeds.map((seed) => `- ${seed.kind}：${seed.title}（${seed.description}，${seed.source}）`);
    const settingLines = creationSettingRows.map((row) => `- ${row.label}（${getCreationSettingSource(row.id)}）：${creationSettings[row.id]}`);

    return [
      creationPrompt.trim(),
      "",
      "已选灵感：",
      seedLines.length ? seedLines.join("\n") : "- 暂未选择灵感",
      "",
      "音乐基因设置：",
      settingLines.join("\n"),
    ].join("\n");
  }

  async function handleApplyCreationSetup(shouldGenerate: boolean) {
    const promptForTask = buildCreationSetupPrompt();
    const projectId = ensureProject(promptForTask);
    setDraft(promptForTask);
    setCreationModalOpen(false);
    setMessages((current) => [
      ...current,
      {
        id: `setup_${Date.now()}`,
        role: "user",
        label: "我",
        text: `创作配置已更新：\n${promptForTask}`,
      },
    ]);
    addEvent("我", shouldGenerate ? "提交创作配置并生成试听版" : "保存了创作配置草稿");

    const selectedAttachments = uniqueBriefAttachments(selectedCreationSeeds.flatMap((seed) => seed.attachments));
    const nextBrief = await runAnalysis("manual", promptForTask, selectedAttachments, true, projectId);
    if (!shouldGenerate) {
      setAnalysisState("创作草稿已保存");
      return;
    }

    const referenceBrief =
      nextBrief ??
      ({
        source: "local",
        title: summarizePrompt(promptForTask),
        summary: "使用创作配置弹窗中的 prompt、灵感和音乐基因设置生成试听版。",
        tags: analysisTags,
        suggestedStyle: "未来都市流行 / 电子合成器 / 中速推进",
        dataFlow: [],
      } satisfies BriefResponse);

    await createVersionForProject(projectId, promptForTask, referenceBrief, selectedAttachments);
  }

  async function runAnalysis(
    reason: "auto" | "manual",
    prompt = currentPrompt,
    nextAttachments: BriefAttachment[] = attachments,
    appendMessage = reason === "manual",
    projectIdOverride = activeProject.id || "draft",
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
        projectId: projectIdOverride,
        mode: inferMode(nextAttachments),
        content: prompt,
        attachments: toBriefAttachments(nextAttachments),
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
        attachments: toBriefAttachments(attachments),
        tags: analysisTags,
      });
      const stored = readStorage<InspirationCard[]>(STORAGE_KEYS.library, []);
      writeStorage(STORAGE_KEYS.library, [card, ...stored]);
      setLibraryCount((count) => count + 1);
      setLibraryCards((current) => [card, ...current]);
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

  async function createVersionForProject(projectId: string, promptForTask: string, referenceBrief: BriefResponse, taskAttachments: BriefAttachment[] = attachments) {
    setAnalysisState("创建版本任务");

    try {
      const task = await createDemoTask({
        projectId,
        prompt: promptForTask,
        referenceBrief,
        attachments: uniqueBriefAttachments(toBriefAttachments(taskAttachments)),
      });

      const versionId = `version_${task.taskId}`;
      const nextVersion: DemoVersion = {
        ...versionFromTask({ ...task, projectId }, versions.length),
        id: versionId,
        progress: task.progress ?? 12,
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
              text: formatDemoTaskMessage(task),
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

    await createVersionForProject(projectId, promptForTask, referenceBrief);
  }

  async function pollVersionTask(task: DemoTaskResponse, versionId: string) {
    let latestTask = task;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 1400));

      try {
        latestTask = await getDemoTask(latestTask.taskId);
        const statusLabel = getTaskStatusLabel(latestTask.status);

        setVersions((current) =>
          current.map((version) =>
            version.id === versionId
              ? {
                  ...version,
                  note: latestTask.message,
                  status: statusLabel,
                  progress: latestTask.progress ?? (latestTask.status === "succeeded" ? 100 : Math.min(92, version.progress + 16)),
                  projectId: latestTask.projectId ?? version.projectId,
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
                text: formatDemoTaskMessage(latestTask),
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
      if (visibleVersions.length < 2) {
        return current;
      }

      const currentIndex = visibleVersions.findIndex((version) => version.id === activeVersion.id);
      const nextVersion = visibleVersions[(currentIndex + 1) % visibleVersions.length];
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
      creatorClientId: clientId,
    };

    setProjects((current) => [nextProject, ...current]);
    setActiveProjectId(id);
    newProjectRef.current = id;
    setLoadedWorkspaceProjectId(id);
    resetWorkbenchForProject("新建创作空间");
    addEvent("我", "新建了一个创作空间");
  }

  async function handleCopyShareLink() {
    if (!canShareWorkspace) {
      setShareState(!hasApiConnection() ? "连接后端后可分享" : "只有创建者可分享");
      window.setTimeout(() => setShareState("复制协作链接"), 2200);
      return;
    }

    const projectId = activeProject.id || ensureProject(currentPrompt || "新的创作");
    const localProject =
      projects.find((project) => project.id === projectId) ??
      ({
        ...activeProject,
        id: projectId,
        title: activeProject.title || "未命名创作",
        subtitle: currentPrompt ? summarizePrompt(currentPrompt) : activeProject.subtitle,
      } satisfies Project);

    if (localProject.creatorClientId && localProject.creatorClientId !== clientId) {
      setShareState("只有创建者可分享");
      window.setTimeout(() => setShareState("复制协作链接"), 2200);
      return;
    }

    const projectForSharing: Project = {
      ...localProject,
      creatorClientId: localProject.creatorClientId ?? clientId,
      status: localProject.status === "未保存" ? "可接力" : localProject.status,
      updated: nowLabel(),
    };

    setShareState("生成链接中");
    setProjects((current) => mergeProjectList(current, projectForSharing));

    try {
      await saveProject(projectForSharing);
      const share = await createShareLink(projectId, clientId);
      const link = `${window.location.origin}${share.path}`;
      await navigator.clipboard.writeText(link);
      setShareState("链接已复制");
      setCollaborationState("私域链接已生成，等待接力");
      addEvent("我", "生成了私域接力链接");
    } catch {
      setShareState("分享失败");
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
        <button
          className="icon-button"
          disabled={!canShareWorkspace}
          onClick={handleCopyShareLink}
          title={shareButtonText}
          type="button"
          aria-label="分享创作空间"
        >
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
                      onClick={() => handleSelectProject(project.id)}
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
                    <p>发送内容、加入灵感库或创作版本后会自动创建。</p>
                  </article>
                )}
              </div>

              <section className="handoff-panel" aria-label="私域接力进度">
                <div className="handoff-heading">
                  <span>
                    <UsersRound size={14} />
                    私域接力
                  </span>
                  <small>{collaborationState}</small>
                </div>

                <div className="handoff-list">
                  {visibleCollaborationSessions.length ? (
                    visibleCollaborationSessions.map((session) => (
                      <button
                        className="handoff-item"
                        data-active={session.id === reviewSessionId}
                        key={session.id}
                        onClick={() => void handleOpenCollaborationSession(session.id)}
                        type="button"
                      >
                        <span>
                          <UsersRound size={13} />
                          {session.collaboratorClientId === clientId ? "我的接力" : session.collaboratorName}
                        </span>
                        <strong>{session.status}</strong>
                        <em>{session.lastMessage || "等待继续修改"}</em>
                        <span className="progress-track" aria-label={`${session.collaboratorName}进度 ${session.progress}%`}>
                          <span style={{ width: `${session.progress}%` }} />
                        </span>
                      </button>
                    ))
                  ) : (
                    <article className="handoff-empty">
                      <UsersRound size={16} />
                      <strong>还没有接力进度</strong>
                      <p>创建者复制私域链接后，协作者进入并修改时会显示在这里。</p>
                    </article>
                  )}
                </div>
              </section>

              <button className="share-link" disabled={!canShareWorkspace} onClick={handleCopyShareLink} type="button">
                {shareState === "复制协作链接" ? <Link2 size={16} /> : <Copy size={16} />}
                {shareButtonText}
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
              <div className="heading-actions">
                <button className="setup-open-button" onClick={() => setCreationModalOpen(true)} type="button">
                  <SlidersHorizontal size={14} />
                  创作配置
                </button>
                <span className="status-pill">
                  {analysisState.includes("中") ? <Loader2 size={14} className="spin" /> : <Bot size={14} />}
                  {analysisState}
                </span>
              </div>
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
                    <button className="utility-button" onClick={() => setCreationModalOpen(true)} type="button">
                      <Headphones size={16} />
                      创作版本
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
                <span>{activeVersion ? `${activeVersion.progress}%` : `${visibleVersions.length} 个版本`}</span>
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

      {creationModalOpen && (
        <section className="creation-modal-layer" role="dialog" aria-modal="true" aria-label="创作配置弹窗">
          <div className="creation-modal">
            <header className="creation-modal-tabs">
              <div className="tab-strip" role="tablist" aria-label="创作配置标签">
                <button data-active={creationTab === "creation"} onClick={() => setCreationTab("creation")} role="tab" type="button">
                  创作
                </button>
                <button data-active={creationTab === "versionTree"} onClick={() => setCreationTab("versionTree")} role="tab" type="button">
                  版本树
                </button>
              </div>
              <button className="modal-close-button" onClick={() => setCreationModalOpen(false)} type="button" aria-label="关闭创作配置">
                <X size={18} />
              </button>
            </header>

            <div className="creation-modal-head">
              <h2>当前创作（基于 V1 原生版）</h2>
              <div className="creation-modal-actions">
                <button className="draft-button" onClick={() => void handleApplyCreationSetup(false)} type="button">
                  <Check size={15} />
                  保存草稿
                </button>
                <button className="generate-listen-button" onClick={() => void handleApplyCreationSetup(true)} type="button">
                  <Headphones size={15} />
                  生成试听版
                </button>
              </div>
            </div>

            {creationTab === "creation" ? (
              <div className="creation-modal-grid">
                <aside className="selected-seeds-panel" aria-label="已选灵感">
                  <div className="selected-seeds-head">
                    <h3>已选灵感（{selectedCreationIds.length}）</h3>
                    <label>
                      <select
                        aria-label="筛选灵感类型"
                        onChange={(event) => setCreationFilter(event.target.value as "全部" | CreationSeed["kind"])}
                        value={creationFilter}
                      >
                        <option value="全部">全部</option>
                        {creationKinds.map((kind) => (
                          <option key={kind} value={kind}>
                            {kind}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={14} />
                    </label>
                  </div>

                  <div className="seed-list">
                    {visibleCreationSeeds.length ? (
                      visibleCreationSeeds.map((seed) => {
                        const Icon = getCreationSeedIcon(seed.kind);
                        const selected = selectedCreationIds.includes(seed.id);
                        return (
                          <button className="seed-item" data-selected={selected} key={seed.id} onClick={() => toggleCreationSeed(seed.id)} type="button">
                            <span className="seed-icon" data-tone={seed.tone}>
                              <Icon size={18} />
                            </span>
                            <span className="seed-copy">
                              <em>{seed.kind}</em>
                              <strong>{seed.title}</strong>
                              <small>{seed.description}</small>
                            </span>
                            <span className="seed-source">{seed.source}</span>
                          </button>
                        );
                      })
                    ) : (
                      <article className="seed-empty-state">
                        <Library size={18} />
                        <strong>暂无灵感记录</strong>
                        <p>先在工作台发送内容并加入灵感库，再回到这里选择素材。</p>
                      </article>
                    )}
                  </div>

                  <button className="add-seed-button" onClick={() => void handleAddCreationSeed()} type="button">
                    <Plus size={17} />
                    添加灵感
                  </button>
                </aside>

                <section className="prompt-config-panel" aria-label="Prompt 与音乐基因设置">
                  <div className="prompt-card">
                    <h3>Prompt</h3>
                    <div className="prompt-editor">
                      <textarea
                        aria-label="自定义 Prompt"
                        maxLength={500}
                        onChange={(event) => setCreationPrompt(event.target.value)}
                        value={creationPrompt}
                      />
                      <span>{creationPrompt.length}/500</span>
                    </div>
                    <div className="prompt-chip-row" aria-label="Prompt 模板">
                      {promptChips.map((chip) => (
                        <button key={chip.label} onClick={() => handlePromptChip(chip.value)} type="button">
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="music-gene-panel">
                    <h3>音乐基因设置</h3>
                    <div className="gene-setting-list">
                      {creationSettingRows.map((row) => (
                        <article className="gene-setting-row" key={row.id}>
                          <div>
                            <strong>{row.label}</strong>
                            <span>（{getCreationSettingSource(row.id)}）</span>
                          </div>
                          <label>
                            <select
                              aria-label={`${row.label}设置`}
                              onChange={(event) => updateCreationSetting(row.id, event.target.value)}
                              value={creationSettings[row.id]}
                            >
                              {row.options.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                            <ChevronDown size={14} />
                          </label>
                        </article>
                      ))}
                    </div>
                  </div>
                </section>
              </div>
            ) : (
              <section className="modal-version-tree" aria-label="版本树">
                <div>
                  <p>版本树</p>
                  <h3>{visibleVersions.length ? "当前创作版本" : "还没有生成版本"}</h3>
                </div>
                <div className="version-tree-list">
                  {(visibleVersions.length ? visibleVersions : [{ id: "draft_version", title: "V1 原生版", meta: "草稿基线", note: "保存 prompt 后可生成试听版", status: "当前基线", progress: 12 }]).map((version) => (
                    <article key={version.id}>
                      <span>{version.title}</span>
                      <strong>{version.status}</strong>
                      <p>{version.note}</p>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </div>
        </section>
      )}
    </main>
  );
}

function LibraryPage() {
  const [cards, setCards] = useState<InspirationCard[]>(() => (hasApiConnection() ? [] : readStorage<InspirationCard[]>(STORAGE_KEYS.library, [])));

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
