from __future__ import annotations

import time
from dataclasses import dataclass
from uuid import uuid4

from .schemas import AnalysisTag, BriefRequest, BriefResponse, DemoTaskRequest, DemoTaskResponse, ProjectSummary


DATA_FLOW = [
    "浏览器录音 / 上传",
    "应用后端",
    "音频校验与转码",
    "旋律分析",
    "DeepSeek Brief",
    "Mureka / MiniMax",
    "数据库与音频存储",
    "分享页",
]


PROJECTS = [
    ProjectSummary(
        id="city-leave",
        title="离开城市之前",
        subtitle="副歌哼唱 + 两句歌词",
        status="Mureka 伴奏生成中",
        progress=68,
        owner="我",
        updated="2分钟前",
    ),
    ProjectSummary(
        id="midnight-hook",
        title="凌晨副歌接力",
        subtitle="合作方正在改 Hook",
        status="等待歌词确认",
        progress=42,
        owner="林雨",
        updated="12分钟前",
    ),
    ProjectSummary(
        id="taxi-rain",
        title="雨夜出租车 Demo",
        subtitle="V1 试听反馈沉淀",
        status="准备生成分支",
        progress=86,
        owner="陈舟",
        updated="今天 15:20",
    ),
]


@dataclass
class StoredTask:
    id: str
    project_id: str
    status: str
    message: str
    created_at: float


TASKS: dict[str, StoredTask] = {}


def build_brief(payload: BriefRequest) -> BriefResponse:
    text = payload.content or "新的灵感素材"
    city_tone = any(keyword in text for keyword in ["城市", "出租车", "雨", "告别", "离开", "再见"])
    attachment_count = len(payload.attachments)
    mode_labels = {
        "dialogue": "对话",
        "text": "文字",
        "humming": "哼唱",
        "image": "图片",
        "voice": "语音",
    }
    mode_summaries = {
        "dialogue": "已把对话整理为创作目标、限制条件和下一步问题。",
        "text": "已保留文本原文，并拆出歌词结构和可扩写位置。",
        "humming": "已接收旋律素材，下一步应转码并提取 BPM、调性和旋律轮廓。",
        "image": "已把视觉素材转成场景、意象和氛围参考。",
        "voice": "已把口述反馈整理为版本修改点和协作接力建议。",
    }

    tags = [
        AnalysisTag(
            label="主题",
            value="离开一座生活很久的城市" if city_tone else "未完成的关系与自我叙事",
            detail="用于统一歌词、旋律和视觉素材的核心方向",
        ),
        AnalysisTag(
            label="情绪",
            value="克制、不舍、后半段释放" if city_tone else "温暖、轻微遗憾、逐步打开",
            detail="副歌需要比主歌更开阔，但鼓组保持克制",
        ),
        AnalysisTag(
            label="场景",
            value="雨夜、出租车、霓虹、站台" if city_tone else "夜晚、房间、低光、近距离人声",
            detail="可以提取环境声作为 Intro 或段落过渡",
        ),
        AnalysisTag(
            label="适用位置",
            value="主歌结尾 / 副歌 Hook",
            detail="保留原句作为 Hook 落点，允许 AI 扩写前后两句",
        ),
    ]

    return BriefResponse(
        title="像明天还会见" if city_tone else f"{mode_labels[payload.mode]}灵感片段",
        summary=f"{mode_summaries[payload.mode]}已绑定 {attachment_count} 个附件。",
        tags=tags,
        suggestedStyle="都市流行 / 中慢速 / 钢琴与电子氛围" if city_tone else "温暖流行 / 轻鼓组 / 留白编曲",
        dataFlow=DATA_FLOW,
    )


def create_demo_task(payload: DemoTaskRequest) -> DemoTaskResponse:
    task_id = f"task_{uuid4().hex[:10]}"
    TASKS[task_id] = StoredTask(
        id=task_id,
        project_id=payload.projectId,
        status="queued",
        message="任务已创建，后续会提交到 Mureka 或 MiniMax，并通过轮询返回状态。",
        created_at=time.monotonic(),
    )

    return DemoTaskResponse(
        taskId=task_id,
        status="queued",
        message=TASKS[task_id].message,
        progress=10,
    )


def get_demo_task(task_id: str) -> DemoTaskResponse | None:
    task = TASKS.get(task_id)
    if task is None:
        return None

    elapsed = time.monotonic() - task.created_at
    if elapsed > 8:
        task.status = "succeeded"
        task.message = "Demo 已生成并保存到音频存储，前端可以刷新成品区。"
        progress = 100
    elif elapsed > 2:
        task.status = "running"
        task.message = "供应商任务轮询中，当前处于编曲生成阶段。"
        progress = 62
    else:
        progress = 24

    return DemoTaskResponse(taskId=task.id, status=task.status, message=task.message, progress=progress)
