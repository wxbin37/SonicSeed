from typing import Literal

from pydantic import BaseModel, Field


InputMode = Literal["dialogue", "text", "humming", "image", "voice"]
AttachmentType = Literal["audio", "image", "note"]


class AnalysisTag(BaseModel):
    label: Literal["主题", "情绪", "场景", "适用位置"]
    value: str
    detail: str


class BriefAttachment(BaseModel):
    type: AttachmentType
    name: str = Field(min_length=1, max_length=240)
    uploadId: str | None = Field(default=None, max_length=120)


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


class DemoTaskResponse(BaseModel):
    taskId: str
    status: Literal["queued", "running", "succeeded", "failed"]
    message: str
    progress: int | None = Field(default=None, ge=0, le=100)
    audioUrl: str | None = None


class HealthResponse(BaseModel):
    ok: bool
    service: str
    version: str
