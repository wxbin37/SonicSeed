from __future__ import annotations

import json
import os
from pathlib import Path


def upload_root() -> Path:
    configured_path = os.getenv("SONIC_SEED_UPLOAD_DIR", "data/uploads")
    path = Path(configured_path)
    if path.is_absolute():
        return path

    return Path(__file__).resolve().parents[1] / path


def save_upload_bytes(upload_id: str, filename: str, content_type: str, body: bytes) -> None:
    root = upload_root()
    root.mkdir(parents=True, exist_ok=True)
    (root / f"{upload_id}.bin").write_bytes(body)
    (root / f"{upload_id}.json").write_text(
        json.dumps(
            {
                "uploadId": upload_id,
                "filename": filename,
                "contentType": content_type,
                "sizeBytes": len(body),
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )


def read_upload_bytes(upload_id: str) -> bytes | None:
    if not upload_id.startswith("upload_"):
        return None

    path = upload_root() / f"{upload_id}.bin"
    if not path.exists():
        return None

    return path.read_bytes()
