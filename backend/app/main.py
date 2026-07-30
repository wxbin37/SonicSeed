from typing import Optional
from uuid import uuid4

from fastapi import BackgroundTasks, FastAPI, File, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .env_loader import load_local_env
from .schemas import (
    BriefRequest,
    BriefResponse,
    ChatRequest,
    ChatResponse,
    CommunityComment,
    CommunityCommentCreate,
    CommunityLikeRequest,
    CommunityLikeResponse,
    CommunityPost,
    CommunityPostCreate,
    CommunityPostSummary,
    DemoTaskPatchRequest,
    DemoTaskRequest,
    DemoTaskResponse,
    HealthResponse,
    InspirationCard,
    InspirationCreateRequest,
    ProjectWorkspaceResponse,
    ProjectWorkspaceSaveRequest,
    ProjectSummary,
    UploadResponse,
)
from .storage import update_demo_task_name
from .services import (
    add_community_comment,
    build_brief,
    call_minimax_chat,
    create_community_post,
    create_inspiration,
    get_community_post,
    get_demo_task,
    get_project_workspace,
    list_community_posts,
    list_demo_tasks as read_demo_tasks,
    list_inspirations,
    list_projects as read_projects,
    queue_demo_task,
    run_queued_demo_task,
    save_project_workspace,
    toggle_community_like,
    upsert_project,
)
from .upload_store import save_upload_bytes

load_local_env()

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
SUPPORTED_IMAGE_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/heic",
    "image/heif",
}
SUPPORTED_UPLOAD_TYPES = SUPPORTED_AUDIO_TYPES | SUPPORTED_IMAGE_TYPES

app = FastAPI(
    title="Sonic Seed API",
    version="0.1.0",
    description="Python backend for AI inspiration analysis, demo tasks, and collaboration state.",
)

app.add_middleware(
    CORSMiddleware,
    # 前端所有请求均不带 credentials，放行所有来源以便局域网 / 手机访问
    allow_origins=["*"],
    allow_credentials=False,
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


@app.get("/api/projects/{project_id}/workspace", response_model=ProjectWorkspaceResponse)
def read_project_workspace(project_id: str) -> ProjectWorkspaceResponse:
    workspace = get_project_workspace(project_id)
    if workspace is None:
        raise HTTPException(status_code=404, detail="Project workspace not found")

    return workspace


@app.put("/api/projects/{project_id}/workspace", response_model=ProjectWorkspaceResponse)
def write_project_workspace(project_id: str, payload: ProjectWorkspaceSaveRequest) -> ProjectWorkspaceResponse:
    try:
        return save_project_workspace(project_id, payload)
    except PermissionError as error:
        raise HTTPException(status_code=403, detail=str(error)) from error


@app.post("/api/brief", response_model=BriefResponse)
def create_brief(payload: BriefRequest) -> BriefResponse:
    return build_brief(payload)


@app.post("/api/chat", response_model=ChatResponse)
def chat(payload: ChatRequest) -> ChatResponse:
    reply = call_minimax_chat(payload)
    return ChatResponse(reply=reply, source="minimax")


@app.get("/api/inspirations", response_model=list[InspirationCard])
def read_inspirations() -> list[InspirationCard]:
    return list_inspirations()


@app.post("/api/inspirations", response_model=InspirationCard)
def save_inspiration(payload: InspirationCreateRequest) -> InspirationCard:
    return create_inspiration(payload)


@app.post("/api/uploads", response_model=UploadResponse)
async def upload_attachment(file: UploadFile = File(...)) -> UploadResponse:
    content_type = file.content_type or "application/octet-stream"
    if content_type not in SUPPORTED_UPLOAD_TYPES:
        raise HTTPException(status_code=415, detail="Unsupported audio or image format")

    body = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(body) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File is larger than 10 MB")

    upload_id = f"upload_{uuid4().hex[:12]}"
    filename = file.filename or "untitled-audio"
    save_upload_bytes(upload_id, filename, content_type, body)

    return UploadResponse(
        uploadId=upload_id,
        filename=filename,
        contentType=content_type,
        sizeBytes=len(body),
        normalizedFormat="mp3" if content_type in SUPPORTED_AUDIO_TYPES else content_type.split("/", 1)[1],
        nextStep=(
            "Run FFmpeg normalization, melody analysis, then create a DeepSeek Brief."
            if content_type in SUPPORTED_AUDIO_TYPES
            else "Store the image as visual inspiration input."
        ),
    )


@app.post("/api/demo-tasks", response_model=DemoTaskResponse)
def submit_demo_task(payload: DemoTaskRequest, background_tasks: BackgroundTasks) -> DemoTaskResponse:
    task = queue_demo_task(payload)
    background_tasks.add_task(run_queued_demo_task, task.taskId, payload)
    return task


@app.get("/api/demo-tasks", response_model=list[DemoTaskResponse])
def list_demo_tasks(projectId: Optional[str] = None) -> list[DemoTaskResponse]:
    return read_demo_tasks(projectId)


@app.get("/api/demo-tasks/{task_id}", response_model=DemoTaskResponse)
def read_demo_task(task_id: str) -> DemoTaskResponse:
    task = get_demo_task(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    return task


@app.patch("/api/demo-tasks/{task_id}", response_model=DemoTaskResponse)
def patch_demo_task(task_id: str, payload: DemoTaskPatchRequest) -> DemoTaskResponse:
    record = update_demo_task_name(task_id, payload.customName)
    if record is None:
        raise HTTPException(status_code=404, detail="Task not found")

    return record


# ===== 作品社区 =====
@app.get("/api/community/posts", response_model=list[CommunityPostSummary])
def api_list_community_posts(clientId: Optional[str] = Query(default=None)) -> list[CommunityPostSummary]:
    return list_community_posts(clientId or (None))


@app.post("/api/community/posts", response_model=CommunityPost)
def create_community_post_endpoint(payload: CommunityPostCreate, request: Request) -> CommunityPost:
    client_id = request.headers.get("x-client-id") or "anon"
    if not payload.projectId:
        raise HTTPException(status_code=400, detail="projectId 不能为空")

    return create_community_post(payload, client_id)


@app.get("/api/community/posts/{post_id}", response_model=CommunityPost)
def read_community_post(post_id: str, clientId: Optional[str] = Query(default=None)) -> CommunityPost:
    post = get_community_post(post_id, clientId or (None))
    if post is None:
        raise HTTPException(status_code=404, detail="作品不存在或已被删除")

    return post


@app.post("/api/community/posts/{post_id}/comments", response_model=CommunityComment)
def comment_community_post(post_id: str, payload: CommunityCommentCreate, request: Request) -> CommunityComment:
    client_id = request.headers.get("x-client-id") or "anon"
    return add_community_comment(post_id, payload, client_id)


@app.post("/api/community/posts/{post_id}/like", response_model=CommunityLikeResponse)
def like_community_post(post_id: str, payload: CommunityLikeRequest) -> CommunityLikeResponse:
    like_count, liked_by_me = toggle_community_like(post_id, payload.clientId)
    return CommunityLikeResponse(postId=post_id, likeCount=like_count, likedByMe=liked_by_me)
