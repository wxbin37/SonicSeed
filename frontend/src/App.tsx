import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  Bot,
  Check,
  ChevronDown,
  Copy,
  Ellipsis,
  FileAudio,
  FolderPlus,
  Heart,
  Headphones,
  Image as ImageIcon,
  Library,
  LayoutGrid,
  Link2,
  List,
  ListMusic,
  MessageCircle,
  Music2,
  Network,
  Radio,
  Search,
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
  Sparkles,
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
  type InspirationRecord,
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
  const shareToken = useMemo(getShareToken, []);
  const [projects, setProjects] = useState<Project[]>(() => (hasApiConnection() ? [] : readStorage<Project[]>(STORAGE_KEYS.projects, [])));
  const [activeProjectId, setActiveProjectId] = useState<string>(() =>
    getSharedProjectId() || (hasApiConnection() ? "" : (readStorage<Project[]>(STORAGE_KEYS.projects, [])[0]?.id ?? "")),
  );
  const [historyCollapsed, setHistoryCollapsed] = useState(false);
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
        setSelectedInspirations(remoteCards.filter((card) => selectedInspirationIds.includes(card.id)));
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
  }, [selectedInspirationIds]);

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

function createGraphLinks(items: Inspiration[]): Array<[string, string]> {
  const itemIds = new Set(items.map((item) => item.id));
  const linkKeys = new Set<string>();
  const links: Array<[string, string]> = [];

  function addLink(source: string, target: string) {
    if (!itemIds.has(source) || !itemIds.has(target) || source === target) return;
    const key = [source, target].sort().join("::");
    if (linkKeys.has(key)) return;
    linkKeys.add(key);
    links.push([source, target]);
  }

  graphLinks.forEach(([source, target]) => addLink(source, target));
  items.forEach((source) => {
    items
      .filter((target) => target.id !== source.id)
      .map((target) => ({ target, score: relationScore(source, target) }))
      .filter(({ score }) => score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, 3)
      .forEach(({ target }) => addLink(source.id, target.id));
  });

  return links;
}

function createGraphPositions(items: Inspiration[]) {
  const usesPresetLayout = items.every((item) => Boolean(graphPositions[item.id]));
  if (usesPresetLayout) return graphPositions;

  return items.reduce<Record<string, { x: number; y: number }>>((positions, item, index) => {
    if (index === 0) {
      positions[item.id] = { x: 50, y: 48 };
      return positions;
    }

    const angle = index * 2.399963;
    const radius = Math.min(43, 14 + Math.sqrt(index) * 8.5);
    positions[item.id] = {
      x: 50 + Math.cos(angle) * radius,
      y: 48 + Math.sin(angle) * radius * 0.72,
    };
    return positions;
  }, {});
}

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
  const [libraryInspirations, setLibraryInspirations] = useState<Inspiration[]>(initialLibraryInspirations);
  const [syncState, setSyncState] = useState(hasApiConnection() ? "正在同步 SQLite" : "离线内容");
  const [view, setView] = useState<LibraryView>("navigation");
  const [layout, setLayout] = useState<LibraryLayout>("grid");
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [focusedGraphId, setFocusedGraphId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [relationMode, setRelationMode] = useState("主题");
  const [actionMessage, setActionMessage] = useState("");

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

  const activeGraphLinks = useMemo(() => createGraphLinks(libraryInspirations), [libraryInspirations]);
  const activeGraphPositions = useMemo(() => createGraphPositions(libraryInspirations), [libraryInspirations]);
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

  const visibleGraphItems = useMemo(() => {
    const graphRoots = focusedGraphId ? [...selectedIds, focusedGraphId] : selectedIds;
    if (relationMode !== "当前灵感附近" || graphRoots.length === 0) {
      return filteredInspirations;
    }

    const nearby = new Set(graphRoots);
    activeGraphLinks.forEach(([source, target]) => {
      if (nearby.has(source)) nearby.add(target);
      if (nearby.has(target)) nearby.add(source);
    });
    return filteredInspirations.filter((item) => nearby.has(item.id));
  }, [activeGraphLinks, filteredInspirations, focusedGraphId, relationMode, selectedIds]);

  const visibleGraphIds = new Set(visibleGraphItems.map((item) => item.id));
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
              {activeGraphLinks.map(([source, target], index) => {
                if (!visibleGraphIds.has(source) || !visibleGraphIds.has(target)) return null;
                const sourceItem = libraryInspirations.find((item) => item.id === source);
                const targetItem = libraryInspirations.find((item) => item.id === target);
                const matchesRelation =
                  relationMode === "当前灵感附近" ||
                  (relationMode === "主题" && Boolean(sourceItem?.theme) && sourceItem?.theme === targetItem?.theme) ||
                  (relationMode === "情绪" && Boolean(sourceItem?.emotion) && sourceItem?.emotion === targetItem?.emotion) ||
                  (relationMode === "项目" && Boolean(sourceItem?.project) && sourceItem?.project === targetItem?.project);
                if (!matchesRelation) return null;
                const start = activeGraphPositions[source];
                const end = activeGraphPositions[target];
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
              const position = activeGraphPositions[item.id];
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
