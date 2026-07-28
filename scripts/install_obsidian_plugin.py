#!/usr/bin/env -S uv run --script
"""Install the verified plugin build and inject its publish token from macOS Keychain."""

from __future__ import annotations

import json
import os
import shutil
import subprocess
from datetime import UTC, datetime
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SOURCE = PROJECT_ROOT / "obsidian-plugin"
DESTINATION = Path(
    "/Users/malovnik/Documents/malovnik-obsidian/.obsidian/plugins/obsidian-share-custom"
)


def main() -> int:
    token = subprocess.run(
        [
            "/usr/bin/security",
            "find-generic-password",
            "-a",
            "obsidian-share-plugin",
            "-s",
            "codex.obsidian-share.publish-token",
            "-w",
        ],
        check=True,
        capture_output=True,
        text=True,
    ).stdout.strip()
    if len(token) < 32:
        raise RuntimeError("Publish token is missing from macOS Keychain")

    DESTINATION.mkdir(mode=0o700, parents=True, exist_ok=True)
    backup = DESTINATION / (
        ".codex-backup-" + datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    )
    backup.mkdir(mode=0o700)
    for name in ("main.js", "manifest.json", "data.json"):
        current = DESTINATION / name
        if current.is_file():
            shutil.copy2(current, backup / name)

    for name in ("main.js", "manifest.json"):
        source = SOURCE / name
        if not source.is_file():
            raise RuntimeError(f"Verified plugin artifact is missing: {source}")
        temporary = DESTINATION / f".{name}.tmp-{os.getpid()}"
        shutil.copy2(source, temporary)
        temporary.chmod(0o644)
        temporary.replace(DESTINATION / name)

    data_path = DESTINATION / "data.json"
    if data_path.is_file():
        data = json.loads(data_path.read_text(encoding="utf-8"))
    else:
        data = {}
    data.update(
        {
            "apiUrl": "https://read.malovnik.ru",
            "publishToken": token,
            "syncOnSave": True,
            "mediaCache": data.get("mediaCache")
            if isinstance(data.get("mediaCache"), dict)
            else {},
        }
    )
    temporary_data = data_path.with_name(f".data.json.tmp-{os.getpid()}")
    temporary_data.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    temporary_data.chmod(0o600)
    temporary_data.replace(data_path)
    token = ""

    manifest = json.loads((DESTINATION / "manifest.json").read_text(encoding="utf-8"))
    print(
        json.dumps(
            {
                "installedVersion": manifest["version"],
                "destination": str(DESTINATION),
                "backup": str(backup),
                "settingsKeys": sorted(data),
            },
            ensure_ascii=False,
            separators=(",", ":"),
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
