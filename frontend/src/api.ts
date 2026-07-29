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
};

export type DemoTaskResponse = {
  taskId: string;
  status: "queued" | "running" | "succeeded" | "failed";
  message: string;
  audioUrl?: string;
  progress?: number;
};

export type UploadResponse = {
  uploadId: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  normalizedFormat: string;
  nextStep: string;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "";

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

export async function createDemoTask(payload: DemoTaskRequest): Promise<DemoTaskResponse> {
  if (!API_BASE_URL) {
    await new Promise((resolve) => setTimeout(resolve, 280));
    return {
      taskId: `local_${Date.now()}`,
      status: "queued",
      message: "本地模拟任务已创建；连接 Python 后端后会返回真实任务 ID。",
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
      status: "succeeded",
      progress: 100,
      message: "本地模拟任务已完成；未连接音乐模型，所以不会生成真实音频文件。",
    };
  }

  const response = await fetch(`${API_BASE_URL}/api/demo-tasks/${encodeURIComponent(taskId)}`);

  if (!response.ok) {
    throw new Error(`Demo task polling failed with ${response.status}`);
  }

  return response.json() as Promise<DemoTaskResponse>;
}

export async function uploadAudio(file: File): Promise<UploadResponse> {
  if (!API_BASE_URL) {
    await new Promise((resolve) => setTimeout(resolve, 360));
    return {
      uploadId: `local_upload_${Date.now()}`,
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      normalizedFormat: "local-preview",
      nextStep: "连接 Python 后端后会执行音频校验、转码和旋律分析。",
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

export function getApiConnectionLabel() {
  return API_BASE_URL ? "Python 后端已配置" : "本地模拟分析";
}
