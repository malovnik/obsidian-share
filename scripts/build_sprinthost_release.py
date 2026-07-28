#!/usr/bin/env -S uv run --script
"""Build a verified first-migration archive and one-time HTTPS activator."""

from __future__ import annotations

import hashlib
import json
import os
import shutil
import subprocess
import tarfile
from datetime import UTC, datetime
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
LOCAL_ROOT = PROJECT_ROOT / ".local/sprinthost"
MIGRATION_ROOT = LOCAL_ROOT / "migration"
RELEASES_ROOT = LOCAL_ROOT / "releases"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def copy_application(destination: Path) -> None:
    source = PROJECT_ROOT / "sprinthost/app"
    shutil.copytree(
        source,
        destination,
        ignore=shutil.ignore_patterns("tests", ".DS_Store"),
    )


def main() -> int:
    release_id = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    release_root = RELEASES_ROOT / release_id
    if release_root.exists():
        raise RuntimeError("Release directory already exists")
    release_root.mkdir(mode=0o700, parents=True)

    copy_application(release_root / "app")
    shutil.copytree(
        MIGRATION_ROOT / "data",
        release_root / "data",
        ignore=shutil.ignore_patterns(
            "sessions",
            "rebuild.lock",
            "*.sqlite-wal",
            "*.sqlite-shm",
        ),
    )
    shutil.copytree(MIGRATION_ROOT / "public", release_root / "public")
    shutil.copy2(LOCAL_ROOT / "config.php", release_root / "config.php")
    (release_root / "config.php").chmod(0o600)

    git_head = subprocess.run(
        ["git", "rev-parse", "HEAD"],
        cwd=PROJECT_ROOT,
        check=True,
        capture_output=True,
        text=True,
    ).stdout.strip()
    release_metadata = {
        "releaseId": release_id,
        "builtAt": datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "gitHead": git_head,
        "sourceDumpSha256": (
            PROJECT_ROOT / ".local/backups/railway-2026-07-28.dump.sha256"
        ).read_text(encoding="utf-8").split()[0],
        "migration": json.loads(
            (MIGRATION_ROOT / "migration-manifest.json").read_text(encoding="utf-8")
        ),
    }
    (release_root / "release.json").write_text(
        json.dumps(release_metadata, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    files: dict[str, str] = {}
    for path in sorted(release_root.rglob("*")):
        if path.is_file() and path.name != "manifest.json":
            files[path.relative_to(release_root).as_posix()] = sha256(path)
    (release_root / "manifest.json").write_text(
        json.dumps({"releaseId": release_id, "files": files}, sort_keys=True, indent=2)
        + "\n",
        encoding="utf-8",
    )

    archive_name = f"obsidian-share-{release_id}.tar.gz"
    archive_path = LOCAL_ROOT / archive_name
    # PHP's PharData silently skips some long paths from POSIX PAX archives.
    # GNU long-name records are understood by both GNU tar and PharData.
    with tarfile.open(
        archive_path,
        "w:gz",
        compresslevel=9,
        format=tarfile.GNU_FORMAT,
    ) as archive:
        for path in sorted(release_root.rglob("*")):
            archive.add(path, arcname=path.relative_to(release_root), recursive=False)
    archive_path.chmod(0o600)

    activation_token = os.urandom(32).hex()
    activation_token_path = LOCAL_ROOT / f"activate-{release_id}.token"
    activation_token_path.write_text(activation_token, encoding="ascii")
    activation_token_path.chmod(0o600)
    installer_name = f"activate-{release_id}.php"
    installer_path = LOCAL_ROOT / installer_name
    template = (
        PROJECT_ROOT / "sprinthost/deploy/activate.php.template"
    ).read_text(encoding="utf-8")
    installer = (
        template.replace("__RELEASE_ID__", release_id)
        .replace("__ARCHIVE_NAME__", archive_name)
        .replace("__ARCHIVE_SHA256__", sha256(archive_path))
        .replace(
            "__ACTIVATION_TOKEN_SHA256__",
            hashlib.sha256(activation_token.encode()).hexdigest(),
        )
    )
    installer_path.write_text(installer, encoding="utf-8")
    installer_path.chmod(0o600)
    activation_token = ""

    print(
        json.dumps(
            {
                "releaseId": release_id,
                "archive": str(archive_path),
                "archiveBytes": archive_path.stat().st_size,
                "installer": str(installer_path),
                "tokenFile": str(activation_token_path),
                "manifestFiles": len(files),
            },
            separators=(",", ":"),
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
