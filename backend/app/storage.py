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
    DemoTaskRequest,
    DemoTaskResponse,
    InspirationCard,
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
                """
            )
            ensure_column(connection, "projects", "creator_client_id", "TEXT")

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
                prompt, reference_brief_json, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                updated_at = excluded.updated_at
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
            ),
        )

    return DemoTaskResponse(**{**dump_model(result), "projectId": payload.projectId, "createdAt": created_at})


def get_demo_task_record(task_id: str) -> Optional[DemoTaskResponse]:
    initialize_database()
    with connect() as connection:
        row = connection.execute(
            """
            SELECT id, project_id, status, message, progress, audio_url, lyrics, provider, trace_id, created_at
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
                SELECT id, project_id, status, message, progress, audio_url, lyrics, provider, trace_id, created_at
                FROM demo_tasks
                WHERE project_id = ?
                ORDER BY created_at DESC
                """,
                (project_id,),
            ).fetchall()
        else:
            rows = connection.execute(
                """
                SELECT id, project_id, status, message, progress, audio_url, lyrics, provider, trace_id, created_at
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
