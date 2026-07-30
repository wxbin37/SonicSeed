from __future__ import annotations

import json
import os
import secrets
import sqlite3
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from .schemas import (
    BriefAttachment,
    BriefResponse,
    CollaborationSessionResponse,
    CollaborationSessionUpdateRequest,
    CommunityComment,
    CommunityDemoVersion,
    CommunityPost,
    CommunityPostSummary,
    DemoTaskRequest,
    DemoTaskResponse,
    InspirationCard,
    ProjectWorkspaceResponse,
    ProjectWorkspaceSaveRequest,
    ProjectSummary,
    ShareLinkResponse,
)


_INIT_LOCK = threading.Lock()
_INITIALIZED = False


def utc_now_label() -> str:
    return datetime.now(timezone.utc).isoformat()


def database_path() -> Path:
    configured_path = os.getenv("SONIC_SEED_DB_PATH", "data/sonicseed.sqlite3")
    path = Path(configured_path)
    if path.is_absolute():
        return path

    return Path(__file__).resolve().parents[1] / path


def connect() -> sqlite3.Connection:
    path = database_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(path)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def initialize_database() -> None:
    global _INITIALIZED
    if _INITIALIZED:
        return

    with _INIT_LOCK:
        if _INITIALIZED:
            return

        with connect() as connection:
            connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS projects (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    subtitle TEXT NOT NULL,
                    status TEXT NOT NULL,
                    progress INTEGER NOT NULL DEFAULT 0,
                    owner TEXT NOT NULL DEFAULT '我',
                    updated TEXT NOT NULL DEFAULT '刚刚',
                    creator_client_id TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS inspirations (
                    id TEXT PRIMARY KEY,
                    project_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    content TEXT NOT NULL,
                    attachments_json TEXT NOT NULL DEFAULT '[]',
                    tags_json TEXT NOT NULL DEFAULT '[]',
                    created_at TEXT NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_inspirations_project_created
                ON inspirations(project_id, created_at DESC);

                CREATE TABLE IF NOT EXISTS demo_tasks (
                    id TEXT PRIMARY KEY,
                    project_id TEXT NOT NULL,
                    status TEXT NOT NULL,
                    message TEXT NOT NULL,
                    progress INTEGER,
                    audio_url TEXT,
                    lyrics TEXT,
                    provider TEXT,
                    trace_id TEXT,
                    prompt TEXT NOT NULL,
                    reference_brief_json TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_demo_tasks_project_created
                ON demo_tasks(project_id, created_at DESC);

                CREATE TABLE IF NOT EXISTS project_workspaces (
                    project_id TEXT PRIMARY KEY,
                    client_id TEXT NOT NULL,
                    workbench_json TEXT NOT NULL DEFAULT '{}',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS share_links (
                    token TEXT PRIMARY KEY,
                    project_id TEXT NOT NULL,
                    creator_client_id TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'active',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_share_links_project
                ON share_links(project_id, created_at DESC);

                CREATE TABLE IF NOT EXISTS collaboration_sessions (
                    id TEXT PRIMARY KEY,
                    share_token TEXT NOT NULL,
                    project_id TEXT NOT NULL,
                    creator_client_id TEXT NOT NULL,
                    collaborator_client_id TEXT NOT NULL,
                    collaborator_name TEXT NOT NULL,
                    status TEXT NOT NULL,
                    progress INTEGER NOT NULL DEFAULT 0,
                    last_message TEXT NOT NULL DEFAULT '',
                    workbench_json TEXT NOT NULL DEFAULT '{}',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    UNIQUE(share_token, collaborator_client_id)
                );

                CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_project
                ON collaboration_sessions(project_id, updated_at DESC);

                CREATE TABLE IF NOT EXISTS community_posts (
                    id TEXT PRIMARY KEY,
                    project_id TEXT NOT NULL,
                    author_client_id TEXT NOT NULL,
                    author_name TEXT NOT NULL,
                    title TEXT NOT NULL,
                    description TEXT NOT NULL DEFAULT '',
                    demo_version_ids_json TEXT NOT NULL DEFAULT '[]',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_community_posts_project
                ON community_posts(project_id, created_at DESC);

                CREATE TABLE IF NOT EXISTS community_comments (
                    id TEXT PRIMARY KEY,
                    post_id TEXT NOT NULL,
                    parent_id TEXT,
                    author_client_id TEXT NOT NULL,
                    author_name TEXT NOT NULL,
                    content TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_community_comments_post
                ON community_comments(post_id, created_at ASC);

                CREATE TABLE IF NOT EXISTS community_likes (
                    post_id TEXT NOT NULL,
                    client_id TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    PRIMARY KEY (post_id, client_id)
                );
                """
            )
            ensure_column(connection, "projects", "creator_client_id", "TEXT")
            ensure_column(connection, "demo_tasks", "custom_name", "TEXT")

        _INITIALIZED = True


def ensure_column(connection: sqlite3.Connection, table: str, column: str, declaration: str) -> None:
    columns = {row["name"] for row in connection.execute(f"PRAGMA table_info({table})").fetchall()}
    if column not in columns:
        connection.execute(f"ALTER TABLE {table} ADD COLUMN {column} {declaration}")


def dump_model(value: object) -> dict:
    if hasattr(value, "model_dump"):
        return value.model_dump()  # type: ignore[no-any-return]
    if hasattr(value, "dict"):
        return value.dict()  # type: ignore[no-any-return]
    return dict(value)  # type: ignore[arg-type]


def dump_models(values: list[object]) -> str:
    return json.dumps([dump_model(value) for value in values], ensure_ascii=False)


def dump_brief(value: BriefResponse) -> str:
    return json.dumps(dump_model(value), ensure_ascii=False)


def parse_json_list(raw: str | None) -> list[dict]:
    if not raw:
        return []

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return []

    return parsed if isinstance(parsed, list) else []


def parse_json_dict(raw: str | None) -> dict:
    if not raw:
        return {}

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return {}

    return parsed if isinstance(parsed, dict) else {}


def project_from_row(row: sqlite3.Row) -> ProjectSummary:
    return ProjectSummary(
        id=row["id"],
        title=row["title"],
        subtitle=row["subtitle"],
        status=row["status"],
        progress=row["progress"],
        owner=row["owner"],
        updated=row["updated"],
        creatorClientId=row["creator_client_id"],
    )


def inspiration_from_row(row: sqlite3.Row) -> InspirationCard:
    return InspirationCard(
        id=row["id"],
        projectId=row["project_id"],
        title=row["title"],
        content=row["content"],
        attachments=[BriefAttachment(**item) for item in parse_json_list(row["attachments_json"])],
        tags=parse_json_list(row["tags_json"]),
        createdAt=row["created_at"],
    )


def demo_task_from_row(row: sqlite3.Row) -> DemoTaskResponse:
    return DemoTaskResponse(
        taskId=row["id"],
        projectId=row["project_id"],
        status=row["status"],
        message=row["message"],
        progress=row["progress"],
        audioUrl=row["audio_url"],
        lyrics=row["lyrics"],
        provider=row["provider"],
        traceId=row["trace_id"],
        createdAt=row["created_at"],
        customName=row.get("custom_name"),
    )


def share_link_from_row(row: sqlite3.Row) -> ShareLinkResponse:
    return ShareLinkResponse(
        token=row["token"],
        projectId=row["project_id"],
        creatorClientId=row["creator_client_id"],
        path=f"/create?project={row['project_id']}&share={row['token']}",
        createdAt=row["created_at"],
    )


def collaboration_session_from_row(row: sqlite3.Row) -> CollaborationSessionResponse:
    return CollaborationSessionResponse(
        id=row["id"],
        projectId=row["project_id"],
        shareToken=row["share_token"],
        creatorClientId=row["creator_client_id"],
        collaboratorClientId=row["collaborator_client_id"],
        collaboratorName=row["collaborator_name"],
        status=row["status"],
        progress=row["progress"],
        lastMessage=row["last_message"],
        workbench=parse_json_dict(row["workbench_json"]),
        createdAt=row["created_at"],
        updatedAt=row["updated_at"],
    )


def project_workspace_from_row(row: sqlite3.Row) -> ProjectWorkspaceResponse:
    return ProjectWorkspaceResponse(
        projectId=row["project_id"],
        clientId=row["client_id"],
        workbench=parse_json_dict(row["workbench_json"]),
        updatedAt=row["updated_at"],
    )


def list_project_records() -> list[ProjectSummary]:
    initialize_database()
    with connect() as connection:
        rows = connection.execute(
            """
            SELECT id, title, subtitle, status, progress, owner, updated, creator_client_id
            FROM projects
            ORDER BY updated_at DESC, created_at DESC
            """
        ).fetchall()

    return [project_from_row(row) for row in rows]


def upsert_project_record(payload: ProjectSummary) -> ProjectSummary:
    initialize_database()
    now = utc_now_label()
    with connect() as connection:
        existing = connection.execute("SELECT created_at FROM projects WHERE id = ?", (payload.id,)).fetchone()
        created_at = existing["created_at"] if existing else now
        connection.execute(
            """
            INSERT INTO projects (id, title, subtitle, status, progress, owner, updated, creator_client_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                title = excluded.title,
                subtitle = excluded.subtitle,
                status = excluded.status,
                progress = excluded.progress,
                owner = excluded.owner,
                updated = excluded.updated,
                creator_client_id = COALESCE(projects.creator_client_id, excluded.creator_client_id),
                updated_at = excluded.updated_at
            """,
            (
                payload.id,
                payload.title,
                payload.subtitle,
                payload.status,
                payload.progress,
                payload.owner,
                payload.updated,
                payload.creatorClientId,
                created_at,
                now,
            ),
        )

    return payload


def project_exists(project_id: str) -> bool:
    initialize_database()
    with connect() as connection:
        row = connection.execute("SELECT 1 FROM projects WHERE id = ?", (project_id,)).fetchone()

    return row is not None


def get_project_record(project_id: str) -> Optional[ProjectSummary]:
    initialize_database()
    with connect() as connection:
        row = connection.execute(
            """
            SELECT id, title, subtitle, status, progress, owner, updated, creator_client_id
            FROM projects
            WHERE id = ?
            """,
            (project_id,),
        ).fetchone()

    return project_from_row(row) if row else None


def get_project_workspace_record(project_id: str) -> Optional[ProjectWorkspaceResponse]:
    initialize_database()
    with connect() as connection:
        row = connection.execute(
            """
            SELECT project_id, client_id, workbench_json, updated_at
            FROM project_workspaces
            WHERE project_id = ?
            """,
            (project_id,),
        ).fetchone()

    return project_workspace_from_row(row) if row else None


def upsert_project_workspace_record(project_id: str, payload: ProjectWorkspaceSaveRequest) -> ProjectWorkspaceResponse:
    initialize_database()
    now = utc_now_label()
    with connect() as connection:
        project = connection.execute(
            "SELECT creator_client_id FROM projects WHERE id = ?",
            (project_id,),
        ).fetchone()
        if project is None:
            connection.execute(
                """
                INSERT INTO projects (id, title, subtitle, status, progress, owner, updated, creator_client_id, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (project_id, "未命名创作", "来自工作台", "创作中", 10, "我", "刚刚", payload.clientId, now, now),
            )
        else:
            existing_creator = project["creator_client_id"]
            if existing_creator and existing_creator != payload.clientId:
                raise PermissionError("Only the project creator can update the project workspace")
            if not existing_creator:
                connection.execute(
                    "UPDATE projects SET creator_client_id = ?, updated_at = ? WHERE id = ?",
                    (payload.clientId, now, project_id),
                )

        existing = connection.execute("SELECT created_at FROM project_workspaces WHERE project_id = ?", (project_id,)).fetchone()
        created_at = existing["created_at"] if existing else now
        connection.execute(
            """
            INSERT INTO project_workspaces (project_id, client_id, workbench_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(project_id) DO UPDATE SET
                client_id = excluded.client_id,
                workbench_json = excluded.workbench_json,
                updated_at = excluded.updated_at
            """,
            (project_id, payload.clientId, json.dumps(payload.workbench, ensure_ascii=False), created_at, now),
        )
        row = connection.execute(
            """
            SELECT project_id, client_id, workbench_json, updated_at
            FROM project_workspaces
            WHERE project_id = ?
            """,
            (project_id,),
        ).fetchone()

    return project_workspace_from_row(row)


def list_inspiration_records() -> list[InspirationCard]:
    initialize_database()
    with connect() as connection:
        rows = connection.execute(
            """
            SELECT id, project_id, title, content, attachments_json, tags_json, created_at
            FROM inspirations
            ORDER BY created_at DESC
            """
        ).fetchall()

    return [inspiration_from_row(row) for row in rows]


def insert_inspiration_record(payload: InspirationCard) -> InspirationCard:
    initialize_database()
    with connect() as connection:
        connection.execute(
            """
            INSERT INTO inspirations (id, project_id, title, content, attachments_json, tags_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                payload.id,
                payload.projectId,
                payload.title,
                payload.content,
                dump_models(payload.attachments),
                dump_models(payload.tags),
                payload.createdAt,
            ),
        )

    return payload


def store_demo_task_record(payload: DemoTaskRequest, result: DemoTaskResponse) -> DemoTaskResponse:
    initialize_database()
    now = utc_now_label()
    with connect() as connection:
        existing = connection.execute("SELECT created_at FROM demo_tasks WHERE id = ?", (result.taskId,)).fetchone()
        created_at = existing["created_at"] if existing else now
        connection.execute(
            """
            INSERT INTO demo_tasks (
                id, project_id, status, message, progress, audio_url, lyrics, provider, trace_id,
                prompt, reference_brief_json, created_at, updated_at, custom_name
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                status = excluded.status,
                message = excluded.message,
                progress = excluded.progress,
                audio_url = excluded.audio_url,
                lyrics = excluded.lyrics,
                provider = excluded.provider,
                trace_id = excluded.trace_id,
                prompt = excluded.prompt,
                reference_brief_json = excluded.reference_brief_json,
                updated_at = excluded.updated_at,
                custom_name = excluded.custom_name
            """,
            (
                result.taskId,
                payload.projectId,
                result.status,
                result.message,
                result.progress,
                result.audioUrl,
                result.lyrics,
                result.provider,
                result.traceId,
                payload.prompt,
                dump_brief(payload.referenceBrief),
                created_at,
                now,
                payload.customName,
            ),
        )

    return DemoTaskResponse(**{**dump_model(result), "projectId": payload.projectId, "createdAt": created_at})


def update_demo_task_name(task_id: str, name: str | None) -> DemoTaskResponse | None:
    initialize_database()
    now = utc_now_label()
    with connect() as connection:
        connection.execute(
            "UPDATE demo_tasks SET custom_name = ?, updated_at = ? WHERE id = ?",
            (name, now, task_id),
        )
    return get_demo_task_record(task_id)


def get_demo_task_record(task_id: str) -> Optional[DemoTaskResponse]:
    initialize_database()
    with connect() as connection:
        row = connection.execute(
            """
                SELECT id, project_id, status, message, progress, audio_url, lyrics, provider, trace_id, created_at, custom_name
                FROM demo_tasks
                WHERE id = ?
            """,
            (task_id,),
        ).fetchone()

    return demo_task_from_row(row) if row else None


def list_demo_task_records(project_id: Optional[str] = None) -> list[DemoTaskResponse]:
    initialize_database()
    with connect() as connection:
        if project_id:
            rows = connection.execute(
                """
                SELECT id, project_id, status, message, progress, audio_url, lyrics, provider, trace_id, created_at, custom_name
                FROM demo_tasks
                WHERE project_id = ?
                ORDER BY created_at DESC
                """,
                (project_id,),
            ).fetchall()
        else:
            rows = connection.execute(
                """
                SELECT id, project_id, status, message, progress, audio_url, lyrics, provider, trace_id, created_at, custom_name
                FROM demo_tasks
                ORDER BY created_at DESC
                """
            ).fetchall()

    return [demo_task_from_row(row) for row in rows]


def create_share_link_record(project_id: str, creator_client_id: str) -> ShareLinkResponse:
    initialize_database()
    now = utc_now_label()
    token = secrets.token_urlsafe(18)

    with connect() as connection:
        project = connection.execute(
            "SELECT id, title, subtitle, status, progress, owner, updated, creator_client_id FROM projects WHERE id = ?",
            (project_id,),
        ).fetchone()
        if project is None:
            connection.execute(
                """
                INSERT INTO projects (id, title, subtitle, status, progress, owner, updated, creator_client_id, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (project_id, "未命名创作", "来自私域分享", "可接力", 10, "我", "刚刚", creator_client_id, now, now),
            )
        else:
            existing_creator = project["creator_client_id"]
            if existing_creator and existing_creator != creator_client_id:
                raise PermissionError("Only the project creator can create share links")
            if not existing_creator:
                connection.execute(
                    "UPDATE projects SET creator_client_id = ?, updated_at = ? WHERE id = ?",
                    (creator_client_id, now, project_id),
                )

        connection.execute(
            """
            INSERT INTO share_links (token, project_id, creator_client_id, status, created_at, updated_at)
            VALUES (?, ?, ?, 'active', ?, ?)
            """,
            (token, project_id, creator_client_id, now, now),
        )
        row = connection.execute(
            """
            SELECT token, project_id, creator_client_id, created_at
            FROM share_links
            WHERE token = ?
            """,
            (token,),
        ).fetchone()

    return share_link_from_row(row)


def get_share_link_record(token: str) -> Optional[ShareLinkResponse]:
    initialize_database()
    with connect() as connection:
        row = connection.execute(
            """
            SELECT token, project_id, creator_client_id, created_at
            FROM share_links
            WHERE token = ? AND status = 'active'
            """,
            (token,),
        ).fetchone()

    return share_link_from_row(row) if row else None


def join_share_link_record(token: str, collaborator_client_id: str, collaborator_name: str) -> tuple[ProjectSummary, CollaborationSessionResponse]:
    initialize_database()
    now = utc_now_label()
    with connect() as connection:
        link = connection.execute(
            """
            SELECT token, project_id, creator_client_id
            FROM share_links
            WHERE token = ? AND status = 'active'
            """,
            (token,),
        ).fetchone()
        if link is None:
            raise LookupError("Share link not found")

        session_id = f"session_{secrets.token_urlsafe(10)}"
        connection.execute(
            """
            INSERT INTO collaboration_sessions (
                id, share_token, project_id, creator_client_id, collaborator_client_id, collaborator_name,
                status, progress, last_message, workbench_json, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(share_token, collaborator_client_id) DO UPDATE SET
                collaborator_name = excluded.collaborator_name,
                status = CASE
                    WHEN collaboration_sessions.status = '等待接力' THEN excluded.status
                    ELSE collaboration_sessions.status
                END,
                updated_at = excluded.updated_at
            """,
            (
                session_id,
                token,
                link["project_id"],
                link["creator_client_id"],
                collaborator_client_id,
                collaborator_name,
                "已进入工作台",
                8,
                "打开了私域接力链接",
                "{}",
                now,
                now,
            ),
        )
        session = connection.execute(
            """
            SELECT id, share_token, project_id, creator_client_id, collaborator_client_id, collaborator_name,
                   status, progress, last_message, workbench_json, created_at, updated_at
            FROM collaboration_sessions
            WHERE share_token = ? AND collaborator_client_id = ?
            """,
            (token, collaborator_client_id),
        ).fetchone()
        project = connection.execute(
            """
            SELECT id, title, subtitle, status, progress, owner, updated, creator_client_id
            FROM projects
            WHERE id = ?
            """,
            (link["project_id"],),
        ).fetchone()

    return project_from_row(project), collaboration_session_from_row(session)


def list_collaboration_session_records(project_id: str) -> list[CollaborationSessionResponse]:
    initialize_database()
    with connect() as connection:
        rows = connection.execute(
            """
            SELECT id, share_token, project_id, creator_client_id, collaborator_client_id, collaborator_name,
                   status, progress, last_message, workbench_json, created_at, updated_at
            FROM collaboration_sessions
            WHERE project_id = ?
            ORDER BY updated_at DESC, created_at DESC
            """,
            (project_id,),
        ).fetchall()

    return [collaboration_session_from_row(row) for row in rows]


def get_collaboration_session_record(session_id: str) -> Optional[CollaborationSessionResponse]:
    initialize_database()
    with connect() as connection:
        row = connection.execute(
            """
            SELECT id, share_token, project_id, creator_client_id, collaborator_client_id, collaborator_name,
                   status, progress, last_message, workbench_json, created_at, updated_at
            FROM collaboration_sessions
            WHERE id = ?
            """,
            (session_id,),
        ).fetchone()

    return collaboration_session_from_row(row) if row else None


def update_collaboration_session_record(session_id: str, payload: CollaborationSessionUpdateRequest) -> Optional[CollaborationSessionResponse]:
    initialize_database()
    now = utc_now_label()
    with connect() as connection:
        existing = connection.execute(
            "SELECT collaborator_client_id FROM collaboration_sessions WHERE id = ?",
            (session_id,),
        ).fetchone()
        if existing is None:
            return None
        if existing["collaborator_client_id"] != payload.collaboratorClientId:
            raise PermissionError("Only the collaborator can update this session")

        connection.execute(
            """
            UPDATE collaboration_sessions
            SET collaborator_name = COALESCE(?, collaborator_name),
                status = ?,
                progress = ?,
                last_message = ?,
                workbench_json = ?,
                updated_at = ?
            WHERE id = ?
            """,
            (
                payload.collaboratorName,
                payload.status,
                payload.progress,
                payload.lastMessage,
                json.dumps(payload.workbench, ensure_ascii=False),
                now,
                session_id,
            ),
        )
        row = connection.execute(
            """
            SELECT id, share_token, project_id, creator_client_id, collaborator_client_id, collaborator_name,
                   status, progress, last_message, workbench_json, created_at, updated_at
            FROM collaboration_sessions
            WHERE id = ?
            """,
            (session_id,),
        ).fetchone()

    return collaboration_session_from_row(row)


# ===== 作品社区 =====
def list_community_post_records(client_id=None):
    initialize_database()
    with connect() as connection:
        rows = connection.execute(
            """
            SELECT id, project_id, author_client_id, author_name, title, description, created_at
            FROM community_posts
            ORDER BY created_at DESC
            """
        ).fetchall()
        result = []
        for row in rows:
            likes = connection.execute(
                "SELECT COUNT(*) AS c FROM community_likes WHERE post_id = ?", (row["id"],)
            ).fetchone()["c"]
            comments = connection.execute(
                "SELECT COUNT(*) AS c FROM community_comments WHERE post_id = ?", (row["id"],)
            ).fetchone()["c"]
            demos = connection.execute(
                "SELECT COUNT(*) AS c FROM demo_tasks WHERE project_id = ?", (row["project_id"],)
            ).fetchone()["c"]
            liked = False
            if client_id:
                liked = (
                    connection.execute(
                        "SELECT 1 FROM community_likes WHERE post_id = ? AND client_id = ?",
                        (row["id"], client_id),
                    ).fetchone()
                    is not None
                )
            result.append(
                CommunityPostSummary(
                    id=row["id"],
                    projectId=row["project_id"],
                    authorName=row["author_name"],
                    title=row["title"],
                    description=row["description"],
                    demoVersionCount=demos,
                    likeCount=likes,
                    likedByMe=liked,
                    commentCount=comments,
                    createdAt=row["created_at"],
                )
            )
    return result


def get_community_post_record(post_id, client_id=None):
    initialize_database()
    with connect() as connection:
        row = connection.execute(
            """
            SELECT id, project_id, author_client_id, author_name, title, description, created_at
            FROM community_posts WHERE id = ?
            """,
            (post_id,),
        ).fetchone()
        if row is None:
            return None
        likes = connection.execute(
            "SELECT COUNT(*) AS c FROM community_likes WHERE post_id = ?", (post_id,)
        ).fetchone()["c"]
        comments = connection.execute(
            "SELECT COUNT(*) AS c FROM community_comments WHERE post_id = ?", (post_id,)
        ).fetchone()["c"]
        liked = False
        if client_id:
            liked = (
                connection.execute(
                    "SELECT 1 FROM community_likes WHERE post_id = ? AND client_id = ?",
                    (post_id, client_id),
                ).fetchone()
                is not None
            )
        demo_rows = connection.execute(
            """
            SELECT id, project_id, status, message, progress, audio_url, lyrics, created_at
            FROM demo_tasks WHERE project_id = ? ORDER BY created_at ASC
            """,
            (row["project_id"],),
        ).fetchall()
        demo_versions = [
            CommunityDemoVersion(
                taskId=d["id"],
                title=(d["prompt"] or d["message"] or "未命名版本")[:80],
                audioUrl=d["audio_url"],
                lyrics=d["lyrics"],
                progress=d["progress"],
                createdAt=d["created_at"],
            )
            for d in demo_rows
        ]
        return CommunityPost(
            id=row["id"],
            projectId=row["project_id"],
            authorClientId=row["author_client_id"],
            authorName=row["author_name"],
            title=row["title"],
            description=row["description"],
            demoVersions=demo_versions,
            comments=list_community_comment_records(post_id),
            likeCount=likes,
            likedByMe=liked,
            commentCount=comments,
            createdAt=row["created_at"],
        )


def create_community_post_record(payload, author_client_id):
    initialize_database()
    now = utc_now_label()
    post_id = f"post_{secrets.token_urlsafe(10)}"
    with connect() as connection:
        connection.execute(
            """
            INSERT INTO community_posts
                (id, project_id, author_client_id, author_name, title, description, demo_version_ids_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, '[]', ?, ?)
            """,
            (post_id, payload.projectId, author_client_id, payload.authorName, payload.title, payload.description, now, now),
        )
    return get_community_post_record(post_id, author_client_id)


def insert_community_comment_record(post_id, author_client_id, author_name, content, parent_id):
    initialize_database()
    now = utc_now_label()
    comment_id = f"cmt_{secrets.token_urlsafe(10)}"
    with connect() as connection:
        connection.execute(
            """
            INSERT INTO community_comments (id, post_id, parent_id, author_client_id, author_name, content, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (comment_id, post_id, parent_id, author_client_id, author_name, content, now),
        )
        row = connection.execute(
            """
            SELECT id, post_id, parent_id, author_client_id, author_name, content, created_at
            FROM community_comments WHERE id = ?
            """,
            (comment_id,),
        ).fetchone()
    return CommunityComment(
        id=row["id"],
        postId=row["post_id"],
        parentId=row["parent_id"],
        authorName=row["author_name"],
        content=row["content"],
        createdAt=row["created_at"],
    )


def list_community_comment_records(post_id):
    initialize_database()
    with connect() as connection:
        rows = connection.execute(
            """
            SELECT id, post_id, parent_id, author_client_id, author_name, content, created_at
            FROM community_comments WHERE post_id = ? ORDER BY created_at ASC
            """,
            (post_id,),
        ).fetchall()
    return [
        CommunityComment(
            id=r["id"],
            postId=r["post_id"],
            parentId=r["parent_id"],
            authorName=r["author_name"],
            content=r["content"],
            createdAt=r["created_at"],
        )
        for r in rows
    ]


def toggle_community_like_record(post_id, client_id):
    initialize_database()
    with connect() as connection:
        existing = connection.execute(
            "SELECT 1 FROM community_likes WHERE post_id = ? AND client_id = ?", (post_id, client_id)
        ).fetchone()
        if existing:
            connection.execute(
                "DELETE FROM community_likes WHERE post_id = ? AND client_id = ?", (post_id, client_id)
            )
            liked = False
        else:
            connection.execute(
                "INSERT INTO community_likes (post_id, client_id, created_at) VALUES (?, ?, ?)",
                (post_id, client_id, utc_now_label()),
            )
            liked = True
        like_count = connection.execute(
            "SELECT COUNT(*) AS c FROM community_likes WHERE post_id = ?", (post_id,)
        ).fetchone()["c"]
    return like_count, liked
