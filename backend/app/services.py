from __future__ import annotations

import os
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import uuid4

import httpx

from .schemas import (
    AnalysisTag,
    BriefRequest,
    BriefResponse,
    DemoTaskRequest,
    DemoTaskResponse,
    InspirationCard,
    InspirationCreateRequest,
    ProjectSummary,
)


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


PROJECTS: list[ProjectSummary] = []
INSPIRATIONS: list[InspirationCard] = []


@dataclass
class StoredTask:
    id: str
    project_id: str
    status: str
    message: str
    created_at: float
    progress: int
    audio_url: str | None = None
    lyrics: str | None = None
    provider: str | None = None
    trace_id: str | None = None


TASKS: dict[str, StoredTask] = {}


def utc_now_label() -> str:
    return datetime.now(timezone.utc).isoformat()


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


def list_inspirations() -> list[InspirationCard]:
    return INSPIRATIONS


def create_inspiration(payload: InspirationCreateRequest) -> InspirationCard:
    card = InspirationCard(
        id=f"insp_{uuid4().hex[:12]}",
        projectId=payload.projectId,
        title=payload.title,
        content=payload.content,
        attachments=payload.attachments,
        tags=payload.tags,
        createdAt=utc_now_label(),
    )
    INSPIRATIONS.insert(0, card)
    return card


def upsert_project(payload: ProjectSummary) -> ProjectSummary:
    for index, project in enumerate(PROJECTS):
        if project.id == payload.id:
            PROJECTS[index] = payload
            return payload

    PROJECTS.insert(0, payload)
    return payload


def ensure_project(project_id: str, title: str, subtitle: str) -> None:
    if any(project.id == project_id for project in PROJECTS):
        return

    PROJECTS.insert(
        0,
        ProjectSummary(
            id=project_id,
            title=title[:80] or "未命名创作",
            subtitle=subtitle[:80] or "新的创作",
            status="已创建",
            progress=12,
            owner="我",
            updated="刚刚",
        ),
    )


def extract_user_lyrics(prompt: str) -> str:
    lines = [line.strip() for line in prompt.splitlines() if line.strip()]
    lyric_lines = []
    for line in lines:
        if line.startswith("附件:") or line.startswith("uploadId:"):
            continue
        if len(line) <= 80:
            lyric_lines.append(line)

    return "\n".join(lyric_lines[:12]).strip()


def build_lyrics(prompt: str, provided_lyrics: str | None) -> str:
    if provided_lyrics and provided_lyrics.strip():
        return provided_lyrics.strip()[:3500]

    extracted = extract_user_lyrics(prompt)
    if extracted:
        return f"[Verse]\n{extracted}\n[Chorus]\n我们把告别说得很轻\n像明天还会见"

    return "[Verse]\n把还没说完的话放进夜色\n让旋律替我们慢慢靠近\n[Chorus]\n我们把告别说得很轻\n像明天还会见"


def build_music_prompt(payload: DemoTaskRequest) -> str:
    tag_text = "，".join(f"{tag.label}:{tag.value}" for tag in payload.referenceBrief.tags)
    prompt = f"{payload.referenceBrief.suggestedStyle}，{tag_text}，{payload.prompt}"
    return prompt[:2000]


def call_minimax_music(payload: DemoTaskRequest) -> DemoTaskResponse:
    api_key = os.getenv("MINIMAX_API_KEY", "").strip()
    if not api_key:
        return DemoTaskResponse(
            taskId=f"task_{uuid4().hex[:10]}",
            status="failed",
            message="未配置 MINIMAX_API_KEY，后端没有调用音乐模型。",
            progress=0,
            lyrics=build_lyrics(payload.prompt, payload.lyrics),
            provider="MiniMax",
        )

    base_url = os.getenv("MINIMAX_BASE_URL", "https://api.minimaxi.com").rstrip("/")
    model = os.getenv("MINIMAX_MUSIC_MODEL", "music-3.0")
    lyrics = build_lyrics(payload.prompt, payload.lyrics)
    task_id = f"task_{uuid4().hex[:10]}"
    request_body = {
        "model": model,
        "prompt": build_music_prompt(payload),
        "lyrics": lyrics,
        "output_format": "url",
        "stream": False,
        "audio_setting": {
            "sample_rate": 44100,
            "bitrate": 256000,
            "format": "mp3",
        },
    }

    try:
        response = httpx.post(
            f"{base_url}/v1/music_generation",
            json=request_body,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            timeout=120,
        )
        response.raise_for_status()
        result = response.json()
    except httpx.HTTPError as error:
        return DemoTaskResponse(
            taskId=task_id,
            status="failed",
            message=f"MiniMax 请求失败：{error}",
            progress=0,
            lyrics=lyrics,
            provider="MiniMax",
        )

    base_resp = result.get("base_resp") or {}
    if base_resp.get("status_code") not in (0, None):
        return DemoTaskResponse(
            taskId=task_id,
            status="failed",
            message=base_resp.get("status_msg") or "MiniMax 返回失败状态。",
            progress=0,
            lyrics=lyrics,
            provider="MiniMax",
            traceId=result.get("trace_id"),
        )

    audio_url = (result.get("data") or {}).get("audio")
    if not audio_url:
        return DemoTaskResponse(
            taskId=task_id,
            status="failed",
            message="MiniMax 未返回音频地址。",
            progress=0,
            lyrics=lyrics,
            provider="MiniMax",
            traceId=result.get("trace_id"),
        )

    return DemoTaskResponse(
        taskId=task_id,
        status="succeeded",
        message="MiniMax 已返回音频，URL 有效期约 24 小时，请后续接入对象存储做持久化。",
        progress=100,
        audioUrl=audio_url,
        lyrics=lyrics,
        provider="MiniMax",
        traceId=result.get("trace_id"),
    )


def create_demo_task(payload: DemoTaskRequest) -> DemoTaskResponse:
    result = call_minimax_music(payload)
    TASKS[result.taskId] = StoredTask(
        id=result.taskId,
        project_id=payload.projectId,
        status=result.status,
        message=result.message,
        created_at=time.monotonic(),
        progress=result.progress or 0,
        audio_url=result.audioUrl,
        lyrics=result.lyrics,
        provider=result.provider,
        trace_id=result.traceId,
    )
    ensure_project(payload.projectId, payload.referenceBrief.title, "生成版本")
    return result


def get_demo_task(task_id: str) -> DemoTaskResponse | None:
    task = TASKS.get(task_id)
    if task is None:
        return None

    return DemoTaskResponse(
        taskId=task.id,
        status=task.status,
        message=task.message,
        progress=task.progress,
        audioUrl=task.audio_url,
        lyrics=task.lyrics,
        provider=task.provider,
        traceId=task.trace_id,
    )
