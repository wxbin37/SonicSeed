from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field


InputMode = Literal["dialogue", "text", "humming", "image", "voice"]
AttachmentType = Literal["audio", "image", "video", "note"]


class AnalysisTag(BaseModel):
    label: Literal["主题", "情绪", "场景", "适用位置"]
    value: str
    detail: str


class BriefAttachment(BaseModel):
    type: AttachmentType
    name: str = Field(min_length=1, max_length=240)
    uploadId: Optional[str] = Field(default=None, max_length=120)


class BriefRequest(BaseModel):
    projectId: str = Field(min_length=1, max_length=120)
    mode: InputMode
    content: str = Field(default="", max_length=4000)
    attachments: list[BriefAttachment] = Field(default_factory=list, max_length=12)


class BriefResponse(BaseModel):
    title: str
    summary: str
    tags: list[AnalysisTag]
    suggestedStyle: str
    dataFlow: list[str]


class InspirationCreateRequest(BaseModel):
    projectId: str = Field(default="inbox", min_length=1, max_length=120)
    title: str = Field(min_length=1, max_length=120)
    content: str = Field(default="", max_length=4000)
    attachments: list[BriefAttachment] = Field(default_factory=list, max_length=12)
    tags: list[AnalysisTag] = Field(default_factory=list, max_length=12)


class InspirationCard(BaseModel):
    id: str
    projectId: str
    title: str
    content: str
    attachments: list[BriefAttachment]
    tags: list[AnalysisTag]
    createdAt: str


class ProjectSummary(BaseModel):
    id: str
    title: str
    subtitle: str
    status: str
    progress: int
    owner: str
    updated: str


class UploadResponse(BaseModel):
    uploadId: str
    filename: str
    contentType: str
    sizeBytes: int
    normalizedFormat: str
    nextStep: str


class DemoTaskRequest(BaseModel):
    projectId: str = Field(min_length=1, max_length=120)
    prompt: str = Field(default="", max_length=4000)
    referenceBrief: BriefResponse
    lyrics: Optional[str] = Field(default=None, max_length=3500)


class DemoTaskResponse(BaseModel):
    taskId: str
    projectId: Optional[str] = None
    status: Literal["queued", "running", "succeeded", "failed"]
    message: str
    progress: Optional[int] = Field(default=None, ge=0, le=100)
    audioUrl: Optional[str] = None
    lyrics: Optional[str] = None
    provider: Optional[str] = None
    traceId: Optional[str] = None
    createdAt: Optional[str] = None


class HealthResponse(BaseModel):
    ok: bool
    service: str
    version: str
