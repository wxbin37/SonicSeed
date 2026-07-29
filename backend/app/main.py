import os
from typing import Optional
from uuid import uuid4

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .schemas import (
    BriefRequest,
    BriefResponse,
    DemoTaskRequest,
    DemoTaskResponse,
    HealthResponse,
    InspirationCard,
    InspirationCreateRequest,
    ProjectSummary,
    UploadResponse,
)
from .services import (
    build_brief,
    create_demo_task,
    create_inspiration,
    get_demo_task,
    list_demo_tasks as read_demo_tasks,
    list_inspirations,
    list_projects as read_projects,
    upsert_project,
)

MAX_UPLOAD_BYTES = 10 * 1024 * 1024
SUPPORTED_AUDIO_TYPES = {
    "audio/mpeg",
    "audio/mp3",
    "audio/mp4",
    "audio/m4a",
    "audio/x-m4a",
    "audio/wav",
    "audio/wave",
    "audio/x-wav",
    "audio/webm",
}

app = FastAPI(
    title="Sonic Seed API",
    version="0.1.0",
    description="Python backend for AI inspiration analysis, demo tasks, and collaboration state.",
)

cors_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:3010,http://localhost:3011,http://localhost:8888").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(ok=True, service="sonic-seed-api", version="0.1.0")


@app.get("/api/projects", response_model=list[ProjectSummary])
def list_projects() -> list[ProjectSummary]:
    return read_projects()


@app.post("/api/projects", response_model=ProjectSummary)
def save_project(payload: ProjectSummary) -> ProjectSummary:
    return upsert_project(payload)


@app.post("/api/brief", response_model=BriefResponse)
def create_brief(payload: BriefRequest) -> BriefResponse:
    return build_brief(payload)


@app.get("/api/inspirations", response_model=list[InspirationCard])
def read_inspirations() -> list[InspirationCard]:
    return list_inspirations()


@app.post("/api/inspirations", response_model=InspirationCard)
def save_inspiration(payload: InspirationCreateRequest) -> InspirationCard:
    return create_inspiration(payload)


@app.post("/api/uploads", response_model=UploadResponse)
async def upload_audio(file: UploadFile = File(...)) -> UploadResponse:
    content_type = file.content_type or "application/octet-stream"
    if content_type not in SUPPORTED_AUDIO_TYPES:
        raise HTTPException(status_code=415, detail="Unsupported audio format")

    body = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(body) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File is larger than 10 MB")

    return UploadResponse(
        uploadId=f"upload_{uuid4().hex[:12]}",
        filename=file.filename or "untitled-audio",
        contentType=content_type,
        sizeBytes=len(body),
        normalizedFormat="mp3",
        nextStep="Run FFmpeg normalization, melody analysis, then create a DeepSeek Brief.",
    )


@app.post("/api/demo-tasks", response_model=DemoTaskResponse)
def submit_demo_task(payload: DemoTaskRequest) -> DemoTaskResponse:
    return create_demo_task(payload)


@app.get("/api/demo-tasks", response_model=list[DemoTaskResponse])
def list_demo_tasks(projectId: Optional[str] = None) -> list[DemoTaskResponse]:
    return read_demo_tasks(projectId)


@app.get("/api/demo-tasks/{task_id}", response_model=DemoTaskResponse)
def read_demo_task(task_id: str) -> DemoTaskResponse:
    task = get_demo_task(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    return task
