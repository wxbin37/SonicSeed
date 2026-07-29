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
- `POST /api/brief`
- `POST /api/uploads`
- `POST /api/demo-tasks`
- `GET /api/demo-tasks/{task_id}`

Set the deployed API URL in the frontend with `VITE_API_BASE_URL`.
