from __future__ import annotations

from typing import Any, Literal, Optional

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
    creatorClientId: Optional[str] = None


class ProjectWorkspaceSaveRequest(BaseModel):
    clientId: str = Field(min_length=1, max_length=120)
    workbench: dict[str, Any] = Field(default_factory=dict)


class ProjectWorkspaceResponse(BaseModel):
    projectId: str
    clientId: str
    workbench: dict[str, Any]
    updatedAt: str


class ShareLinkCreateRequest(BaseModel):
    projectId: str = Field(min_length=1, max_length=120)
    creatorClientId: str = Field(min_length=1, max_length=120)


class ShareLinkResponse(BaseModel):
    token: str
    projectId: str
    creatorClientId: str
    path: str
    createdAt: str


class CollaborationSessionJoinRequest(BaseModel):
    shareToken: str = Field(min_length=8, max_length=120)
    collaboratorClientId: str = Field(min_length=1, max_length=120)
    collaboratorName: str = Field(default="协作者", min_length=1, max_length=80)


class CollaborationSessionUpdateRequest(BaseModel):
    collaboratorClientId: str = Field(min_length=1, max_length=120)
    collaboratorName: Optional[str] = Field(default=None, max_length=80)
    status: str = Field(default="正在修改", max_length=80)
    progress: int = Field(default=18, ge=0, le=100)
    lastMessage: str = Field(default="", max_length=800)
    workbench: dict[str, Any] = Field(default_factory=dict)


class CollaborationSessionResponse(BaseModel):
    id: str
    projectId: str
    shareToken: str
    creatorClientId: str
    collaboratorClientId: str
    collaboratorName: str
    status: str
    progress: int
    lastMessage: str
    workbench: dict[str, Any]
    createdAt: str
    updatedAt: str


class ShareLinkJoinResponse(BaseModel):
    project: ProjectSummary
    session: CollaborationSessionResponse


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
