from __future__ import annotations

import base64
import binascii
import os
from uuid import uuid4

import httpx
import json

from .env_loader import load_local_env
from .schemas import (
    AnalysisTag,
    BriefRequest,
    BriefResponse,
    ChatRequest,
    CollaborationSessionJoinRequest,
    CollaborationSessionResponse,
    CollaborationSessionUpdateRequest,
    CommunityComment,
    CommunityCommentCreate,
    CommunityPost,
    CommunityPostCreate,
    CommunityPostSummary,
    DemoTaskRequest,
    DemoTaskResponse,
    InspirationCard,
    InspirationCreateRequest,
    ProjectWorkspaceResponse,
    ProjectWorkspaceSaveRequest,
    ProjectSummary,
    ShareLinkCreateRequest,
    ShareLinkJoinResponse,
    ShareLinkResponse,
)
from .storage import (
    create_share_link_record,
    get_demo_task_record,
    get_collaboration_session_record,
    get_project_workspace_record,
    insert_inspiration_record,
    join_share_link_record,
    list_collaboration_session_records,
    list_community_comment_records,
    list_community_post_records,
    create_community_post_record,
    insert_community_comment_record,
    get_community_post_record,
    toggle_community_like_record,
    list_demo_task_records,
    list_inspiration_records,
    list_project_records,
    project_exists,
    store_demo_task_record,
    update_collaboration_session_record,
    upsert_project_workspace_record,
    upsert_project_record,
    utc_now_label,
)
from .upload_store import read_upload_bytes

load_local_env()


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

DEFAULT_MINIMAX_BASE_URL = "https://api.minimaxi.com"
DEFAULT_MINIMAX_MUSIC_MODEL = "music-3.0"
DEFAULT_MINIMAX_AUDIO_MODEL = "music-cover"
TEXT_MUSIC_MODELS = {"music-3.0", "music-3.0-free", "music-2.6", "music-2.6-free"}


def is_ascii_token(value: str) -> bool:
    try:
        value.encode("ascii")
    except UnicodeEncodeError:
        return False

    return True


MINIMAX_API_KEY = os.getenv("MINIMAX_API_KEY", "").strip()
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "").strip()
DEEPSEEK_MODEL = "deepseek-v4-pro"
DEEPSEEK_URL = "https://api.deepseek.com/chat/completions"
TAG_LABELS = ["主题", "情绪", "场景", "适用位置"]

_DEEPSEEK_SYSTEM_PROMPT = (
    "你是一名专业的音乐创作 AI 助理。用户会给你一段创作素材（可能是对话、文字、哼唱描述、图片或语音转写）。"
    "请分析这段素材，并只返回一个 JSON 对象，不要包含任何额外文字或 markdown 代码块。"
    "JSON 结构必须严格如下：\n"
    "{\n"
    '  "title": "为这段灵感起一个简短且有画面感的名称（不超过 20 字）",\n'
    '  "summary": "一句话总结这段素材的创作要点",\n'
    '  "suggestedStyle": "建议的音乐风格 / 速度 / 编曲方向",\n'
    '  "tags": {\n'
    '    "主题": {"value": "核心主题", "detail": "主题说明"},\n'
    '    "情绪": {"value": "情绪关键词", "detail": "情绪说明"},\n'
    '    "场景": {"value": "画面 / 场景", "detail": "场景说明"},\n'
    '    "适用位置": {"value": "在歌曲中的适用位置", "detail": "用法说明"}\n'
    "  }\n"
    "}\n"
    "要求：四个分类（主题 / 情绪 / 场景 / 适用位置）都必须给出 value 和 detail，且必须贴合素材内容、具体可落地。"
)


def call_deepseek_brief(payload: BriefRequest) -> dict:
    """调用 DeepSeek 分析素材，返回 BriefResponse 形状的 dict。失败时抛异常由 build_brief 回退。"""
    if not DEEPSEEK_API_KEY:
        raise RuntimeError("未配置 DEEPSEEK_API_KEY，跳过 DeepSeek 调用。")
    text = payload.content or "新的灵感素材"
    mode_labels = {
        "dialogue": "对话",
        "text": "文字",
        "humming": "哼唱",
        "image": "图片",
        "voice": "语音",
    }
    user_prompt = (
        f"素材类型：{mode_labels.get(payload.mode, payload.mode)}\n"
        f"附件数量：{len(payload.attachments)}\n"
        f"素材内容：\n{text}"
    )
    with httpx.Client(timeout=30) as client:
        resp = client.post(
            DEEPSEEK_URL,
            headers={
                "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": DEEPSEEK_MODEL,
                "messages": [
                    {"role": "system", "content": _DEEPSEEK_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0.6,
            },
        )
        resp.raise_for_status()
        data = resp.json()
    content = data["choices"][0]["message"]["content"]
    parsed = json.loads(content)

    raw_tags = parsed.get("tags", {}) or {}
    tags: list[AnalysisTag] = []
    for label in TAG_LABELS:
        entry = raw_tags.get(label) or {}
        if isinstance(entry, dict):
            value = entry.get("value", "")
            detail = entry.get("detail", "")
        else:
            value, detail = str(entry), ""
        tags.append(AnalysisTag(label=label, value=value, detail=detail))

    return {
        "title": parsed.get("title", "新建灵感"),
        "summary": parsed.get("summary", ""),
        "tags": tags,
        "suggestedStyle": parsed.get("suggestedStyle", ""),
        "dataFlow": DATA_FLOW,
    }


def _keyword_brief_fallback(payload: BriefRequest) -> BriefResponse:
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


def build_brief(payload: BriefRequest) -> BriefResponse:
    try:
        return BriefResponse(**call_deepseek_brief(payload))
    except Exception as exc:  # noqa: BLE001 - 任何失败都回退，保证 UI 永远有标签
        print(f"[build_brief] DeepSeek 调用失败，回退关键词 mock：{exc}")
        return _keyword_brief_fallback(payload)


def list_projects() -> list[ProjectSummary]:
    return list_project_records()


def list_inspirations() -> list[InspirationCard]:
    return list_inspiration_records()


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
    return insert_inspiration_record(card)


def upsert_project(payload: ProjectSummary) -> ProjectSummary:
    return upsert_project_record(payload)


def get_project_workspace(project_id: str) -> ProjectWorkspaceResponse | None:
    return get_project_workspace_record(project_id)


def save_project_workspace(project_id: str, payload: ProjectWorkspaceSaveRequest) -> ProjectWorkspaceResponse:
    return upsert_project_workspace_record(project_id, payload)


def ensure_project(project_id: str, title: str, subtitle: str) -> None:
    if project_exists(project_id):
        return

    upsert_project_record(
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
    first_section_index = next((index for index, line in enumerate(lines) if line.startswith("[") and "]" in line[:24]), -1)
    if first_section_index < 0:
        return ""

    return "\n".join(lines[first_section_index:])[:3500].strip()


def build_lyrics(prompt: str, provided_lyrics: str | None) -> str | None:
    if provided_lyrics and provided_lyrics.strip():
        return provided_lyrics.strip()[:3500]

    extracted = extract_user_lyrics(prompt)
    if extracted:
        return extracted

    return None


def build_music_prompt(payload: DemoTaskRequest) -> str:
    tag_text = "，".join(f"{tag.label}:{tag.value}" for tag in payload.referenceBrief.tags)
    prompt = f"{payload.referenceBrief.suggestedStyle}，{tag_text}，{payload.prompt}"
    return prompt[:2000]


def build_minimax_prompt(payload: DemoTaskRequest, model: str) -> str:
    prompt = "，".join(part.strip() for part in build_music_prompt(payload).replace("\n", "，").split("，") if part.strip())
    if model.startswith("music-cover"):
        if len(prompt) < 10:
            prompt = f"{prompt}，都市流行，中速，情绪逐渐释放"
        return prompt[:300]

    return prompt[:2000]


def encode_first_audio_attachment(payload: DemoTaskRequest) -> str | None:
    for attachment in payload.attachments:
        if attachment.type != "audio" or not attachment.uploadId:
            continue

        body = read_upload_bytes(attachment.uploadId)
        if body:
            return base64.b64encode(body).decode("ascii")

    return None


def parse_minimax_audio(audio: object) -> str | None:
    if isinstance(audio, str) and audio.startswith(("https://", "http://")):
        return audio

    if not isinstance(audio, str) or not audio:
        return None

    try:
        audio_bytes = bytes.fromhex(audio)
    except (TypeError, ValueError, binascii.Error):
        return None

    encoded_audio = base64.b64encode(audio_bytes).decode("ascii")
    return f"data:audio/mpeg;base64,{encoded_audio}"


def extract_minimax_lyrics(result: dict[str, object], default_lyrics: str | None) -> str | None:
    candidate_keys = {"lyrics", "lyric", "generated_lyrics", "optimized_lyrics"}
    stack: list[object] = [result.get("data") or {}, result.get("extra_info") or {}, result]

    while stack:
        current = stack.pop()
        if isinstance(current, dict):
            for key, value in current.items():
                if key in candidate_keys and isinstance(value, str) and value.strip():
                    return value.strip()[:3500]
                if isinstance(value, (dict, list)):
                    stack.append(value)
        elif isinstance(current, list):
            stack.extend(current)

    return default_lyrics


def normalize_minimax_error_message(message: object) -> str:
    text = str(message or "").strip()
    if not text:
        return "MiniMax 返回失败状态。"

    lowered = text.lower()
    if "insufficient balance" in lowered:
        return "MiniMax 余额不足，请检查账户额度或充值后重试。"
    if "rate limit" in lowered or "too many requests" in lowered:
        return "MiniMax 请求过于频繁，请稍后重试。"
    if "unauthorized" in lowered or "invalid api key" in lowered:
        return "MiniMax API Key 无效，请检查后端配置。"

    return text


def call_minimax_music(payload: DemoTaskRequest) -> DemoTaskResponse:
    return call_minimax_music_with_task_id(payload, f"task_{uuid4().hex[:10]}")


def call_minimax_music_with_task_id(payload: DemoTaskRequest, task_id: str) -> DemoTaskResponse:
    api_key = MINIMAX_API_KEY
    if not api_key:
        return DemoTaskResponse(
            taskId=task_id,
            status="failed",
            message="未配置 MINIMAX_API_KEY，后端没有调用音乐模型。",
            progress=0,
            lyrics=build_lyrics(payload.prompt, payload.lyrics),
            provider="MiniMax",
        )
    if not is_ascii_token(api_key):
        return DemoTaskResponse(
            taskId=task_id,
            status="failed",
            message="MINIMAX_API_KEY 不是有效的 API Key，请检查是否仍是中文占位符或复制了说明文字。",
            progress=0,
            lyrics=build_lyrics(payload.prompt, payload.lyrics),
            provider="MiniMax",
        )

    base_url = os.getenv("MINIMAX_BASE_URL", DEFAULT_MINIMAX_BASE_URL).rstrip("/")
    lyrics = build_lyrics(payload.prompt, payload.lyrics)
    audio_base64 = encode_first_audio_attachment(payload)
    model = os.getenv(
        "MINIMAX_AUDIO_MODEL" if audio_base64 else "MINIMAX_MUSIC_MODEL",
        DEFAULT_MINIMAX_AUDIO_MODEL if audio_base64 else DEFAULT_MINIMAX_MUSIC_MODEL,
    )
    request_body: dict[str, object] = {
        "model": model,
        "prompt": build_minimax_prompt(payload, model),
        "output_format": "url",
        "stream": False,
        "audio_setting": {
            "sample_rate": 44100,
            "bitrate": 256000,
            "format": "mp3",
        },
    }
    if model in TEXT_MUSIC_MODELS:
        request_body["is_instrumental"] = False
        if lyrics:
            request_body["lyrics"] = lyrics[:3500]
        else:
            request_body["lyrics_optimizer"] = True
    elif audio_base64:
        request_body["audio_base64"] = audio_base64
        if lyrics:
            request_body["lyrics"] = lyrics[:1000]

    try:
        response = httpx.post(
            f"{base_url}/v1/music_generation",
            json=request_body,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            timeout=float(os.getenv("MINIMAX_TIMEOUT_SECONDS", "300")),
        )
        response.raise_for_status()
        result = response.json()
    except httpx.HTTPError as error:
        return DemoTaskResponse(
            taskId=task_id,
            status="failed",
            message=f"MiniMax 请求失败（模型：{model}）：{error}",
            progress=0,
            lyrics=lyrics,
            provider="MiniMax",
        )

    base_resp = result.get("base_resp") or {}
    if base_resp.get("status_code") not in (0, None):
        return DemoTaskResponse(
            taskId=task_id,
            status="failed",
            message=f"{normalize_minimax_error_message(base_resp.get('status_msg'))}（模型：{model}）",
            progress=0,
            lyrics=lyrics,
            provider="MiniMax",
            traceId=result.get("trace_id"),
        )

    audio_url = parse_minimax_audio((result.get("data") or {}).get("audio"))
    generated_lyrics = extract_minimax_lyrics(result, lyrics)
    if not audio_url:
        return DemoTaskResponse(
            taskId=task_id,
            status="failed",
            message="MiniMax 未返回可播放音频。",
            progress=0,
            lyrics=generated_lyrics,
            provider="MiniMax",
            traceId=result.get("trace_id"),
        )

    return DemoTaskResponse(
        taskId=task_id,
        status="succeeded",
        message=f"MiniMax 已返回音频（模型：{model}），URL 有效期约 24 小时，请后续接入对象存储做持久化。",
        progress=100,
        audioUrl=audio_url,
        lyrics=generated_lyrics,
        provider="MiniMax",
        traceId=result.get("trace_id"),
    )


# ---------------------------------------------------------------------------
# MiniMax 文本对话（创作协作）——用于聊天回复
# ---------------------------------------------------------------------------
MINIMAX_TEXT_BASE_URL = "https://api.minimaxi.com"
MINIMAX_TEXT_MODEL = "MiniMax-Text-01"
MINIMAX_TEXT_ENDPOINT = "/v1/text/chatcompletion_v2"

_MINIMAX_CHAT_SYSTEM_PROMPT = (
    "你是 Sonic Seed 的 AI 音乐创作协作伙伴。用户会给你灵感素材，例如歌词、旋律描述、故事、"
    "修改反馈，或图片 / 音频参考。请结合完整对话历史，以协作者的口吻给出具体、可落地的回复："
    "可以是补充的灵感点子、创作方向建议、结构 / 编曲 / 歌词上的具体修改意见，或下一步该做什么。"
    "用简体中文，语气像一起写歌的搭档，不要堆砌客套话，直接给有用的内容。"
)


def _extract_minimax_chat_content(data: dict[str, object]) -> str:
    """兼容 MiniMax 不同版本响应结构，尽量取出回复文本。"""
    try:
        choice = (data.get("choices") or [{}])[0]
        if isinstance(choice, dict):
            if isinstance(choice.get("message"), dict) and choice["message"].get("content"):
                return str(choice["message"]["content"])
            messages = choice.get("messages") or []
            if messages and isinstance(messages[0], dict) and messages[0].get("content"):
                return str(messages[0]["content"])
    except (KeyError, IndexError, TypeError):
        pass
    output = data.get("output")
    if isinstance(output, dict) and output.get("text"):
        return str(output["text"])
    if isinstance(data.get("reply"), str) and data["reply"]:
        return data["reply"]
    return ""


def call_minimax_chat(payload: ChatRequest) -> str:
    """调用 MiniMax 文本大模型，根据用户当前输入 + 历史生成协作回复。失败时抛异常。"""
    api_key = MINIMAX_API_KEY
    if not api_key or not is_ascii_token(api_key):
        raise RuntimeError("未配置有效的 MINIMAX_API_KEY，无法调用 MiniMax 文本对话。")

    base_url = os.getenv("MINIMAX_TEXT_BASE_URL", MINIMAX_TEXT_BASE_URL).rstrip("/")
    model = os.getenv("MINIMAX_TEXT_MODEL", MINIMAX_TEXT_MODEL)
    group_id = os.getenv("MINIMAX_GROUP_ID", "").strip()

    messages: list[dict[str, str]] = [
        {"role": "system", "content": _MINIMAX_CHAT_SYSTEM_PROMPT}
    ]
    for item in payload.history:
        role = "assistant" if item.role == "ai" else "user"
        text = (item.text or "").strip()
        if text:
            messages.append({"role": role, "content": text})

    content = (payload.content or "").strip()
    if not content:
        raise RuntimeError("对话内容为空，无法调用 MiniMax。")
    messages.append({"role": "user", "content": content})

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    if group_id:
        headers["MiniMax-Group-Id"] = group_id

    try:
        response = httpx.post(
            f"{base_url}{MINIMAX_TEXT_ENDPOINT}",
            json={
                "model": model,
                "messages": messages,
                "temperature": 0.8,
                "max_tokens": 1200,
                "stream": False,
            },
            headers=headers,
            timeout=60,
        )
        response.raise_for_status()
        data = response.json()
    except httpx.HTTPError as error:
        raise RuntimeError(f"MiniMax 文本对话请求失败：{error}") from error

    reply = _extract_minimax_chat_content(data)
    if not reply:
        raise RuntimeError("MiniMax 文本对话返回内容为空。")
    return reply


def create_demo_task(payload: DemoTaskRequest) -> DemoTaskResponse:
    result = call_minimax_music(payload)
    ensure_project(payload.projectId, payload.referenceBrief.title, "生成版本")
    return store_demo_task_record(payload, result)


def queue_demo_task(payload: DemoTaskRequest) -> DemoTaskResponse:
    task_id = f"task_{uuid4().hex[:10]}"
    result = DemoTaskResponse(
        taskId=task_id,
        status="queued",
        message="任务已进入后台队列，正在准备生成参数。",
        progress=6,
        lyrics=build_lyrics(payload.prompt, payload.lyrics),
        provider="MiniMax",
    )
    ensure_project(payload.projectId, payload.referenceBrief.title, "生成版本")
    return store_demo_task_record(payload, result)


def run_queued_demo_task(task_id: str, payload: DemoTaskRequest) -> DemoTaskResponse:
    lyrics = build_lyrics(payload.prompt, payload.lyrics)
    audio_base64 = encode_first_audio_attachment(payload)
    model = os.getenv(
        "MINIMAX_AUDIO_MODEL" if audio_base64 else "MINIMAX_MUSIC_MODEL",
        DEFAULT_MINIMAX_AUDIO_MODEL if audio_base64 else DEFAULT_MINIMAX_MUSIC_MODEL,
    )

    store_demo_task_record(
        payload,
        DemoTaskResponse(
            taskId=task_id,
            status="running",
            message=f"正在整理 Prompt 并连接 MiniMax（模型：{model}）。",
            progress=18,
            lyrics=lyrics,
            provider="MiniMax",
        ),
    )

    try:
        store_demo_task_record(
            payload,
            DemoTaskResponse(
                taskId=task_id,
                status="running",
                message=f"请求已发送给 MiniMax，正在等待音频生成（模型：{model}）。",
                progress=42,
                lyrics=lyrics,
                provider="MiniMax",
            ),
        )
        result = call_minimax_music_with_task_id(payload, task_id)
    except Exception as error:
        result = DemoTaskResponse(
            taskId=task_id,
            status="failed",
            message=f"后台生成任务异常：{error}",
            progress=0,
            lyrics=lyrics,
            provider="MiniMax",
        )

    return store_demo_task_record(payload, result)


def get_demo_task(task_id: str) -> DemoTaskResponse | None:
    return get_demo_task_record(task_id)


def list_demo_tasks(project_id: str | None = None) -> list[DemoTaskResponse]:
    return list_demo_task_records(project_id)


def create_share_link(payload: ShareLinkCreateRequest) -> ShareLinkResponse:
    return create_share_link_record(payload.projectId, payload.creatorClientId)


def join_share_link(payload: CollaborationSessionJoinRequest) -> ShareLinkJoinResponse:
    project, session = join_share_link_record(payload.shareToken, payload.collaboratorClientId, payload.collaboratorName)
    return ShareLinkJoinResponse(project=project, session=session)


def list_collaboration_sessions(project_id: str) -> list[CollaborationSessionResponse]:
    return list_collaboration_session_records(project_id)


def get_collaboration_session(session_id: str) -> CollaborationSessionResponse | None:
    return get_collaboration_session_record(session_id)


def update_collaboration_session(session_id: str, payload: CollaborationSessionUpdateRequest) -> CollaborationSessionResponse | None:
    return update_collaboration_session_record(session_id, payload)


# ===== 作品社区 =====
def create_community_post(payload: CommunityPostCreate, client_id: str) -> CommunityPost:
    return create_community_post_record(payload, client_id)


def list_community_posts(client_id: str | None = None) -> list[CommunityPostSummary]:
    return list_community_post_records(client_id)


def get_community_post(post_id: str, client_id: str | None = None) -> CommunityPost | None:
    return get_community_post_record(post_id, client_id)


def add_community_comment(post_id: str, payload: CommunityCommentCreate, client_id: str) -> CommunityComment:
    return insert_community_comment_record(post_id, client_id, payload.authorName, payload.content, payload.parentId)


def toggle_community_like(post_id: str, client_id: str) -> tuple[int, bool]:
    return toggle_community_like_record(post_id, client_id)
