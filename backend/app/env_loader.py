from __future__ import annotations

import os
from pathlib import Path


def parse_env_line(raw_line: str) -> tuple[str, str] | None:
    line = raw_line.strip()
    if not line or line.startswith("#"):
        return None

    if line.startswith("export "):
        line = line.removeprefix("export ").strip()

    if "=" not in line:
        return None

    key, value = line.split("=", 1)
    key = key.strip()
    value = value.strip()
    if not key:
        return None

    if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
        value = value[1:-1]

    return key, value


def load_local_env() -> None:
    backend_root = Path(__file__).resolve().parents[1]
    for env_path in (backend_root / ".env.local", backend_root / ".env"):
        if not env_path.exists():
            continue

        for raw_line in env_path.read_text(encoding="utf-8").splitlines():
            parsed = parse_env_line(raw_line)
            if parsed is None:
                continue

            key, value = parsed
            if value == "":
                continue

            if env_path.name == ".env.local":
                os.environ[key] = value
            else:
                os.environ.setdefault(key, value)
