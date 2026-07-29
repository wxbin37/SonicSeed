export type InputMode = "dialogue" | "text" | "humming" | "image" | "voice";

export type AnalysisTag = {
  label: "主题" | "情绪" | "场景" | "适用位置";
  value: string;
  detail: string;
};

export type BriefRequest = {
  projectId: string;
  mode: InputMode;
  content: string;
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

  return {
    source: "local",
    title: cityTone ? "像明天还会见" : "新的创作片段",
    summary: `已保留原始内容，并根据${payload.mode}输入整理成可继续创作的 Brief。`,
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

export function getApiConnectionLabel() {
  return API_BASE_URL ? "Python 后端已配置" : "本地模拟分析";
}
