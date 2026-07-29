# Sonic Seed Backend

Python FastAPI backend for Sonic Seed.

## Local Run

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## API Surface

- `GET /api/health`
- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/{project_id}/workspace`
- `PUT /api/projects/{project_id}/workspace`
- `POST /api/share-links`
- `POST /api/share-links/{token}/join`
- `GET /api/projects/{project_id}/collaboration-sessions`
- `GET /api/collaboration-sessions/{session_id}`
- `PATCH /api/collaboration-sessions/{session_id}`
- `POST /api/brief`
- `GET /api/inspirations`
- `POST /api/inspirations`
- `POST /api/uploads`
- `POST /api/demo-tasks`
- `GET /api/demo-tasks`
- `GET /api/demo-tasks/{task_id}`

Set the deployed API URL in the frontend with `VITE_API_BASE_URL`.

For production, add the Netlify frontend domain to `CORS_ORIGINS`; otherwise browsers will block calls from the site to this API.

## Persistence

The backend stores product state in SQLite. Configure the file location with:

```text
SONIC_SEED_DB_PATH=data/sonicseed.sqlite3
```

Core tables:

- `projects`: creation history and shared workspaces. `id` is the stable project identifier used by share links.
- `project_workspaces`: full creator workbench snapshots for each project, including chat messages, AI tags, draft, brief, and versions.
- `inspirations`: inspiration library cards. `project_id` links each card to a project. Attachments and AI tags are stored as JSON.
- `demo_tasks`: generated demo/version history. `id` maps to frontend `taskId`; `trace_id` stores the provider trace ID.
- `share_links`: private handoff links. `token` maps to `/create?project=...&share=...`; `creator_client_id` is used while the product has no login system.
- `collaboration_sessions`: collaborator progress. Each `(share_token, collaborator_client_id)` is unique and stores `status`, `progress`, `last_message`, and `workbench_json`.

Music generation uses MiniMax from the backend only. Configure:

```text
MINIMAX_API_KEY=...
MINIMAX_BASE_URL=https://api.minimaxi.com
MINIMAX_MUSIC_MODEL=music-3.0-free
```

If `MINIMAX_API_KEY` is missing, `/api/demo-tasks` returns a failed task with generated lyrics context instead of pretending a demo was produced.

You can run `python script/test_minimax_music.py --mode text` inside `backend/` to smoke-test the MiniMax API shape without touching the frontend.
