import { useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  Bell,
  Bot,
  Check,
  ChevronDown,
  Copy,
  Ellipsis,
  FileAudio,
  FolderPlus,
  Heart,
  Headphones,
  History,
  Home,
  Image as ImageIcon,
  Library,
  LayoutGrid,
  Link2,
  List,
  ListMusic,
  MessageCircle,
  Mic2,
  Music2,
  Network,
  Radio,
  RotateCcw,
  Search,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  Paperclip,
  Pause,
  Pencil,
  Play,
  Plus,
  Send,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Star,
  Tags,
  Type,
  UsersRound,
  Video,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  analyzeInspiration,
  addCommunityComment,
  chatWithMinimax,
  createDemoTask,
  getApiConnectionLabel,
  getCommunityPost,
  getDemoTask,
  getProjectWorkspace,
  hasApiConnection,
  listCommunityPosts,
  listDemoTasks,
  listInspirations,
  listProjects,
  publishCommunityPost,
  saveInspiration,
  saveProject,
  saveProjectWorkspace,
  toggleCommunityLike,
  updateDemoTaskName,
  uploadAttachment,
  uploadAudio,
  type AnalysisTag,
  type BriefAttachment,
  type BriefResponse,
  type CommunityComment,
  type CommunityDemoVersion,
  type CommunityPost,
  type CommunityPostSummary,
  type InspirationRecord,
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

type LibraryDraftAttachment = {
  id: string;
  file: File;
  type: "audio" | "image";
  previewUrl: string;
  uploadId?: string;
  status: "ready" | "uploading" | "uploaded" | "error";
};

type ChatMessage = {
  id: string;
  role: "user" | "ai";
  label: string;
  text: string;
  attachments?: LocalAttachment[];
  audioUrl?: string;
  pending?: boolean;
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
  customName?: string;
  createdAt?: string;
};

type InspirationKind = "歌词句" | "哼唱" | "旋律" | "故事" | "图片" | "环境声音" | "创作反馈" | "Demo";

type Inspiration = {
  id: string;
  kind: InspirationKind;
  title: string;
  excerpt: string;
  tags: string[];
  theme?: string;
  emotion?: string;
  scene?: string;
  genre?: string;
  status?: "待发展" | "已关联" | "已用于 Demo";
  project?: string;
  relations: number;
  updatedDays: number;
  duration?: string;
  mediaLabel?: string;
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

const initialMessages: ChatMessage[] = [];

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
    originalDialogue: ["这句话先不要润色，我想保留那种故作轻松的感觉。", "原句已锁定，可围绕「明天还会见」扩写前后两句。"],
    dialogueSummary: "创作者希望保留原句故作轻松的告别感，不做润色，并围绕「明天还会见」扩写副歌前后两句。",
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
    createdAt: task.createdAt,
    customName: task.customName,
  };
}

function versionLabel(version: DemoVersion): string {
  return version.customName || version.title;
}

function formatDemoTaskMessage(task: DemoTaskResponse) {
  const statusPrefix =
    task.status === "succeeded"
      ? task.audioUrl
        ? "试听版本已生成，可直接播放。"
        : "版本任务完成，但模型没有返回音频地址。"
      : task.status === "failed"
        ? `生成失败：${task.message}`
        : task.message;

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

function readWorkbenchArray<T>(workbench: Record<string, unknown>, key: keyof WorkbenchSnapshot) {
  const value = workbench[key];
  return Array.isArray(value) ? (value as T[]) : null;
}

function readWorkbenchString(workbench: Record<string, unknown>, key: keyof WorkbenchSnapshot) {
  const value = workbench[key];
  return typeof value === "string" ? value : null;
}

function hasWorkbenchContent(workbench: Record<string, unknown>) {
  return Boolean(
    readWorkbenchArray<ChatMessage>(workbench, "messages")?.length ||
      readWorkbenchArray<AnalysisTag>(workbench, "analysisTags")?.length ||
      readWorkbenchArray<DemoVersion>(workbench, "versions")?.length ||
      readWorkbenchString(workbench, "draft") ||
      workbench.brief,
  );
}

const LIBRARY_CACHE_KEY = "sonic-seed.library";
const PROJECT_CACHE_KEY = "sonic-seed.projects";

function readCachedRecords<T>(key: string): T[] {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function writeCachedRecords<T>(key: string, records: T[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(records));
  } catch {
    // The live API remains authoritative when browser storage is unavailable.
  }
}

function getTagValue(record: InspirationRecord, label: AnalysisTag["label"]) {
  return record.tags.find((tag) => tag.label === label)?.value;
}

function inferInspirationKind(record: InspirationRecord): InspirationKind {
  const attachmentTypes = new Set(record.attachments.map((attachment) => attachment.type));
  const searchable = `${record.title} ${record.content}`;

  if (attachmentTypes.has("image") || attachmentTypes.has("video")) return "图片";
  if (attachmentTypes.has("audio")) {
    return /环境|采样|广播|风噪|现场/.test(searchable) ? "环境声音" : "哼唱";
  }
  if (/反馈|修改|调整|建议/.test(searchable)) return "创作反馈";
  if (/故事|那天|回忆|经历/.test(searchable) || record.content.length > 90) return "故事";
  return "歌词句";
}

function iconForInspirationKind(kind: InspirationKind): LucideIcon {
  if (kind === "图片") return ImageIcon;
  if (kind === "哼唱" || kind === "旋律") return Music2;
  if (kind === "环境声音") return Radio;
  if (kind === "Demo") return Play;
  if (kind === "歌词句") return Type;
  return MessageCircle;
}

function daysSince(createdAt: string) {
  const timestamp = Date.parse(createdAt);
  if (Number.isNaN(timestamp)) return 0;
  return Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000));
}

function mapInspirationRecord(record: InspirationRecord, projectTitles: Map<string, string>): Inspiration {
  const kind = inferInspirationKind(record);
  const primaryAttachment = record.attachments[0];
  const tagValues = record.tags.map((tag) => tag.value).filter(Boolean);
  const content = record.content.trim();

  return {
    id: record.id,
    kind,
    title: record.title,
    excerpt: content || (primaryAttachment ? `附件素材：${primaryAttachment.name}` : "尚未补充文字概况"),
    tags: Array.from(new Set([kind, ...tagValues])),
    theme: getTagValue(record, "主题"),
    emotion: getTagValue(record, "情绪"),
    scene: getTagValue(record, "场景"),
    creationPosition: getTagValue(record, "适用位置"),
    usage:
      kind === "图片"
        ? "参考素材、提取情绪"
        : kind === "哼唱" || kind === "环境声音"
          ? "保留原始音频、参考素材"
          : "保留原文、允许扩写",
    status: record.projectId === "inbox" ? "待发展" : "已关联",
    project: projectTitles.get(record.projectId) ?? record.projectId,
    relations: 0,
    updatedDays: daysSince(record.createdAt),
    mediaLabel: kind === "哼唱" || kind === "环境声音" ? primaryAttachment?.name : undefined,
    originalContent: content || undefined,
    dialogueSummary: primaryAttachment ? undefined : content || undefined,
    icon: iconForInspirationKind(kind),
  };
}

function relationScore(left: Inspiration, right: Inspiration) {
  const sharedTags = left.tags.filter((tag) => right.tags.includes(tag)).length;
  const sameProject = Boolean(left.project && left.project === right.project);
  return sharedTags + (sameProject ? 2 : 0);
}

function addRelationCounts(items: Inspiration[]) {
  return items.map((item) => ({
    ...item,
    relations: items.filter((candidate) => candidate.id !== item.id && relationScore(item, candidate) > 0).length,
  }));
}

function initialLibraryInspirations() {
  const cachedRecords = readCachedRecords<InspirationRecord>(LIBRARY_CACHE_KEY);
  if (!cachedRecords.length) return inspirations;

  const cachedProjects = readCachedRecords<ProjectRecord>(PROJECT_CACHE_KEY);
  const projectTitles = new Map(cachedProjects.map((project) => [project.id, project.title]));
  return addRelationCounts(cachedRecords.map((record) => mapInspirationRecord(record, projectTitles)));
}

function HomePage() {
  const homeRef = useRef<HTMLElement>(null);
  const [activeEntry, setActiveEntry] = useState<"library" | "create" | null>(null);
  const [entryClicked, setEntryClicked] = useState(false);

  function handlePointerMove(event: ReactPointerEvent<HTMLElement>) {
    if (event.pointerType === "touch") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    homeRef.current?.style.setProperty("--pointer-x", x.toFixed(3));
    homeRef.current?.style.setProperty("--pointer-y", y.toFixed(3));
  }

  function resetPointer() {
    homeRef.current?.style.setProperty("--pointer-x", "0");
    homeRef.current?.style.setProperty("--pointer-y", "0");
  }

  function handleEntryClick(event: ReactMouseEvent<HTMLAnchorElement>, entry: "library" | "create", href: string) {
    event.preventDefault();
    if (entryClicked) return;
    setActiveEntry(entry);
    setEntryClicked(true);
    const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 450;
    window.setTimeout(() => window.location.assign(href), delay);
  }

  const waveBars = [12, 22, 34, 18, 28, 14, 24, 38, 18, 30, 12];
  const ambientParticles = Array.from({ length: 26 }, (_, index) => ({
    x: (index * 37 + 11) % 100,
    y: (index * 53 + 7) % 100,
    size: 1 + (index % 3),
    delay: index * -0.23,
  }));

  return (
    <main
      className="home-shell museed-home"
      aria-label="Museed 入口"
      ref={homeRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetPointer}
    >
      <header className="home-brand-header">
        <a className="home-brand" href="/" aria-label="Museed 首页">Mus<span>eed</span></a>
      </header>

      <section className="home-dashboard" aria-label="Museed 首页主界面">
        <div className="home-particles" aria-hidden="true">
          {ambientParticles.map((particle, index) => (
            <i key={index} style={{ "--particle-x": `${particle.x}%`, "--particle-y": `${particle.y}%`, "--particle-size": `${particle.size}px`, "--particle-delay": `${particle.delay}s` } as CSSProperties} />
          ))}
        </div>

        <div className="home-status" aria-label="今日灵感 23 条">
          <span>今日灵感</span><strong>23</strong><button aria-label="查看通知" type="button"><Bell size={16} /></button>
        </div>

        <section className="home-hero-copy" aria-labelledby="home-title">
          <p className="home-eyebrow">Music / Memory / Motion</p>
          <h1 id="home-title">让每一刻灵感<br /><span>都有机会成为一首歌</span></h1>
          <p className="home-description">记录、整理、延展你的声音碎片，<br />从一个念头开始，和 Museed 一起把它做完。</p>

          <div className="home-copy-wave" aria-hidden="true">
            {waveBars.map((height, index) => <i key={index} style={{ "--bar-height": `${height}px`, "--bar-delay": `${index * -0.11}s` } as CSSProperties} />)}
          </div>

          <nav className="home-hero-actions" aria-label="主要入口">
            <a
              className="home-entry-action library-action"
              href="/library"
              onMouseEnter={() => setActiveEntry("library")}
              onMouseLeave={() => { if (!entryClicked) setActiveEntry(null); }}
              onFocus={() => setActiveEntry("library")}
              onBlur={() => { if (!entryClicked) setActiveEntry(null); }}
              onClick={(event) => handleEntryClick(event, "library", "/library")}
            >
              <Library size={20} />
              <span><strong>灵感库</strong><small>收集每个瞬间</small></span>
            </a>
            <a
              className="home-entry-action create-action"
              href="/create"
              onMouseEnter={() => setActiveEntry("create")}
              onMouseLeave={() => { if (!entryClicked) setActiveEntry(null); }}
              onFocus={() => setActiveEntry("create")}
              onBlur={() => { if (!entryClicked) setActiveEntry(null); }}
              onClick={(event) => handleEntryClick(event, "create", "/create")}
            >
              <Play size={20} fill="currentColor" />
              <span><strong>开始创作</strong><small>把想法变成 Demo</small></span>
            </a>
          </nav>

          <dl className="home-stats">
            <div><dt>1287</dt><dd>灵感记录</dd></div>
            <div><dt>56</dt><dd>创作项目</dd></div>
            <div><dt>18</dt><dd>已完成 Demo</dd></div>
          </dl>
        </section>

        <section
          className="home-sonic-visual"
          data-active={activeEntry ?? undefined}
          data-clicked={entryClicked ? "true" : undefined}
          aria-label="动态音乐灵感核心"
        >
          <div className="home-core-scene" aria-hidden="true">
            <span className="home-core-glow" />
            <span className="home-core-ring ring-one" />
            <span className="home-core-ring ring-two" />
            <span className="home-core-ring ring-three" />
            <span className="home-core-ring ring-four" />
            <span className="home-core-note"><Music2 size={92} /></span>
            <span className="home-orbit-node node-wave"><Radio size={20} /></span>
            <span className="home-orbit-node node-grid"><LayoutGrid size={19} /></span>
            <span className="home-orbit-node node-star"><Star size={21} /></span>
            <span className="home-orbit-node node-heart"><Heart size={20} /></span>
            <span className="home-orbit-node node-mic"><Mic2 size={20} /></span>
            <span className="home-orbit-node node-idea"><MessageCircle size={20} /></span>
            <span className="home-floating-note note-one">♪</span>
            <span className="home-floating-note note-two">♫</span>
            <span className="home-floating-note note-three">♪</span>
          </div>

          <div className="home-now-playing">
            <span className="home-track-art"><Music2 size={18} /></span>
            <span className="home-track-copy"><strong>灵感正在发芽</strong><small>Museed Demo</small></span>
            <span className="home-track-wave" aria-hidden="true">
              {waveBars.map((height, index) => <i key={index} style={{ "--bar-height": `${Math.max(5, height / 2)}px`, "--bar-delay": `${index * -0.08}s` } as CSSProperties} />)}
            </span>
            <button aria-label="播放灵感正在发芽" type="button"><Play size={16} fill="currentColor" /></button>
          </div>
        </section>

      </section>
    </main>
  );
}

function CreatePage() {
  const selectedInspirationIds = useMemo(
    () =>
      new URLSearchParams(window.location.search)
      .get("inspirations")
      ?.split(",")
      .filter(Boolean) ?? [],
    [],
  );
  const cachedSelectedInspirations = useMemo(
    () =>
      readStorage<InspirationCard[]>(STORAGE_KEYS.library, []).filter((inspiration) =>
        selectedInspirationIds.includes(inspiration.id),
      ),
    [selectedInspirationIds],
  );
  const clientId = useMemo(getOrCreateClientId, []);
  const [projects, setProjects] = useState<Project[]>(() => (hasApiConnection() ? [] : readStorage<Project[]>(STORAGE_KEYS.projects, [])));
  const [activeProjectId, setActiveProjectId] = useState<string>(() =>
    getSharedProjectId() || (hasApiConnection() ? "" : (readStorage<Project[]>(STORAGE_KEYS.projects, [])[0]?.id ?? "")),
  );
  const [historyCollapsed, setHistoryCollapsed] = useState(true);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareProjectId, setShareProjectId] = useState("");
  const [shareTitle, setShareTitle] = useState("");
  const [shareName, setShareName] = useState("");
  const [shareDesc, setShareDesc] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [selectedInspirations, setSelectedInspirations] = useState<InspirationCard[]>(cachedSelectedInspirations);
  const [draft, setDraft] = useState(() =>
    cachedSelectedInspirations.length
      ? `请融合这些灵感继续创作：${cachedSelectedInspirations.map((item) => item.title).join("、")}。`
      : "",
  );
  const [attachments, setAttachments] = useState<LocalAttachment[]>([]);
  const [analysisTags, setAnalysisTags] = useState<AnalysisTag[]>(initialTags);
  const [brief, setBrief] = useState<BriefResponse | null>(null);
  const [analysisState, setAnalysisState] = useState("实时分析待命");
  const [versions, setVersions] = useState<DemoVersion[]>(() => (hasApiConnection() ? [] : readStorage<DemoVersion[]>(STORAGE_KEYS.versions, [])));
  const [activeVersionId, setActiveVersionId] = useState<string>(() =>
    hasApiConnection() ? "" : (readStorage<DemoVersion[]>(STORAGE_KEYS.versions, [])[0]?.id ?? ""),
  );
  const [listenState, setListenState] = useState("暂无可试听版本");
  const [playingVersionId, setPlayingVersionId] = useState("");
  const [playProgress, setPlayProgress] = useState(0);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [editingVersionId, setEditingVersionId] = useState("");
  const [editingName, setEditingName] = useState("");

  function startRenameVersion(version: DemoVersion) {
    setEditingVersionId(version.id);
    setEditingName(version.customName || version.title);
  }

  async function commitRenameVersion(version: DemoVersion) {
    const name = editingName.trim();
    setVersions((current) => current.map((item) => (item.id === version.id ? { ...item, customName: name || undefined } : item)));
    setEditingVersionId("");
    if (version.taskId && (name || version.customName)) {
      try {
        await updateDemoTaskName(version.taskId, name);
      } catch {
        /* 忽略网络错误，本地已更新 */
      }
    }
  }
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
  const analysisRequestRef = useRef(0);
  const projectWorkspaceSyncRef = useRef("");
  const newProjectRef = useRef("");
  const creationSelectionInitializedRef = useRef(false);
  const chatWindowRef = useRef<HTMLDivElement | null>(null);
  const versionAudioRef = useRef<HTMLAudioElement | null>(null);
  const versionAudioIdRef = useRef("");
  const [loadedWorkspaceProjectId, setLoadedWorkspaceProjectId] = useState("");

  const activeProject = useMemo(
    () =>
      projects.find((project) => project.id === activeProjectId) ?? {
        id: "",
        title: "创作工作台",
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
  const isGenerating = Boolean(
    activeVersion &&
      !activeVersion.audioUrl &&
      (activeVersion.progress ?? 0) > 0 &&
      (activeVersion.progress ?? 0) < 100 &&
      activeVersion.status !== "生成失败",
  );
  const playableVersions = useMemo(
    () => visibleVersions.filter((version) => version.audioUrl),
    [visibleVersions],
  );
  const isActiveVersionPlaying = Boolean(activeVersion && playingVersionId === activeVersion.id);

  const currentPrompt = useMemo(() => buildPrompt(draft, attachments), [draft, attachments]);
  const currentMode = useMemo(() => inferMode(attachments), [attachments]);
  const canSubmit = currentPrompt.trim().length > 2;
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
    return () => {
      versionAudioRef.current?.pause();
      versionAudioRef.current = null;
      versionAudioIdRef.current = "";
    };
  }, []);

  useEffect(() => {
    if (!messages.length) {
      return undefined;
    }

    const frame = window.requestAnimationFrame(() => {
      chatWindowRef.current?.scrollTo({
        top: chatWindowRef.current.scrollHeight,
        behavior: "smooth",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [messages]);

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
    if (!activeProject.id) {
      return;
    }

    let cancelled = false;
    const projectId = activeProject.id;

    if (newProjectRef.current === activeProject.id) {
      setLoadedWorkspaceProjectId(activeProject.id);
      projectWorkspaceSyncRef.current = "";
      newProjectRef.current = "";
      return () => {
        cancelled = true;
      };
    }

    setLoadedWorkspaceProjectId("");
    projectWorkspaceSyncRef.current = "";
    setAnalysisState("正在恢复完整对话");

    const localWorkspaces = readStorage<Record<string, WorkbenchSnapshot>>(STORAGE_KEYS.workspaces, {});
    const localSnapshot = localWorkspaces[activeProject.id] as WorkbenchSnapshot | undefined;

    if (localSnapshot && hasWorkbenchContent(localSnapshot)) {
      applyWorkbenchSnapshot(localSnapshot, "已恢复本地对话");
    }

    if (hasApiConnection()) {
      void getProjectWorkspace(activeProject.id)
        .then((workspace) => {
          if (cancelled) {
            return;
          }

          const remoteWorkbench = workspace?.workbench;
          if (remoteWorkbench && hasWorkbenchContent(remoteWorkbench)) {
            applyWorkbenchSnapshot(remoteWorkbench, "已恢复完整对话");
          } else if (!localSnapshot) {
            resetWorkbenchForProject();
          }
        })
        .catch(() => {
          if (!cancelled && !localSnapshot) {
            resetWorkbenchForProject("完整对话恢复失败");
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoadedWorkspaceProjectId(projectId);
          }
        });

      return () => {
        cancelled = true;
      };
    }

    if (!localSnapshot || !hasWorkbenchContent(localSnapshot)) {
      resetWorkbenchForProject();
    }
    setLoadedWorkspaceProjectId(projectId);

    return () => {
      cancelled = true;
    };
  }, [activeProject.id]);

  useEffect(() => {
    if (!hasApiConnection()) {
      return;
    }

    let cancelled = false;
    void Promise.all([listInspirations(), listDemoTasks(activeProjectId || undefined)])
      .then(([remoteCards, remoteTasks]) => {
        if (cancelled) {
          return;
        }

        // 按当前创作记录的生成时间升序编号：该项目第一个 demo 为版本 1
        const sortedTasks = [...remoteTasks].sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""));
        const remoteVersions = sortedTasks.map(versionFromTask);
        setLibraryCount(remoteCards.length);
        setSelectedInspirations(remoteCards.filter((card) => selectedInspirationIds.includes(card.id)));
        setLibraryCards(remoteCards);
        setVersions(remoteVersions);
        // 默认进入"开始创作"时落在最新的创作记录（版本按 createdAt 升序，末尾即最新）
        const latestVersion = remoteVersions[remoteVersions.length - 1];
        const sharedProjectId = getSharedProjectId();
        setActiveVersionId((current) => current || (latestVersion?.id ?? ""));
        if (latestVersion?.projectId) {
          setActiveProjectId((current) => sharedProjectId || latestVersion.projectId || current);
        }
        writeStorage(STORAGE_KEYS.library, remoteCards);
      })
      .catch(() => {
        setAnalysisState("后端历史同步失败");
      });

    return () => {
      cancelled = true;
    };
  }, [activeProjectId, selectedInspirationIds]);

  useEffect(() => {
    if (!canSubmit) {
      setAnalysisState("等待输入");
      return;
    }

    const timer = window.setTimeout(() => {
      void runAnalysis("auto", currentPrompt, attachments);
    }, 900);

    return () => window.clearTimeout(timer);
  }, [activeProject.id, canSubmit, currentMode, currentPrompt, attachments, messages]);

  useEffect(() => {
    if (!activeProject.id || loadedWorkspaceProjectId !== activeProject.id) {
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
  }, [activeProject.id, activeVersionId, analysisTags, brief, clientId, draft, loadedWorkspaceProjectId, messages, versions]);

  function addEvent(_actor: string, _action: string) {
    // 私域接力的操作记录已移除，保留调用点以免改动其它逻辑。
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

  function handleSelectProject(projectId: string) {
    setActiveProjectId(projectId);
    resetWorkbenchForProject("正在打开创作历史");
  }

  function ensureProject(prompt = currentPrompt) {
    const nextTitle = prompt ? summarizePrompt(prompt) : "创作工作台";

    if (activeProjectId) {
      setProjects((current) =>
        current.map((project) =>
          project.id === activeProjectId
            ? {
                ...project,
                title: project.title.startsWith("未命名创作") || project.title === "新的创作" || project.title === "创作工作台" ? nextTitle : project.title,
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
    const nextProject: Project = {
      id,
      title: nextTitle,
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
    // 生成音频时带上之前的多轮对话：配置内容在前，历史对话在后
    const promptForTask = [buildCreationSetupPrompt(), ...messages.map((message) => message.text)]
      .filter((text) => text && text.trim())
      .join("\n");
    const projectId = ensureProject(promptForTask);
    setDraft("");
    setCreationModalOpen(false);
    addEvent("我", shouldGenerate ? "提交创作配置并生成试听版" : "保存了创作配置草稿");

    const selectedAttachments = uniqueBriefAttachments(selectedCreationSeeds.flatMap((seed) => seed.attachments));
    const nextBrief = await runAnalysis("manual", promptForTask, selectedAttachments, projectId);
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

  const [chatThinking, setChatThinking] = useState(false);

  async function handleSend() {
    const sentText = (draft.trim() || currentPrompt.trim());
    const sentAttachments = attachments;
    const messageText = sentText || "已发送附件素材";
    if (!sentText && !sentAttachments.length) {
      return;
    }

    const savedProjectId = ensureProject(messageText);
    const aiMessageId = `ai_pending_${Date.now()}`;
    setChatThinking(true);
    setMessages((current) => [
      ...current,
      {
        id: `user_${Date.now()}`,
        role: "user",
        label: "我",
        text: messageText,
        attachments: sentAttachments,
      },
      {
        id: aiMessageId,
        role: "ai",
        label: "AI",
        text: "思考中...",
        pending: true,
      },
    ]);
    setDraft("");
    setAttachments([]);
    addEvent("我", "发送了一条创作上下文");
    void runAnalysis("auto", sentText, sentAttachments);
    void appendToLibrary(sentText || messageText, sentAttachments, savedProjectId);

    const history = messages
      .map((message) => ({ role: message.role, text: message.text }))
      .filter((message) => message.text.trim());

    try {
      const chatContent = sentText || "（已发送附件素材，请结合上下文给建议）";
      const { reply } = await chatWithMinimax({
        projectId: savedProjectId || activeProject?.id || "local",
        history,
        content: chatContent,
      });
      setMessages((current) =>
        current.map((message) =>
          message.id === aiMessageId
            ? {
                ...message,
                text: reply,
                pending: false,
              }
            : message,
        ),
      );
    } catch {
      setMessages((current) =>
        current.map((message) =>
          message.id === aiMessageId
            ? {
                ...message,
                text: "（对话助手暂时不可用，请稍后再试）",
                pending: false,
              }
            : message,
        ),
      );
    } finally {
      setChatThinking(false);
    }
  }

  async function appendToLibrary(content: string, items: LocalAttachment[], projectId: string) {
    try {
      const card = await saveInspiration({
        projectId,
        title: summarizePrompt(content),
        content,
        attachments: toBriefAttachments(items),
        tags: analysisTags,
      });
      const stored = readStorage<InspirationCard[]>(STORAGE_KEYS.library, []);
      writeStorage(STORAGE_KEYS.library, [card, ...stored]);
      setLibraryCount((count) => count + 1);
      setLibraryCards((current) => [card, ...current]);
      return card;
    } catch {
      return null;
    }
  }

  async function handleSaveInspiration(): Promise<InspirationCard | null> {
    const prompt = currentPrompt;
    if (!prompt.trim()) {
      setAnalysisState("先输入内容或上传附件");
      return null;
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
      return card;
    } catch {
      setAnalysisState("加入灵感库失败");
      return null;
    }
  }

  async function handleCreateVersion() {
    const prompt = currentPrompt;
    if (!prompt.trim()) {
      setCreationModalOpen(true);
      return;
    }
    const card = await handleSaveInspiration();
    if (card) {
      setSelectedCreationIds((prev) =>
        Array.from(new Set([...prev, `library_${card.id}`])),
      );
    }
    setCreationModalOpen(true);
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
      addEvent("我", `创建了 ${versionLabel(nextVersion)}`);
      setMessages((current) => [
        ...current,
        {
          id: `ai_version_${Date.now()}`,
          role: "ai",
          label: "AI",
          text: formatDemoTaskMessage(task),
          audioUrl: task.audioUrl,
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

    // 生成音频时带上之前的多轮对话：当前输入在前，历史对话在后（后端截断时优先保留最新需求）
    const promptForTask = [currentPrompt, ...messages.map((message) => message.text)]
      .filter((text) => text && text.trim())
      .join("\n");
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
    for (let attempt = 0; attempt < 90; attempt += 1) {
      const delayMs = Math.min(5200, 1200 + attempt * 220);
      await new Promise((resolve) => window.setTimeout(resolve, delayMs));

      try {
        latestTask = await getDemoTask(latestTask.taskId);
        const statusLabel = getTaskStatusLabel(latestTask.status);
        const progressLabel = latestTask.progress === undefined ? "" : ` ${latestTask.progress}%`;

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
        setAnalysisState(`${statusLabel}${progressLabel}`);

        if (latestTask.status === "succeeded" || latestTask.status === "failed") {
          setAnalysisState(statusLabel);
          addEvent("系统", `${latestTask.taskId} ${statusLabel}`);
          setMessages((current) => [
            ...current,
            {
              id: `ai_result_${Date.now()}`,
              role: "ai",
              label: "AI",
              text: formatDemoTaskMessage(latestTask),
              audioUrl: latestTask.audioUrl,
            },
          ]);
          break;
        }
      } catch {
        setAnalysisState("版本状态暂时不可用");
        break;
      }
    }

    if (latestTask.status === "queued" || latestTask.status === "running") {
      setAnalysisState("后台仍在生成，可稍后回到创作历史查看");
      setVersions((current) =>
        current.map((version) =>
          version.id === versionId
            ? {
                ...version,
                note: "后台仍在等待模型返回，稍后可从创作历史继续查看。",
                status: "后台生成中",
                progress: Math.max(version.progress, latestTask.progress ?? 64),
              }
            : version,
        ),
      );
    }
  }

  async function handleListenVersion(targetVersion = activeVersion) {
    if (!targetVersion) {
      setListenState("还没有历史版本");
      return;
    }

    setActiveVersionId(targetVersion.id);

    if (!targetVersion.audioUrl) {
      setPlayingVersionId("");
      setListenState(`${versionLabel(targetVersion)} 暂无音频`);
      return;
    }

    const currentAudio = versionAudioRef.current;
    if (versionAudioIdRef.current === targetVersion.id && currentAudio) {
      if (!currentAudio.paused) {
        currentAudio.pause();
        setPlayingVersionId("");
        setListenState(`${versionLabel(targetVersion)} 已暂停`);
        return;
      }

      try {
        await currentAudio.play();
        setPlayingVersionId(targetVersion.id);
        setListenState(`正在播放 ${versionLabel(targetVersion)}`);
      } catch {
        setListenState("浏览器暂时不能播放该音频");
      }

      return;
    }

    currentAudio?.pause();

    const nextAudio = new Audio(targetVersion.audioUrl);
    versionAudioRef.current = nextAudio;
    versionAudioIdRef.current = targetVersion.id;
    setPlayProgress(0);
    setListenState(`试听 ${versionLabel(targetVersion)}`);

    nextAudio.addEventListener("timeupdate", () => {
      const duration = nextAudio.duration || 0;
      if (duration > 0) {
        setPlayProgress(Math.min(100, (nextAudio.currentTime / duration) * 100));
      }
    });

    nextAudio.addEventListener("ended", () => {
      if (versionAudioIdRef.current === targetVersion.id) {
        setPlayingVersionId("");
        setPlayProgress(0);
        setListenState(`${versionLabel(targetVersion)} 播放完成`);
      }
    });

    nextAudio.addEventListener("error", () => {
      if (versionAudioIdRef.current === targetVersion.id) {
        setPlayingVersionId("");
        setPlayProgress(0);
        setListenState("浏览器暂时不能播放该音频");
      }
    });

    try {
      await nextAudio.play();
      setPlayingVersionId(targetVersion.id);
      setListenState(`正在播放 ${versionLabel(targetVersion)}`);
    } catch {
      setPlayingVersionId("");
      setListenState("浏览器暂时不能播放该音频");
    }
  }

  function handleCreateProject() {
    const id = `project_${Date.now()}`;
    const nextProject: Project = {
      id,
      title: "创作工作台",
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

  function readNickname(): string {
    try {
      return localStorage.getItem("sonic_seed_nickname") || "";
    } catch {
      return "";
    }
  }

  function writeNickname(name: string) {
    try {
      localStorage.setItem("sonic_seed_nickname", name);
    } catch {
      /* ignore */
    }
  }

  function handleShareToCommunity() {
    const projectId = activeProject.id || ensureProject(currentPrompt || "新的创作");
    setShareProjectId(projectId);
    setShareTitle(activeProject.title || "未命名创作");
    setShareName(readNickname());
    setShareDesc(currentPrompt ? summarizePrompt(currentPrompt) : (brief?.summary ?? ""));
    setShareModalOpen(true);
  }

  async function confirmShare() {
    if (!shareProjectId) {
      return;
    }

    const name = shareName.trim() || "我";

    try {
      const post = await publishCommunityPost({
        projectId: shareProjectId,
        authorName: name,
        title: shareTitle.trim() || "我的音乐创作",
        description: shareDesc.trim(),
      });
      writeNickname(name);
      const link = `${window.location.origin}/community/post/${post.id}`;
      await navigator.clipboard.writeText(link).catch(() => undefined);
      setShareModalOpen(false);
      window.alert(`已分享到作品社区，链接已复制：\n${link}`);
    } catch (error) {
      window.alert(`分享失败：${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return (
    <main className="create-shell" aria-label="开始创作">
      <header className="studio-topbar">
        <a className="icon-link" href="/" aria-label="返回首页">
          <ArrowLeft size={19} />
        </a>
        <h1>{activeProject.title}</h1>
        <div className="topbar-actions">
          <button
            className="icon-button"
            onClick={() => setHistoryCollapsed(false)}
            type="button"
            aria-label="查看创作历史"
            title="创作历史"
          >
            <History size={18} />
          </button>
          <a className="icon-button" href="/community" aria-label="作品社区" title="作品社区">
            <UsersRound size={18} />
          </a>
          <button
            className="icon-button primary"
            onClick={handleShareToCommunity}
            type="button"
            aria-label="分享到作品社区"
            title="分享到作品社区"
          >
            <Share2 size={18} />
          </button>
        </div>
      </header>

      <section className="studio-layout" data-history-collapsed={historyCollapsed}>
        <aside className="history-sidebar" data-collapsed={historyCollapsed} aria-label="创作历史记录列表">
          <div className="history-top">
            <div>
              <p>协作空间</p>
              <h2>创作历史</h2>
            </div>
            <button className="tiny-button" onClick={() => setHistoryCollapsed(true)} type="button" aria-label="收起创作历史">
              <PanelLeftClose size={17} />
            </button>
          </div>

          <button className="history-new" onClick={handleCreateProject} type="button">
            <Plus size={16} />
            新建创作
          </button>

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
                <p>点击上方「新建创作」，或发送内容后自动创建。</p>
              </article>
            )}
          </div>
        </aside>

        {!historyCollapsed && (
          <div className="history-overlay" onClick={() => setHistoryCollapsed(true)} aria-hidden="true" />
        )}

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

            <div className="workbench-body">
              <div className="conversation-area">
                <div ref={chatWindowRef} className="chat-window" aria-label="创作对话">
                  {messages.length === 0 ? (
                    <p className="chat-empty">把灵感发给我，我们一起写歌。可以写歌词、描述旋律、贴修改意见，或上传旧 Demo。</p>
                  ) : (
                    messages.map((message) => (
                    <article className={`chat-message ${message.role}${message.pending ? " pending" : ""}`} key={message.id}>
                      <span>
                        {message.role === "ai" ? <Bot size={14} /> : <UsersRound size={14} />}
                        {message.label}
                      </span>
                      {message.pending ? (
                        <p className="thinking-message">
                          <span>思考中</span>
                          <i />
                          <i />
                          <i />
                        </p>
                      ) : (
                        <p>{message.text}</p>
                      )}
                      {message.audioUrl && (
                        <div className="message-audio-result">
                          <span>
                            <Headphones size={13} />
                            试听版本
                          </span>
                          <audio controls src={message.audioUrl} preload="none" />
                        </div>
                      )}
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
                    ))
                  )}
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
                    <label className="attach-button compact" aria-label="添加附件">
                      <Paperclip size={16} />
                      <input accept="audio/*,image/*,video/*,.mp3,.m4a,.wav,.webm,.mp4,.mov" multiple onChange={handleAttachmentChange} type="file" />
                    </label>
                    <div className="composer-actions-right">
                      <button className="utility-button compact" onClick={() => void handleCreateVersion()} type="button">
                        <Headphones size={15} />
                        生成作品
                      </button>
                      <button className="send-button compact" disabled={!canSubmit || chatThinking} onClick={() => void handleSend()} type="button">
                        <Send size={15} />
                        {chatThinking ? "思考中" : "发送"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </section>

          <aside className="analysis-panel" aria-label="实时标签分析">
            <div className="panel-heading compact">
              <p>实时分析</p>
              <span className="status-pill">
                <span className="analysis-dot" />
                {analysisState}
              </span>
            </div>
            <div className="analysis-list">
              {analysisTags.length === 0 ? (
                <p className="analysis-empty">发送内容后，这里会实时生成主题 / 情绪 / 场景 / 适用位置标签。</p>
              ) : (
                analysisTags.map((tag) => (
                  <div className="analysis-item" key={tag.label}>
                    <span>{tag.label}</span>
                    <strong>{tag.value}</strong>
                    <p>{tag.detail}</p>
                  </div>
                ))
              )}
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
                      {editingVersionId === version.id ? (
                        <input
                          className="version-rename-input"
                          value={editingName}
                          onChange={(event) => setEditingName(event.target.value)}
                          onBlur={() => void commitRenameVersion(version)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              void commitRenameVersion(version);
                            } else if (event.key === "Escape") {
                              setEditingVersionId("");
                            }
                          }}
                          autoFocus
                        />
                      ) : (
                        <button
                          type="button"
                          className="version-title-button"
                          onClick={() => startRenameVersion(version)}
                          title="点击重命名版本"
                        >
                          <span>{versionLabel(version)}</span>
                          <Pencil size={13} />
                        </button>
                      )}
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

      {shareModalOpen && (
        <div className="creation-modal-layer" role="dialog" aria-modal="true" aria-label="分享到作品社区">
          <div className="creation-modal share-modal">
            <header className="modal-head">
              <h3>分享到作品社区</h3>
              <button className="icon-button" onClick={() => setShareModalOpen(false)} type="button" aria-label="关闭">
                <X size={18} />
              </button>
            </header>
            <label className="field">
              <span>作品标题</span>
              <input value={shareTitle} onChange={(event) => setShareTitle(event.target.value)} placeholder="给作品起个名字" />
            </label>
            <label className="field">
              <span>简介</span>
              <textarea value={shareDesc} onChange={(event) => setShareDesc(event.target.value)} rows={3} placeholder="聊聊这首作品的灵感" />
            </label>
            <label className="field">
              <span>昵称</span>
              <input value={shareName} onChange={(event) => setShareName(event.target.value)} placeholder="你的昵称" />
            </label>
            <div className="modal-actions">
              <button className="ghost-button" onClick={() => setShareModalOpen(false)} type="button">
                取消
              </button>
              <button className="primary-button" onClick={() => void confirmShare()} type="button">
                发布并复制链接
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bottom-player">
        <button
          className="bottom-player-trigger"
          onClick={() => setPlayerOpen((open) => !open)}
          type="button"
          aria-expanded={playerOpen}
          aria-label="试听 Demo 列表"
        >
          <Music2 size={20} />
          <span>试听 Demo</span>
          {playableVersions.length > 0 && <span className="bottom-player-count">{playableVersions.length}</span>}
        </button>

        {activeVersion && (
          activeVersion.audioUrl ? (
            <div className="bottom-player-now">
              <div className="bottom-player-meta">
                <strong>{versionLabel(activeVersion)}</strong>
                <span>{listenState}</span>
              </div>
              <button
                className="bottom-player-toggle"
                onClick={() => void handleListenVersion(activeVersion)}
                type="button"
                aria-label={playingVersionId ? "暂停播放" : "继续播放"}
              >
                {playingVersionId ? <Pause size={20} /> : <Play size={20} />}
              </button>
            </div>
          ) : isGenerating ? (
            <div className="bottom-player-now generating">
              <div className="bottom-player-meta">
                <strong>{versionLabel(activeVersion)}</strong>
                <span>
                  {activeVersion.status || "生成中"} {Math.round(activeVersion.progress ?? 0)}%
                </span>
              </div>
            </div>
          ) : null
        )}

        {isGenerating && (
          <div className="bottom-player-progress" aria-hidden="true">
            <span style={{ width: `${Math.max(0, Math.min(100, Math.round(activeVersion?.progress ?? 0)))}%` }} />
          </div>
        )}
      </div>

      {playerOpen && (
        <div className="demo-list-panel" role="dialog" aria-label="可播放 Demo 列表">
          <div className="demo-list-head">
            <span>可试听 Demo</span>
            <button className="demo-list-close" onClick={() => setPlayerOpen(false)} type="button" aria-label="关闭">
              <X size={16} />
            </button>
          </div>
          {playableVersions.length ? (
            <ul className="demo-list">
              {playableVersions.map((version) => {
                const isPlaying = playingVersionId === version.id;
                return (
                  <li key={version.id}>
                    <button
                      className="demo-list-item"
                      data-playing={isPlaying}
                      onClick={() => {
                        void handleListenVersion(version);
                        setPlayerOpen(false);
                      }}
                      type="button"
                    >
                      <Music2 size={16} />
                      <span className="demo-list-title">{versionLabel(version)}</span>
                      <span className="demo-list-status">{isPlaying ? "播放中" : version.status}</span>
                      {isPlaying ? <Pause size={15} /> : <Play size={15} />}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="demo-list-empty">还没有可试听的 Demo，去「生成作品」生成吧。</p>
          )}
        </div>
      )}
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

type GraphTagCategoryId = "kind" | "theme" | "emotion" | "scene" | "imagery" | "genre" | "melody" | "position" | "usage";

const graphTagCategories: Array<{ id: GraphTagCategoryId; label: string }> = [
  { id: "kind", label: "灵感类型" },
  { id: "theme", label: "核心主题" },
  { id: "emotion", label: "情绪" },
  { id: "scene", label: "场景" },
  { id: "imagery", label: "核心意象" },
  { id: "genre", label: "曲风" },
  { id: "melody", label: "旋律特征" },
  { id: "position", label: "创作位置" },
  { id: "usage", label: "使用方式" },
];

function splitGraphTags(value?: string) {
  return value
    ? Array.from(new Set(value.split(/[、，,\/]/).map((tag) => tag.trim()).filter(Boolean)))
    : [];
}

function getGraphCategoryTags(item: Inspiration, category: GraphTagCategoryId) {
  if (category === "kind") return [item.kind];
  if (category === "theme") return item.theme ? [item.theme] : [];
  if (category === "emotion") return item.emotion ? [item.emotion] : [];
  if (category === "scene") return item.scene ? [item.scene] : [];
  if (category === "imagery") return splitGraphTags(item.coreImagery);
  if (category === "genre") return item.genre ? [item.genre] : [];
  if (category === "melody") return splitGraphTags(item.melodyFeatures);
  if (category === "position") return splitGraphTags(item.creationPosition);
  return splitGraphTags(item.usage);
}

function createCategoryGraphLinks(items: Inspiration[], category: GraphTagCategoryId): Array<[string, string, string]> {
  const groups = new Map<string, string[]>();
  items.forEach((item) => {
    getGraphCategoryTags(item, category).forEach((tag) => {
      groups.set(tag, [...(groups.get(tag) ?? []), item.id]);
    });
  });

  const pairKeys = new Set<string>();
  const links: Array<[string, string, string]> = [];
  groups.forEach((ids, tag) => {
    ids.slice(1).forEach((target, index) => {
      const source = ids[index];
      const pairKey = [source, target].sort().join("::");
      if (pairKeys.has(pairKey)) return;
      pairKeys.add(pairKey);
      links.push([source, target, tag]);
    });
  });
  return links;
}

function graphSeed(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function createCategoryGraphPositions(
  items: Inspiration[],
  category: GraphTagCategoryId,
  links: Array<[string, string, string]>,
  activeTag: string,
) {
  const positions: Record<string, { x: number; y: number }> = {};
  if (items.length === 0) return positions;

  const itemTags = new Map(
    items.map((item) => [item.id, activeTag || getGraphCategoryTags(item, category)[0] || "未分类"]),
  );
  const groupTags = Array.from(new Set(itemTags.values())).sort((left, right) => left.localeCompare(right, "zh-CN"));
  const categoryAngle = graphSeed(category) * Math.PI * 2;
  const clusterCenters = new Map<string, { x: number; y: number }>();

  groupTags.forEach((tag, index) => {
    if (groupTags.length === 1) {
      clusterCenters.set(tag, { x: 50, y: 49 });
      return;
    }
    const angle = categoryAngle + (index / groupTags.length) * Math.PI * 2;
    const radiusX = groupTags.length <= 4 ? 27 : 36;
    const radiusY = groupTags.length <= 4 ? 22 : 29;
    clusterCenters.set(tag, {
      x: 50 + Math.cos(angle) * radiusX,
      y: 49 + Math.sin(angle) * radiusY,
    });
  });

  groupTags.forEach((tag) => {
    const groupItems = items
      .filter((item) => itemTags.get(item.id) === tag)
      .sort((left, right) => graphSeed(`${category}:${left.id}`) - graphSeed(`${category}:${right.id}`));
    const center = clusterCenters.get(tag) ?? { x: 50, y: 49 };
    groupItems.forEach((item, index) => {
      const angle = categoryAngle + graphSeed(`${category}:${tag}`) * Math.PI * 2 + (index / Math.max(1, groupItems.length)) * Math.PI * 2;
      const localRadius = groupItems.length === 1 ? 0 : 7 + Math.min(groupItems.length, 6) * 0.8;
      positions[item.id] = {
        x: center.x + Math.cos(angle) * localRadius,
        y: center.y + Math.sin(angle) * localRadius * 0.78,
      };
    });
  });

  const velocities = new Map(items.map((item) => [item.id, { x: 0, y: 0 }]));
  for (let iteration = 0; iteration < 90; iteration += 1) {
    const cooling = 1 - iteration / 90;
    const forces = new Map(items.map((item) => [item.id, { x: 0, y: 0 }]));

    items.forEach((item) => {
      const position = positions[item.id];
      const center = clusterCenters.get(itemTags.get(item.id) ?? "") ?? { x: 50, y: 49 };
      const force = forces.get(item.id)!;
      force.x += (center.x - position.x) * 0.018;
      force.y += (center.y - position.y) * 0.018;
    });

    for (let leftIndex = 0; leftIndex < items.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < items.length; rightIndex += 1) {
        const left = items[leftIndex];
        const right = items[rightIndex];
        const dx = positions[right.id].x - positions[left.id].x;
        const dy = positions[right.id].y - positions[left.id].y;
        const distance = Math.max(0.5, Math.hypot(dx, dy));
        const minimumDistance = 15;
        if (distance >= minimumDistance) continue;
        const push = (minimumDistance - distance) * 0.075;
        const pushX = (dx / distance) * push;
        const pushY = (dy / distance) * push;
        forces.get(left.id)!.x -= pushX;
        forces.get(left.id)!.y -= pushY;
        forces.get(right.id)!.x += pushX;
        forces.get(right.id)!.y += pushY;
      }
    }

    links.forEach(([source, target]) => {
      const dx = positions[target].x - positions[source].x;
      const dy = positions[target].y - positions[source].y;
      const distance = Math.max(0.5, Math.hypot(dx, dy));
      const spring = (distance - 19) * 0.025;
      const springX = (dx / distance) * spring;
      const springY = (dy / distance) * spring;
      forces.get(source)!.x += springX;
      forces.get(source)!.y += springY;
      forces.get(target)!.x -= springX;
      forces.get(target)!.y -= springY;
    });

    items.forEach((item) => {
      const force = forces.get(item.id)!;
      const velocity = velocities.get(item.id)!;
      velocity.x = (velocity.x + force.x) * 0.72;
      velocity.y = (velocity.y + force.y) * 0.72;
      positions[item.id].x = Math.min(87, Math.max(13, positions[item.id].x + velocity.x * cooling));
      positions[item.id].y = Math.min(84, Math.max(14, positions[item.id].y + velocity.y * cooling));
    });
  }

  for (let pass = 0; pass < 60; pass += 1) {
    for (let leftIndex = 0; leftIndex < items.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < items.length; rightIndex += 1) {
        const left = items[leftIndex];
        const right = items[rightIndex];
        const dx = positions[right.id].x - positions[left.id].x;
        const dy = positions[right.id].y - positions[left.id].y;
        const pixelDx = dx * 3.2;
        const pixelDy = dy * 6;
        const leftSize = 42 + Math.min(left.relations, 5) * 3;
        const rightSize = 42 + Math.min(right.relations, 5) * 3;
        const leftDesktopSize = 52 + Math.min(left.relations, 5) * 4;
        const rightDesktopSize = 52 + Math.min(right.relations, 5) * 4;
        const overlapX = (Math.max(leftSize, 72) + Math.max(rightSize, 72)) / 2 + 8 - Math.abs(pixelDx);
        const overlapY = (leftDesktopSize + rightDesktopSize) / 2 + 35 - Math.abs(pixelDy);
        if (overlapX <= 0 || overlapY <= 0) continue;

        if (overlapX / 3.2 <= overlapY / 6) {
          const direction = Math.abs(pixelDx) > 0.1 ? Math.sign(pixelDx) : (graphSeed(`${category}:${left.id}:${right.id}`) > 0.5 ? 1 : -1);
          const offsetX = (overlapX / 2 / 3.2) * direction;
          positions[left.id].x = Math.min(87, Math.max(13, positions[left.id].x - offsetX));
          positions[right.id].x = Math.min(87, Math.max(13, positions[right.id].x + offsetX));
        } else {
          const direction = Math.abs(pixelDy) > 0.1 ? Math.sign(pixelDy) : (graphSeed(`${category}:${right.id}:${left.id}`) > 0.5 ? 1 : -1);
          const offsetY = (overlapY / 2 / 6) * direction;
          positions[left.id].y = Math.min(84, Math.max(14, positions[left.id].y - offsetY));
          positions[right.id].y = Math.min(84, Math.max(14, positions[right.id].y + offsetY));
        }
      }
    }
  }

  return positions;
}

function createGraphEdgePath(
  start: { x: number; y: number },
  end: { x: number; y: number },
  sourceRelations: number,
  targetRelations: number,
  index: number,
) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const unitX = dx / distance;
  const unitY = dy / distance;
  const sourcePadding = 3.1 + Math.min(sourceRelations, 5) * 0.22;
  const targetPadding = 3.1 + Math.min(targetRelations, 5) * 0.22;
  const x1 = start.x + unitX * sourcePadding;
  const y1 = start.y + unitY * sourcePadding;
  const x2 = end.x - unitX * targetPadding;
  const y2 = end.y - unitY * targetPadding;
  const curveDirection = index % 2 === 0 ? 1 : -1;
  const curve = Math.min(3.6, distance * 0.08) * curveDirection;
  const controlX = (x1 + x2) / 2 - unitY * curve;
  const controlY = (y1 + y2) / 2 + unitX * curve;

  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} Q ${controlX.toFixed(2)} ${controlY.toFixed(2)} ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

const graphTagColors = [
  "#00f285",
  "#52d9ff",
  "#ffd166",
  "#ff78ad",
  "#b596ff",
  "#ff9b62",
  "#45e0c1",
  "#ff6b6b",
  "#b8f45f",
  "#6fa8ff",
];

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

  if (inspiration.duration || inspiration.mediaLabel) {
    const audioLabel = inspiration.duration ?? inspiration.mediaLabel ?? "音频素材";
    return (
      <div className="inspiration-preview audio-preview" aria-label={`音频素材 ${audioLabel}`}>
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
        <small>{audioLabel}</small>
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
  const [libraryInspirations, setLibraryInspirations] = useState<Inspiration[]>(initialLibraryInspirations);
  const [syncState, setSyncState] = useState(hasApiConnection() ? "正在同步 SQLite" : "离线内容");
  const [view, setView] = useState<LibraryView>("navigation");
  const [layout, setLayout] = useState<LibraryLayout>("grid");
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [focusedGraphId, setFocusedGraphId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [relationMode, setRelationMode] = useState<GraphTagCategoryId>("kind");
  const [graphTagFilter, setGraphTagFilter] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [graphZoom, setGraphZoom] = useState(1);
  const [newInspirationOpen, setNewInspirationOpen] = useState(false);
  const [newInspirationTitle, setNewInspirationTitle] = useState("");
  const [newInspirationContent, setNewInspirationContent] = useState("");
  const [newInspirationAttachments, setNewInspirationAttachments] = useState<LibraryDraftAttachment[]>([]);
  const [newInspirationSaving, setNewInspirationSaving] = useState(false);
  const [newInspirationError, setNewInspirationError] = useState("");
  const newInspirationAttachmentsRef = useRef<LibraryDraftAttachment[]>([]);

  useEffect(() => {
    if (!hasApiConnection()) return;

    let cancelled = false;
    void Promise.all([listInspirations(), listProjects()])
      .then(([records, projectRecords]) => {
        if (cancelled) return;
        const projectTitles = new Map(projectRecords.map((project) => [project.id, project.title]));
        const mappedRecords = addRelationCounts(records.map((record) => mapInspirationRecord(record, projectTitles)));
        writeCachedRecords(LIBRARY_CACHE_KEY, records);
        writeCachedRecords(PROJECT_CACHE_KEY, projectRecords);
        setLibraryInspirations(mappedRecords);
        setSelectedIds((current) => current.filter((id) => mappedRecords.some((item) => item.id === id)));
        setSyncState("SQLite 已同步");
      })
      .catch(() => {
        setSyncState("同步失败，展示离线内容");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    newInspirationAttachmentsRef.current = newInspirationAttachments;
  }, [newInspirationAttachments]);

  useEffect(() => {
    return () => {
      newInspirationAttachmentsRef.current.forEach((attachment) => URL.revokeObjectURL(attachment.previewUrl));
    };
  }, []);

  useEffect(() => {
    if (!newInspirationOpen) return undefined;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !newInspirationSaving) {
        closeNewInspirationModal();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [newInspirationAttachments, newInspirationOpen, newInspirationSaving]);

  const activeFilterGroups = useMemo(
    () =>
      filterGroups.map((group) => {
        const dynamicValues = libraryInspirations
          .map((item) => {
            if (group.id === "theme") return item.theme;
            if (group.id === "emotion") return item.emotion;
            if (group.id === "scene") return item.scene;
            if (group.id === "genre") return item.genre;
            if (group.id === "status") return item.status;
            return undefined;
          })
          .filter((value): value is string => Boolean(value));
        return {
          ...group,
          options: Array.from(new Set([group.options[0], ...group.options.slice(1), ...dynamicValues])),
        };
      }),
    [libraryInspirations],
  );

  const filteredInspirations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return libraryInspirations.filter((item) => {
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
  }, [filters, libraryInspirations, query]);

  const activeGraphTags = useMemo(
    () => Array.from(new Set(filteredInspirations.flatMap((item) => getGraphCategoryTags(item, relationMode)))).sort((left, right) => left.localeCompare(right, "zh-CN")),
    [filteredInspirations, relationMode],
  );
  const activeGraphTagColorMap = new Map(
    activeGraphTags.map((tag, index) => [tag, graphTagColors[index % graphTagColors.length]]),
  );
  const visibleGraphItems = useMemo(
    () => graphTagFilter
      ? filteredInspirations.filter((item) => getGraphCategoryTags(item, relationMode).includes(graphTagFilter))
      : filteredInspirations,
    [filteredInspirations, graphTagFilter, relationMode],
  );
  const activeCategoryGraphLinks = useMemo(
    () => createCategoryGraphLinks(visibleGraphItems, relationMode),
    [relationMode, visibleGraphItems],
  );
  const activeGraphPositions = useMemo(
    () => createCategoryGraphPositions(visibleGraphItems, relationMode, activeCategoryGraphLinks, graphTagFilter),
    [activeCategoryGraphLinks, graphTagFilter, relationMode, visibleGraphItems],
  );
  const selectedInspirations = libraryInspirations.filter((item) => selectedIds.includes(item.id));
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
    setRelationMode("theme");
    setGraphTagFilter("");
    setActionMessage("已在图谱中聚焦所选灵感及其关系");
  }

  function focusInGraph(id: string) {
    setFocusedGraphId(id);
    setView("graph");
    window.setTimeout(() => {
      document.querySelector(`[data-node-id="${id}"]`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 0);
  }

  function updateGraphZoom(nextZoom: number) {
    setGraphZoom(Math.min(1.3, Math.max(0.7, Number(nextZoom.toFixed(2)))));
  }

  function resetNewInspirationDraft() {
    newInspirationAttachmentsRef.current.forEach((attachment) => URL.revokeObjectURL(attachment.previewUrl));
    newInspirationAttachmentsRef.current = [];
    setNewInspirationTitle("");
    setNewInspirationContent("");
    setNewInspirationAttachments([]);
    setNewInspirationError("");
  }

  function closeNewInspirationModal() {
    if (newInspirationSaving) {
      return;
    }

    resetNewInspirationDraft();
    setNewInspirationOpen(false);
  }

  function handleNewInspirationBackdropClick(event: ReactMouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      closeNewInspirationModal();
    }
  }

  function handleNewInspirationFiles(event: ChangeEvent<HTMLInputElement>, type: LibraryDraftAttachment["type"]) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (!files.length) {
      return;
    }

    const supportedFiles = files.filter((file) => file.type.startsWith(`${type}/`));
    if (supportedFiles.length !== files.length) {
      setNewInspirationError(type === "audio" ? "请添加音频文件。" : "请添加图片文件。");
    } else {
      setNewInspirationError("");
    }

    const nextAttachments = supportedFiles.map((file, index) => ({
      id: `library_draft_${Date.now()}_${index}_${file.name}`,
      file,
      type,
      previewUrl: URL.createObjectURL(file),
      status: "ready" as const,
    }));

    if (nextAttachments.length) {
      setNewInspirationAttachments((current) => [...current, ...nextAttachments]);
    }
  }

  function removeNewInspirationAttachment(id: string) {
    setNewInspirationAttachments((current) => {
      const removed = current.find((attachment) => attachment.id === id);
      if (removed) {
        URL.revokeObjectURL(removed.previewUrl);
      }

      return current.filter((attachment) => attachment.id !== id);
    });
  }

  async function handleSaveNewInspiration() {
    const title = newInspirationTitle.trim();
    const content = newInspirationContent.trim();

    if (!content && !newInspirationAttachments.length) {
      setNewInspirationError("请先添加文字内容、音频或图片。");
      return;
    }

    setNewInspirationSaving(true);
    setNewInspirationError("");

    const uploadedAttachments: BriefAttachment[] = [];

    try {
      for (const attachment of newInspirationAttachments) {
        setNewInspirationAttachments((current) =>
          current.map((item) => (item.id === attachment.id ? { ...item, status: "uploading" } : item)),
        );

        try {
          const result = await uploadAttachment(attachment.file);
          uploadedAttachments.push({
            type: attachment.type,
            name: result.filename || attachment.file.name,
            uploadId: result.uploadId,
          });
          setNewInspirationAttachments((current) =>
            current.map((item) =>
              item.id === attachment.id
                ? {
                    ...item,
                    uploadId: result.uploadId,
                    status: "uploaded",
                  }
                : item,
            ),
          );
        } catch {
          setNewInspirationAttachments((current) =>
            current.map((item) => (item.id === attachment.id ? { ...item, status: "error" } : item)),
          );
          throw new Error("upload-failed");
        }
      }

      const attachmentTitle = uploadedAttachments[0]
        ? `${uploadedAttachments[0].type === "audio" ? "音频" : "图片"}灵感：${uploadedAttachments[0].name.replace(/\.[^/.]+$/, "")}`
        : "";
      const finalTitle = (title || summarizePrompt(content || attachmentTitle || "新的灵感")).slice(0, 120);
      let tags: AnalysisTag[] = [];

      try {
        const brief = await analyzeInspiration({
          projectId: "inbox",
          mode: inferMode(uploadedAttachments),
          content: content || finalTitle,
          attachments: toBriefAttachments(uploadedAttachments),
        });
        tags = brief.tags;
      } catch {
        tags = [];
      }

      const card = await saveInspiration({
        projectId: "inbox",
        title: finalTitle,
        content,
        attachments: toBriefAttachments(uploadedAttachments),
        tags,
      });
      const cachedRecords = readCachedRecords<InspirationRecord>(LIBRARY_CACHE_KEY);
      writeCachedRecords(LIBRARY_CACHE_KEY, [card, ...cachedRecords.filter((record) => record.id !== card.id)]);

      const cachedProjects = readCachedRecords<ProjectRecord>(PROJECT_CACHE_KEY);
      const projectTitles = new Map(cachedProjects.map((project) => [project.id, project.title]));
      const mappedCard = mapInspirationRecord(card, projectTitles);
      setLibraryInspirations((current) => addRelationCounts([mappedCard, ...current.filter((item) => item.id !== mappedCard.id)]));
      setSyncState(hasApiConnection() ? "已保存到 SQLite" : "已保存到本地");
      setActionMessage(`已新增灵感「${finalTitle}」`);
      resetNewInspirationDraft();
      setNewInspirationOpen(false);
    } catch {
      setNewInspirationError("保存失败，请检查附件格式或稍后重试。");
    } finally {
      setNewInspirationSaving(false);
    }
  }

  const canSaveNewInspiration = Boolean(newInspirationContent.trim() || newInspirationAttachments.length);

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

      <div className="library-command-row">
        <button className="library-add-inspiration" onClick={() => setNewInspirationOpen(true)} type="button">
          <Plus size={24} />
          <strong>新增灵感</strong>
        </button>

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
          {activeFilterGroups.map((group) => (
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
      </div>

      {newInspirationOpen && (
        <div className="library-inspiration-modal-layer" onClick={handleNewInspirationBackdropClick}>
          <section
            aria-labelledby="library-new-inspiration-title"
            aria-modal="true"
            className="library-inspiration-modal"
            role="dialog"
          >
            <header className="library-inspiration-modal-head">
              <div>
                <span>灵感库</span>
                <h2 id="library-new-inspiration-title">新增灵感</h2>
              </div>
              <button aria-label="关闭新增灵感弹窗" disabled={newInspirationSaving} onClick={closeNewInspirationModal} type="button">
                <X size={18} />
              </button>
            </header>

            <div className="library-inspiration-modal-body">
              <label className="library-inspiration-field">
                <span>标题</span>
                <input
                  maxLength={80}
                  onChange={(event) => setNewInspirationTitle(event.target.value)}
                  placeholder="未填写时自动生成"
                  type="text"
                  value={newInspirationTitle}
                />
              </label>

              <label className="library-inspiration-field">
                <span>文字内容</span>
                <textarea
                  maxLength={4000}
                  onChange={(event) => setNewInspirationContent(event.target.value)}
                  placeholder="写下一句歌词、一个画面或一段想法"
                  rows={6}
                  value={newInspirationContent}
                />
              </label>

              <div className="library-inspiration-upload-row" aria-label="添加附件">
                <label className="library-inspiration-upload">
                  <FileAudio size={20} />
                  <span>添加音频</span>
                  <input accept="audio/*" multiple onChange={(event) => handleNewInspirationFiles(event, "audio")} type="file" />
                </label>
                <label className="library-inspiration-upload">
                  <ImageIcon size={20} />
                  <span>添加图片</span>
                  <input accept="image/*" multiple onChange={(event) => handleNewInspirationFiles(event, "image")} type="file" />
                </label>
              </div>

              {newInspirationAttachments.length > 0 && (
                <div className="library-draft-attachments" aria-label="待保存附件">
                  {newInspirationAttachments.map((attachment) => {
                    const Icon = attachment.type === "audio" ? FileAudio : ImageIcon;
                    const statusLabel =
                      attachment.status === "uploading"
                        ? "上传中"
                        : attachment.status === "uploaded"
                          ? "已上传"
                          : attachment.status === "error"
                            ? "上传失败"
                            : "待上传";
                    return (
                      <article className="library-draft-attachment" data-type={attachment.type} key={attachment.id}>
                        <div className="library-draft-attachment-info">
                          <Icon size={18} />
                          <div>
                            <strong>{attachment.file.name}</strong>
                            <span>{formatBytes(attachment.file.size)} · {statusLabel}</span>
                          </div>
                        </div>
                        {attachment.type === "audio" ? (
                          <audio controls src={attachment.previewUrl} />
                        ) : (
                          <img alt={attachment.file.name} src={attachment.previewUrl} />
                        )}
                        <button
                          aria-label={`移除${attachment.file.name}`}
                          disabled={newInspirationSaving}
                          onClick={() => removeNewInspirationAttachment(attachment.id)}
                          type="button"
                        >
                          <X size={15} />
                        </button>
                      </article>
                    );
                  })}
                </div>
              )}

              {newInspirationError && <p className="library-inspiration-error">{newInspirationError}</p>}
            </div>

            <footer className="library-inspiration-modal-actions">
              <button className="library-inspiration-cancel" disabled={newInspirationSaving} onClick={closeNewInspirationModal} type="button">
                取消
              </button>
              <button
                className="library-inspiration-save"
                disabled={newInspirationSaving || !canSaveNewInspiration}
                onClick={handleSaveNewInspiration}
                type="button"
              >
                {newInspirationSaving ? <Loader2 className="spin" size={17} /> : <Check size={17} />}
                保存到灵感库
              </button>
            </footer>
          </section>
        </div>
      )}

      <section className="library-summary">
        <div>
          <strong>{filteredInspirations.length}</strong>
          <span>条灵感</span>
          <span className="summary-divider" />
          <span>{libraryInspirations.reduce((total, item) => total + item.relations, 0)} 条关系</span>
          <span className="library-sync-state">{syncState}</span>
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
              <strong>{libraryInspirations.length ? "没有匹配的灵感" : "灵感库暂无内容"}</strong>
              <span>{libraryInspirations.length ? "调整搜索词或清除部分筛选条件" : "从创作工作台保存第一条灵感"}</span>
            </div>
          )}
        </section>
      ) : (
        <section className="graph-panel" aria-label="灵感图谱视图">
          <div className="graph-toolbar">
            <div>
              {graphTagCategories.map((category) => (
                <button
                  data-active={relationMode === category.id}
                  key={category.id}
                  onClick={() => {
                    setRelationMode(category.id);
                    setGraphTagFilter("");
                    setGraphZoom(1);
                  }}
                  type="button"
                >
                  {category.label}
                </button>
              ))}
            </div>
            <span><SlidersHorizontal size={15} /> 节点颜色表示具体标签</span>
          </div>

          <div className="graph-tag-strip" aria-label="具体标签">
            <button data-active={!graphTagFilter} onClick={() => setGraphTagFilter("")} type="button">全部</button>
            {activeGraphTags.map((tag) => (
              <button
                data-active={graphTagFilter === tag}
                key={tag}
                onClick={() => setGraphTagFilter((current) => current === tag ? "" : tag)}
                style={{ "--tag-color": activeGraphTagColorMap.get(tag) } as CSSProperties}
                type="button"
              >
                <i aria-hidden="true" />{tag}
              </button>
            ))}
          </div>

          <div className="graph-canvas">
            <div className="graph-viewport" style={{ transform: `scale(${graphZoom})` }}>
            <svg aria-hidden="true" className="graph-links" preserveAspectRatio="none" viewBox="0 0 100 100">
              {activeCategoryGraphLinks.map(([source, target, tag], index) => {
                const sourceItem = libraryInspirations.find((item) => item.id === source);
                const targetItem = libraryInspirations.find((item) => item.id === target);
                const start = activeGraphPositions[source];
                const end = activeGraphPositions[target];
                const isEmphasized =
                  selectedIds.includes(source) ||
                  selectedIds.includes(target) ||
                  focusedGraphId === source ||
                  focusedGraphId === target;
                return (
                  <g key={`${source}-${target}-${tag}`}>
                  <title>{`${tag} · 同标签关联`}</title>
                  <path
                    className={isEmphasized ? "emphasized" : "confirmed"}
                    d={createGraphEdgePath(start, end, sourceItem?.relations ?? 0, targetItem?.relations ?? 0, index)}
                  />
                  </g>
                );
              })}
            </svg>

            {visibleGraphItems.map((item) => {
              const Icon = item.icon;
              const position = activeGraphPositions[item.id];
              const nodeSize = 52 + Math.min(item.relations, 5) * 4;
              const mobileNodeSize = 42 + Math.min(item.relations, 5) * 3;
              const nodeTag = graphTagFilter || getGraphCategoryTags(item, relationMode)[0] || "未分类";
              const nodeColor = activeGraphTagColorMap.get(nodeTag) ?? "#8c9691";
              return (
                <button
                  aria-label={`${item.title}，${nodeTag}`}
                  aria-current={focusedGraphId === item.id ? "true" : undefined}
                  aria-pressed={selectedIds.includes(item.id)}
                  className="graph-node"
                  data-focused={focusedGraphId === item.id}
                  data-node-id={item.id}
                  data-selected={selectedIds.includes(item.id)}
                  key={item.id}
                  onClick={() => toggleSelection(item.id)}
                  style={{
                    "--graph-node-size": `${nodeSize}px`,
                    "--graph-node-mobile-size": `${mobileNodeSize}px`,
                    "--node-color": nodeColor,
                    left: `${position.x}%`,
                    top: `${position.y}%`,
                  } as CSSProperties}
                  type="button"
                >
                  <Icon size={19} />
                  <span className="graph-node-label"><b>{nodeTag}</b><em>{item.title}</em></span>
                </button>
              );
            })}
            </div>

            <div className="graph-zoom-controls" aria-label="图谱缩放">
              <button
                aria-label="缩小图谱"
                disabled={graphZoom <= 0.7}
                onClick={() => updateGraphZoom(graphZoom - 0.15)}
                title="缩小图谱"
                type="button"
              ><ZoomOut size={17} /></button>
              <button
                aria-label={`重置图谱缩放，当前 ${Math.round(graphZoom * 100)}%`}
                className="graph-zoom-reset"
                onClick={() => updateGraphZoom(1)}
                title="重置图谱缩放"
                type="button"
              ><RotateCcw size={15} /><span>{Math.round(graphZoom * 100)}%</span></button>
              <button
                aria-label="放大图谱"
                disabled={graphZoom >= 1.3}
                onClick={() => updateGraphZoom(graphZoom + 0.15)}
                title="放大图谱"
                type="button"
              ><ZoomIn size={17} /></button>
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

const TAB_ITEMS = [
  { key: "home", label: "首页", icon: Home, href: "/" },
  { key: "create", label: "创作", icon: Music2, href: "/create" },
  { key: "library", label: "灵感库", icon: Library, href: "/library" },
];

function TabBar() {
  const pathname = window.location.pathname;
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <nav className="tab-bar" aria-label="主导航">
      {TAB_ITEMS.map((item) => {
        const active = isActive(item.href);
        const Icon = item.icon;
        return (
          <a
            key={item.key}
            className="tab-item"
            data-active={active}
            href={item.href}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={22} />
            <span className="tab-label">{item.label}</span>
          </a>
        );
      })}
    </nav>
  );
}

function CommunityFeed() {
  const [posts, setPosts] = useState<CommunityPostSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listCommunityPosts()
      .then((data) => {
        if (!cancelled) setPosts(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="community-shell" aria-label="作品社区">
      <header className="community-topbar">
        <h1>作品社区</h1>
        <a className="icon-link" href="/create" aria-label="去创作">
          <ArrowLeft size={19} />
        </a>
      </header>

      <div className="community-feed">
        {loading && <p className="community-hint">加载中…</p>}
        {error && <p className="community-hint">{error}</p>}
        {!loading && !error && posts.length === 0 && (
          <article className="empty-state">
            <Music2 size={20} />
            <strong>还没有分享的作品</strong>
            <p>在创作页点击「分享」即可把作品发布到这里。</p>
          </article>
        )}
        {posts.map((post) => (
          <a className="community-card" key={post.id} href={`/community/post/${post.id}`}>
            <div className="community-card-head">
              <span className="community-avatar">
                <UsersRound size={16} />
              </span>
              <div>
                <strong>{post.authorName}</strong>
                <span>{post.createdAt}</span>
              </div>
            </div>
            <h2>{post.title}</h2>
            {post.description && <p className="community-desc">{post.description}</p>}
            <div className="community-card-meta">
              <span>
                <Music2 size={14} /> {post.demoVersionCount} 个版本
              </span>
              <span>
                <Heart size={14} /> {post.likeCount}
              </span>
              <span>
                <MessageCircle size={14} /> {post.commentCount}
              </span>
            </div>
          </a>
        ))}
      </div>
    </main>
  );
}

function DemoVersionPlayer({ version }: { version: CommunityDemoVersion }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio || !version.audioUrl) {
      return;
    }

    if (audio.paused) {
      void audio.play();
    } else {
      audio.pause();
    }
  };

  return (
    <div className="demo-version">
      <button className="demo-play" onClick={toggle} type="button" disabled={!version.audioUrl} aria-label={playing ? "暂停" : "播放"}>
        {playing ? <Pause size={18} /> : <Play size={18} />}
      </button>
      <div className="demo-meta">
        <strong>{version.title}</strong>
        {version.lyrics && <p className="demo-lyrics">{version.lyrics}</p>}
      </div>
      <audio
        ref={audioRef}
        src={version.audioUrl ?? undefined}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(event) => {
          const el = event.currentTarget;
          if (el.duration) {
            setProgress((el.currentTime / el.duration) * 100);
          }
        }}
        onEnded={() => {
          setPlaying(false);
          setProgress(0);
        }}
      />
      {version.audioUrl && (
        <span className="demo-progress" aria-hidden="true">
          <span style={{ width: `${progress}%` }} />
        </span>
      )}
    </div>
  );
}

function CommunityPostView({ postId }: { postId: string }) {
  const [post, setPost] = useState<CommunityPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [commentName, setCommentName] = useState("");
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const refresh = () => {
    setLoading(true);
    getCommunityPost(postId)
      .then((data) => setPost(data))
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
  }, [postId]);

  const handleLike = () => {
    if (!post) {
      return;
    }

    toggleCommunityLike(post.id)
      .then((response) =>
        setPost((current) => (current ? { ...current, likeCount: response.likeCount, likedByMe: response.likedByMe } : current)),
      )
      .catch(() => undefined);
  };

  const handleComment = () => {
    if (!post || !commentText.trim()) {
      return;
    }

    setSubmitting(true);
    addCommunityComment(post.id, { authorName: commentName.trim() || "匿名", content: commentText.trim() })
      .then((comment) => {
        setPost((current) =>
          current ? { ...current, comments: [...current.comments, comment], commentCount: current.commentCount + 1 } : current,
        );
        setCommentText("");
      })
      .catch((err) => window.alert(`评论失败：${err instanceof Error ? err.message : String(err)}`))
      .finally(() => setSubmitting(false));
  };

  if (loading) {
    return (
      <main className="community-shell">
        <p className="community-hint">加载中…</p>
      </main>
    );
  }

  if (error || !post) {
    return (
      <main className="community-shell">
        <p className="community-hint">{error || "作品不存在"}</p>
      </main>
    );
  }

  return (
    <main className="community-shell" aria-label="作品详情">
      <header className="community-topbar">
        <a className="icon-link" href="/community" aria-label="返回社区">
          <ArrowLeft size={19} />
        </a>
        <h1>作品详情</h1>
      </header>

      <article className="post-detail">
        <div className="post-author">
          <span className="community-avatar">
            <UsersRound size={16} />
          </span>
          <div>
            <strong>{post.authorName}</strong>
            <span>{post.createdAt}</span>
          </div>
        </div>
        <h2 className="post-title">{post.title}</h2>
        {post.description && <p className="community-desc">{post.description}</p>}

        <button className={`like-button${post.likedByMe ? " active" : ""}`} onClick={handleLike} type="button">
          <Heart size={16} /> {post.likeCount} 赞
        </button>

        <section className="post-versions" aria-label="作品版本">
          <h3>创作版本（{post.demoVersions.length}）</h3>
          {post.demoVersions.length === 0 ? (
            <p className="community-hint">作者还没有生成可试听的版本。</p>
          ) : (
            post.demoVersions.map((version) => <DemoVersionPlayer key={version.taskId} version={version} />)
          )}
        </section>

        <section className="post-comments" aria-label="评论区">
          <h3>评论（{post.commentCount}）</h3>
          <div className="comment-composer">
            <input value={commentName} onChange={(event) => setCommentName(event.target.value)} placeholder="昵称（可选）" />
            <textarea value={commentText} onChange={(event) => setCommentText(event.target.value)} rows={2} placeholder="说点什么…" />
            <button className="primary-button" disabled={submitting || !commentText.trim()} onClick={handleComment} type="button">
              发送
            </button>
          </div>
          <div className="comment-list">
            {post.comments.length === 0 ? (
              <p className="community-hint">还没有评论，来抢沙发。</p>
            ) : (
              post.comments.map((comment) => (
                <article className="comment-item" key={comment.id}>
                  <strong>{comment.authorName}</strong>
                  <span>{comment.createdAt}</span>
                  <p>{comment.content}</p>
                </article>
              ))
            )}
          </div>
        </section>
      </article>
    </main>
  );
}

function CommunityPage() {
  const pathname = window.location.pathname;
  const postMatch = pathname.match(/^\/community\/post\/(.+)$/);

  if (postMatch) {
    return <CommunityPostView postId={decodeURIComponent(postMatch[1])} />;
  }

  return <CommunityFeed />;
}

export default function App() {
  const pathname = window.location.pathname;

  return (
    <>
      {pathname.startsWith("/create") ? (
        <CreatePage />
      ) : pathname.startsWith("/community") ? (
        <CommunityPage />
      ) : pathname.startsWith("/library") ? (
        <LibraryPage />
      ) : (
        <HomePage />
      )}
    </>
  );
}
