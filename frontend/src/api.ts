export type InputMode = "dialogue" | "text" | "humming" | "image" | "voice";

export type AnalysisTag = {
  label: "主题" | "情绪" | "场景" | "适用位置";
  value: string;
  detail: string;
};

export type BriefAttachment = {
  type: "audio" | "image" | "video" | "note";
  name: string;
  uploadId?: string;
};

export type BriefRequest = {
  projectId: string;
  mode: InputMode;
  content: string;
  attachments?: BriefAttachment[];
};

export type BriefResponse = {
  source: "backend" | "local";
  title: string;
  summary: string;
  tags: AnalysisTag[];
  suggestedStyle: string;
  dataFlow: string[];
};

export type DemoTaskRequest = {
  projectId: string;
  prompt: string;
  referenceBrief: BriefResponse;
  lyrics?: string;
  attachments?: BriefAttachment[];
  customName?: string;
};

export type DemoTaskResponse = {
  taskId: string;
  projectId?: string;
  status: "queued" | "running" | "succeeded" | "failed";
  message: string;
  audioUrl?: string;
  progress?: number;
  lyrics?: string;
  provider?: string;
  traceId?: string;
  createdAt?: string;
  customName?: string;
};

export type ProjectRecord = {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  progress: number;
  owner: string;
  updated: string;
  creatorClientId?: string;
};

export type ProjectWorkspaceSaveRequest = {
  clientId: string;
  workbench: Record<string, unknown>;
};

export type ProjectWorkspaceResponse = {
  projectId: string;
  clientId: string;
  workbench: Record<string, unknown>;
  updatedAt: string;
};

export type ShareLinkResponse = {
  token: string;
  projectId: string;
  creatorClientId: string;
  path: string;
  createdAt: string;
};

export type CollaborationSession = {
  id: string;
  projectId: string;
  shareToken: string;
  creatorClientId: string;
  collaboratorClientId: string;
  collaboratorName: string;
  status: string;
  progress: number;
  lastMessage: string;
  workbench: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type ShareLinkJoinResponse = {
  project: ProjectRecord;
  session: CollaborationSession;
};

export type CollaborationSessionUpdateRequest = {
  collaboratorClientId: string;
  collaboratorName?: string;
  status: string;
  progress: number;
  lastMessage: string;
  workbench: Record<string, unknown>;
};

export type InspirationCard = {
  id: string;
  projectId: string;
  title: string;
  content: string;
  attachments: BriefAttachment[];
  tags: AnalysisTag[];
  createdAt: string;
};

export type InspirationRecord = InspirationCard;

export type InspirationCreateRequest = {
  projectId: string;
  title: string;
  content: string;
  attachments: BriefAttachment[];
  tags: AnalysisTag[];
};

export type UploadResponse = {
  uploadId: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  normalizedFormat: string;
  nextStep: string;
};

function resolveApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "");
  if (configured) {
    try {
      const url = new URL(configured);
      const pageHost = typeof window !== "undefined" ? window.location.hostname : "";
      const isLocalConfig = url.hostname === "localhost" || url.hostname === "127.0.0.1";
      const isPageLocal = !pageHost || pageHost === "localhost" || pageHost === "127.0.0.1";
      // 配置写的是 localhost，但页面在局域网 / 其他主机打开时，后端跟随页面主机，保证手机可访问
      if (isLocalConfig && !isPageLocal) {
        const port = url.port || "8000";
        return `${url.protocol}//${pageHost}:${port}`;
      }
      return configured;
    } catch {
      return configured;
    }
  }
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }
  return "";
}

const API_BASE_URL = resolveApiBaseUrl();

export function hasApiConnection() {
  return Boolean(API_BASE_URL);
}

const defaultFlow = [
  "浏览器录音 / 上传",
  "应用后端",
  "音频校验与转码",
  "旋律分析",
  "DeepSeek Brief",
  "Mureka / MiniMax",
  "数据库与音频存储",
  "分享页",
];

function localBrief(payload: BriefRequest): BriefResponse {
  const text = payload.content || "新的灵感素材";
  const cityTone = /城市|出租车|雨|告别|离开/.test(text);
  const modeLabel: Record<InputMode, string> = {
    dialogue: "对话",
    text: "文字",
    humming: "哼唱",
    image: "图片",
    voice: "语音",
  };

  const modeSummary: Record<InputMode, string> = {
    dialogue: "已把对话整理为创作目标、限制条件和下一步问题。",
    text: "已保留原文，并拆出可用于歌词结构的位置建议。",
    humming: "已把参考录音纳入旋律轮廓上下文，等待后端提取 BPM、调性和音高。",
    image: "已把图片说明整理成场景、意象和视觉氛围。",
    voice: "已把口述内容整理为可执行修改点和协作反馈。",
  };

  return {
    source: "local",
    title: cityTone ? "像明天还会见" : `${modeLabel[payload.mode]}灵感片段`,
    summary: modeSummary[payload.mode],
    suggestedStyle: cityTone ? "都市流行 / 中慢速 / 钢琴与电子氛围" : "温暖流行 / 轻鼓组 / 留白编曲",
    tags: [
      {
        label: "主题",
        value: cityTone ? "离开一座生活很久的城市" : "未完成的关系与自我叙事",
        detail: "用于统一歌词、旋律和视觉素材的核心方向",
      },
      {
        label: "情绪",
        value: cityTone ? "克制、不舍、后半段释放" : "温暖、轻微遗憾、逐步打开",
        detail: "副歌需要比主歌更开阔，但鼓组保持克制",
      },
      {
        label: "场景",
        value: cityTone ? "雨夜、出租车、霓虹、站台" : "夜晚、房间、低光、近距离人声",
        detail: "可以提取环境声作为 Intro 或段落过渡",
      },
      {
        label: "适用位置",
        value: "主歌结尾 / 副歌 Hook",
        detail: "保留原句作为 Hook 落点，允许 AI 扩写前后两句",
      },
    ],
    dataFlow: defaultFlow,
  };
}

export async function analyzeInspiration(payload: BriefRequest): Promise<BriefResponse> {
  if (!API_BASE_URL) {
    await new Promise((resolve) => setTimeout(resolve, 360));
    return localBrief(payload);
  }

  const response = await fetch(`${API_BASE_URL}/api/brief`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Brief request failed with ${response.status}`);
  }

  return {
    ...(await response.json()),
    source: "backend",
  } as BriefResponse;
}

export type ChatHistoryItem = {
  role: "user" | "ai";
  text: string;
};

export type ChatResponse = {
  reply: string;
  source: string;
};

export async function chatWithMinimax(payload: {
  projectId: string;
  history: ChatHistoryItem[];
  content: string;
}): Promise<ChatResponse> {
  if (!API_BASE_URL) {
    throw new Error("未配置 VITE_API_BASE_URL，无法调用 MiniMax 对话。");
  }

  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Chat request failed with ${response.status}`);
  }

  return (await response.json()) as ChatResponse;
}

export async function createDemoTask(payload: DemoTaskRequest): Promise<DemoTaskResponse> {
  if (!API_BASE_URL) {
    await new Promise((resolve) => setTimeout(resolve, 280));
    return {
      taskId: `local_${Date.now()}`,
      status: "failed",
      progress: 0,
      message: "未配置 VITE_API_BASE_URL，前端无法调用 Python 后端和 MiniMax。",
    };
  }

  const response = await fetch(`${API_BASE_URL}/api/demo-tasks`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Demo task request failed with ${response.status}`);
  }

  return response.json() as Promise<DemoTaskResponse>;
}

export async function getDemoTask(taskId: string): Promise<DemoTaskResponse> {
  if (!API_BASE_URL) {
    await new Promise((resolve) => setTimeout(resolve, 420));
    return {
      taskId,
      status: "failed",
      progress: 0,
      message: "未连接 Python 后端，无法读取真实生成任务。",
    };
  }

  const response = await fetch(`${API_BASE_URL}/api/demo-tasks/${encodeURIComponent(taskId)}`);

  if (!response.ok) {
    throw new Error(`Demo task polling failed with ${response.status}`);
  }

  return response.json() as Promise<DemoTaskResponse>;
}

export async function listDemoTasks(projectId?: string): Promise<DemoTaskResponse[]> {
  if (!API_BASE_URL) {
    return [];
  }

  const search = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";
  const response = await fetch(`${API_BASE_URL}/api/demo-tasks${search}`);

  if (!response.ok) {
    throw new Error(`Demo tasks request failed with ${response.status}`);
  }

  return response.json() as Promise<DemoTaskResponse[]>;
}

export async function updateDemoTaskName(taskId: string, name: string): Promise<DemoTaskResponse> {
  if (!API_BASE_URL) {
    return { taskId, status: "succeeded" } as DemoTaskResponse;
  }

  const response = await fetch(`${API_BASE_URL}/api/demo-tasks/${encodeURIComponent(taskId)}`, {
    method: "PATCH",
    headers: communityHeaders(),
    body: JSON.stringify({ customName: name }),
  });

  if (!response.ok) {
    throw new Error(`Update demo task name failed with ${response.status}`);
  }

  return response.json() as Promise<DemoTaskResponse>;
}

export async function listProjects(): Promise<ProjectRecord[]> {
  if (!API_BASE_URL) {
    return [];
  }

  const response = await fetch(`${API_BASE_URL}/api/projects`);

  if (!response.ok) {
    throw new Error(`Projects request failed with ${response.status}`);
  }

  return response.json() as Promise<ProjectRecord[]>;
}

export async function saveProject(payload: ProjectRecord): Promise<ProjectRecord> {
  if (!API_BASE_URL) {
    return payload;
  }

  const response = await fetch(`${API_BASE_URL}/api/projects`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Save project failed with ${response.status}`);
  }

  return response.json() as Promise<ProjectRecord>;
}

export async function getProjectWorkspace(projectId: string): Promise<ProjectWorkspaceResponse | null> {
  if (!API_BASE_URL || !projectId) {
    return null;
  }

  const response = await fetch(`${API_BASE_URL}/api/projects/${encodeURIComponent(projectId)}/workspace`);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Project workspace request failed with ${response.status}`);
  }

  return response.json() as Promise<ProjectWorkspaceResponse>;
}

export async function saveProjectWorkspace(projectId: string, payload: ProjectWorkspaceSaveRequest): Promise<ProjectWorkspaceResponse> {
  if (!API_BASE_URL) {
    return {
      projectId,
      clientId: payload.clientId,
      workbench: payload.workbench,
      updatedAt: new Date().toISOString(),
    };
  }

  const response = await fetch(`${API_BASE_URL}/api/projects/${encodeURIComponent(projectId)}/workspace`, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Save project workspace failed with ${response.status}`);
  }

  return response.json() as Promise<ProjectWorkspaceResponse>;
}

export async function createShareLink(projectId: string, creatorClientId: string): Promise<ShareLinkResponse> {
  if (!API_BASE_URL) {
    await new Promise((resolve) => setTimeout(resolve, 160));
    const token = `local_share_${Date.now()}`;
    return {
      token,
      projectId,
      creatorClientId,
      path: `/create?project=${encodeURIComponent(projectId)}&share=${encodeURIComponent(token)}`,
      createdAt: new Date().toISOString(),
    };
  }

  const response = await fetch(`${API_BASE_URL}/api/share-links`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ projectId, creatorClientId }),
  });

  if (!response.ok) {
    throw new Error(`Share link request failed with ${response.status}`);
  }

  return response.json() as Promise<ShareLinkResponse>;
}

export async function joinShareLink(
  shareToken: string,
  collaboratorClientId: string,
  collaboratorName: string,
): Promise<ShareLinkJoinResponse> {
  if (!API_BASE_URL) {
    throw new Error("未配置 VITE_API_BASE_URL，无法加入私域接力。");
  }

  const response = await fetch(`${API_BASE_URL}/api/share-links/${encodeURIComponent(shareToken)}/join`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ shareToken, collaboratorClientId, collaboratorName }),
  });

  if (!response.ok) {
    throw new Error(`Join share link failed with ${response.status}`);
  }

  return response.json() as Promise<ShareLinkJoinResponse>;
}

export async function listCollaborationSessions(projectId: string): Promise<CollaborationSession[]> {
  if (!API_BASE_URL || !projectId) {
    return [];
  }

  const response = await fetch(`${API_BASE_URL}/api/projects/${encodeURIComponent(projectId)}/collaboration-sessions`);

  if (!response.ok) {
    throw new Error(`Collaboration sessions request failed with ${response.status}`);
  }

  return response.json() as Promise<CollaborationSession[]>;
}

export async function getCollaborationSession(sessionId: string): Promise<CollaborationSession> {
  if (!API_BASE_URL) {
    throw new Error("未配置 VITE_API_BASE_URL，无法读取接力工作台。");
  }

  const response = await fetch(`${API_BASE_URL}/api/collaboration-sessions/${encodeURIComponent(sessionId)}`);

  if (!response.ok) {
    throw new Error(`Collaboration session request failed with ${response.status}`);
  }

  return response.json() as Promise<CollaborationSession>;
}

export async function updateCollaborationSession(
  sessionId: string,
  payload: CollaborationSessionUpdateRequest,
): Promise<CollaborationSession> {
  if (!API_BASE_URL) {
    throw new Error("未配置 VITE_API_BASE_URL，无法同步接力进度。");
  }

  const response = await fetch(`${API_BASE_URL}/api/collaboration-sessions/${encodeURIComponent(sessionId)}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Collaboration session update failed with ${response.status}`);
  }

  return response.json() as Promise<CollaborationSession>;
}

export async function uploadAttachment(file: File): Promise<UploadResponse> {
  if (!API_BASE_URL) {
    await new Promise((resolve) => setTimeout(resolve, 360));
    return {
      uploadId: `local_upload_${Date.now()}`,
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      normalizedFormat: "local-preview",
      nextStep: "连接 Python 后端后会保存附件并执行对应素材分析。",
    };
  }

  const form = new FormData();
  form.append("file", file);

  const response = await fetch(`${API_BASE_URL}/api/uploads`, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    throw new Error(`Upload failed with ${response.status}`);
  }

  return response.json() as Promise<UploadResponse>;
}

export async function uploadAudio(file: File): Promise<UploadResponse> {
  return uploadAttachment(file);
}

export async function saveInspiration(payload: InspirationCreateRequest): Promise<InspirationCard> {
  if (!API_BASE_URL) {
    await new Promise((resolve) => setTimeout(resolve, 180));
    return {
      id: `local_insp_${Date.now()}`,
      ...payload,
      createdAt: new Date().toISOString(),
    };
  }

  const response = await fetch(`${API_BASE_URL}/api/inspirations`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Save inspiration failed with ${response.status}`);
  }

  return response.json() as Promise<InspirationCard>;
}

export async function listInspirations(): Promise<InspirationCard[]> {
  if (!API_BASE_URL) {
    return [];
  }

  const response = await fetch(`${API_BASE_URL}/api/inspirations`);

  if (!response.ok) {
    throw new Error(`Inspirations request failed with ${response.status}`);
  }

  return response.json() as Promise<InspirationCard[]>;
}

export function getApiConnectionLabel() {
  return API_BASE_URL ? "Python 后端已配置" : "本地模拟分析";
}

// ===== 作品社区 =====
function getCommunityClientId(): string {
  const key = "sonic_seed_client_id";
  const current = localStorage.getItem(key);
  if (current) return current;
  const next = `client_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  localStorage.setItem(key, next);
  return next;
}

export interface CommunityDemoVersion {
  taskId: string;
  title: string;
  audioUrl: string | null;
  lyrics: string | null;
  progress: number | null;
  createdAt: string | null;
}

export interface CommunityComment {
  id: string;
  postId: string;
  parentId: string | null;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface CommunityPost {
  id: string;
  projectId: string;
  authorClientId: string;
  authorName: string;
  title: string;
  description: string;
  demoVersions: CommunityDemoVersion[];
  comments: CommunityComment[];
  likeCount: number;
  likedByMe: boolean;
  commentCount: number;
  createdAt: string;
}

export interface CommunityPostSummary {
  id: string;
  projectId: string;
  authorName: string;
  title: string;
  description: string;
  demoVersionCount: number;
  likeCount: number;
  likedByMe: boolean;
  commentCount: number;
  createdAt: string;
}

export interface CommunityPostCreate {
  projectId: string;
  authorName: string;
  title: string;
  description: string;
}

export interface CommunityCommentCreate {
  authorName: string;
  content: string;
  parentId?: string | null;
}

function communityHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return { "content-type": "application/json", "x-client-id": getCommunityClientId(), ...extra };
}

export async function publishCommunityPost(payload: CommunityPostCreate): Promise<CommunityPost> {
  if (!API_BASE_URL) {
    await new Promise((resolve) => setTimeout(resolve, 240));
    const fallback: CommunityPost = {
      id: `local_post_${Date.now()}`,
      projectId: payload.projectId,
      authorClientId: getCommunityClientId(),
      authorName: payload.authorName,
      title: payload.title,
      description: payload.description,
      demoVersions: [],
      comments: [],
      likeCount: 0,
      likedByMe: false,
      commentCount: 0,
      createdAt: new Date().toISOString(),
    };
    return fallback;
  }

  const response = await fetch(`${API_BASE_URL}/api/community/posts`, {
    method: "POST",
    headers: communityHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`发布作品失败：${response.status}`);
  }

  return (await response.json()) as CommunityPost;
}

export async function listCommunityPosts(): Promise<CommunityPostSummary[]> {
  if (!API_BASE_URL) {
    return [];
  }

  const response = await fetch(`${API_BASE_URL}/api/community/posts`, {
    method: "GET",
    headers: communityHeaders(),
  });

  if (!response.ok) {
    throw new Error(`加载作品社区失败：${response.status}`);
  }

  return (await response.json()) as CommunityPostSummary[];
}

export async function getCommunityPost(postId: string): Promise<CommunityPost> {
  if (!API_BASE_URL) {
    throw new Error("未配置 VITE_API_BASE_URL，无法加载作品。");
  }

  const response = await fetch(`${API_BASE_URL}/api/community/posts/${encodeURIComponent(postId)}`, {
    method: "GET",
    headers: communityHeaders(),
  });

  if (!response.ok) {
    throw new Error(`加载作品失败：${response.status}`);
  }

  return (await response.json()) as CommunityPost;
}

export async function addCommunityComment(postId: string, payload: CommunityCommentCreate): Promise<CommunityComment> {
  if (!API_BASE_URL) {
    throw new Error("未配置 VITE_API_BASE_URL，无法发表评论。");
  }

  const response = await fetch(`${API_BASE_URL}/api/community/posts/${encodeURIComponent(postId)}/comments`, {
    method: "POST",
    headers: communityHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`评论失败：${response.status}`);
  }

  return (await response.json()) as CommunityComment;
}

export async function toggleCommunityLike(postId: string): Promise<{ postId: string; likeCount: number; likedByMe: boolean }> {
  if (!API_BASE_URL) {
    throw new Error("未配置 VITE_API_BASE_URL，无法点赞。");
  }

  const response = await fetch(`${API_BASE_URL}/api/community/posts/${encodeURIComponent(postId)}/like`, {
    method: "POST",
    headers: communityHeaders(),
    body: JSON.stringify({ clientId: getCommunityClientId() }),
  });

  if (!response.ok) {
    throw new Error(`点赞失败：${response.status}`);
  }

  return (await response.json()) as { postId: string; likeCount: number; likedByMe: boolean };
}
