#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.12"
# dependencies = [
#   "psycopg[binary]>=3.2,<4",
# ]
# ///
"""Create a compact SQLite/media migration snapshot from the Railway PostgreSQL source."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sqlite3
import sys
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import psycopg
from psycopg.rows import dict_row


SAFE_PATH = re.compile(r"^[A-Za-z0-9_-]{1,180}$")
MIME_EXTENSIONS = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--database-url",
        default=os.environ.get("DATABASE_PUBLIC_URL") or os.environ.get("DATABASE_URL"),
        help="Source PostgreSQL URL (defaults to Railway environment variables)",
    )
    parser.add_argument("--output-root", type=Path, required=True)
    parser.add_argument(
        "--schema",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "sprinthost/app/database/schema.sql",
    )
    return parser.parse_args()


def iso(value: Any) -> str | None:
    if value is None:
        return None
    if not isinstance(value, datetime):
        raise TypeError(f"Expected datetime, got {type(value).__name__}")
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def extension_for(mime: str, payload: bytes) -> tuple[str, str]:
    normalized = mime.lower().split(";", 1)[0].strip()
    if normalized in MIME_EXTENSIONS:
        return normalized, MIME_EXTENSIONS[normalized]
    if payload.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png", "png"
    if payload.startswith(b"\xff\xd8\xff"):
        return "image/jpeg", "jpg"
    if payload[:6] in (b"GIF87a", b"GIF89a"):
        return "image/gif", "gif"
    if payload.startswith(b"RIFF") and payload[8:12] == b"WEBP":
        return "image/webp", "webp"
    raise ValueError("Unsupported source image type")


def write_private_file(path: Path, payload: bytes) -> None:
    path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.tmp-{os.getpid()}")
    temporary.write_bytes(payload)
    temporary.chmod(0o600)
    temporary.replace(path)


def canonical_path(slug: str, note_id: str) -> str:
    candidate = f"{slug}-{note_id}" if slug else note_id
    return candidate if SAFE_PATH.fullmatch(candidate) else note_id


def main() -> int:
    args = parse_args()
    if not args.database_url:
        print("A source PostgreSQL URL is required.", file=sys.stderr)
        return 2
    if not args.schema.is_file():
        print("Target SQLite schema is missing.", file=sys.stderr)
        return 2

    output_root = args.output_root.resolve()
    data_dir = output_root / "data"
    public_dir = output_root / "public"
    database_path = data_dir / "obsidian-share.sqlite"
    manifest_path = output_root / "migration-manifest.json"
    if database_path.exists() or manifest_path.exists():
        print("Migration output already exists; refusing to overwrite it.", file=sys.stderr)
        return 2

    data_dir.mkdir(mode=0o700, parents=True, exist_ok=True)
    public_dir.mkdir(mode=0o755, parents=True, exist_ok=True)
    target = sqlite3.connect(database_path)
    target.row_factory = sqlite3.Row
    target.executescript(args.schema.read_text(encoding="utf-8"))

    note_rows: list[dict[str, Any]]
    cover_aliases: dict[str, str] = {}
    md5_to_sha256: dict[str, str] = {}
    unique_media_bytes = 0

    with psycopg.connect(args.database_url, row_factory=dict_row) as source:
        with source.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    id, slug, source_id, title, content, password, expires_at,
                    view_count, unique_view_count, created_at, updated_at,
                    is_deleted, no_index, tags, reading_time, cover_image_id
                FROM notes
                ORDER BY created_at, id
                """
            )
            note_rows = list(cursor.fetchall())

        with target:
            for note in note_rows:
                note_id = str(note["id"])
                slug = str(note["slug"] or "")
                markdown = str(note["content"] or "")
                access_mode = "private" if bool(note["no_index"]) or bool(note["password"]) else "public"
                created_at = iso(note["created_at"]) or datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
                updated_at = iso(note["updated_at"]) or created_at
                expires_at = iso(note["expires_at"])
                tags = [str(tag) for tag in (note["tags"] or []) if str(tag).strip()]
                imported_hash = "import:" + hashlib.sha256(
                    json.dumps(
                        {
                            "id": note_id,
                            "title": str(note["title"]),
                            "markdown": markdown,
                            "accessMode": access_mode,
                            "updatedAt": updated_at,
                        },
                        ensure_ascii=False,
                        separators=(",", ":"),
                    ).encode()
                ).hexdigest()
                target.execute(
                    """
                    INSERT INTO notes (
                        id, source_id, canonical_path, slug, title, markdown, html,
                        content_hash, access_mode, password_hash, no_index, is_deleted,
                        expires_at, tags_json, reading_time, cover_media_hash, revision,
                        view_count, unique_view_count, created_at, updated_at, published_at
                    ) VALUES (
                        ?, ?, ?, ?, ?, ?, '', ?, ?, NULL, ?, ?, ?, ?, ?, NULL, 1,
                        ?, ?, ?, ?, ?
                    )
                    """,
                    (
                        note_id,
                        note["source_id"],
                        canonical_path(slug, note_id),
                        slug or note_id,
                        str(note["title"]),
                        markdown,
                        imported_hash,
                        access_mode,
                        0 if access_mode == "public" else 1,
                        1 if note["is_deleted"] else 0,
                        expires_at,
                        json.dumps(tags, ensure_ascii=False, separators=(",", ":")),
                        max(1, int(note["reading_time"] or 1)),
                        int(note["view_count"] or 0),
                        int(note["unique_view_count"] or 0),
                        created_at,
                        updated_at,
                        created_at,
                    ),
                )
                if note["cover_image_id"]:
                    cover_aliases[note_id] = str(note["cover_image_id"])

        with source.cursor() as cursor:
            cursor.execute(
                """
                SELECT DISTINCT ON (md5(data))
                    md5(data) AS payload_md5,
                    id, filename, data, mime_type, width, height, size, created_at
                FROM images
                ORDER BY md5(data), created_at, id
                """
            )
            unique_images = list(cursor.fetchall())

        with target:
            for image in unique_images:
                payload = bytes(image["data"])
                sha256 = hashlib.sha256(payload).hexdigest()
                mime, extension = extension_for(str(image["mime_type"] or ""), payload)
                md5_to_sha256[str(image["payload_md5"])] = sha256
                unique_media_bytes += len(payload)
                write_private_file(data_dir / "media" / sha256[:2] / f"{sha256}.{extension}", payload)
                target.execute(
                    """
                    INSERT OR IGNORE INTO media (
                        hash, extension, mime_type, filename, size, width, height, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        sha256,
                        extension,
                        mime,
                        str(image["filename"] or f"image.{extension}")[:180],
                        len(payload),
                        image["width"],
                        image["height"],
                        iso(image["created_at"]) or datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
                    ),
                )
                target.execute(
                    "INSERT OR IGNORE INTO media_aliases (legacy_id, media_hash) VALUES (?, ?)",
                    (sha256, sha256),
                )

        legacy_image_rows = 0
        with source.cursor(name="image-aliases") as cursor:
            cursor.execute("SELECT id, md5(data) AS payload_md5 FROM images ORDER BY id")
            with target:
                for row in cursor:
                    legacy_image_rows += 1
                    sha256 = md5_to_sha256[str(row["payload_md5"])]
                    target.execute(
                        """
                        INSERT INTO media_aliases (legacy_id, media_hash)
                        VALUES (?, ?)
                        ON CONFLICT(legacy_id) DO UPDATE SET media_hash = excluded.media_hash
                        """,
                        (str(row["id"]), sha256),
                    )

        with target:
            for note_id, legacy_cover_id in cover_aliases.items():
                row = target.execute(
                    "SELECT media_hash FROM media_aliases WHERE legacy_id = ?",
                    (legacy_cover_id,),
                ).fetchone()
                if row is not None:
                    target.execute(
                        "UPDATE notes SET cover_media_hash = ? WHERE id = ?",
                        (str(row["media_hash"]), note_id),
                    )

        with source.cursor() as cursor:
            cursor.execute("SELECT count(*) AS count FROM note_views")
            source_note_views = int(cursor.fetchone()["count"])

    with target:
        metadata = {
            "source_notes": str(len(note_rows)),
            "source_image_rows": str(legacy_image_rows),
            "unique_media_payloads": str(len(md5_to_sha256)),
            "source_note_views_not_copied": str(source_note_views),
            "migration_created_at": datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
        }
        target.executemany(
            """
            INSERT INTO application_meta (key, value) VALUES (?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
            """,
            metadata.items(),
        )

    integrity = target.execute("PRAGMA integrity_check").fetchone()[0]
    counts = {
        "notes": int(target.execute("SELECT count(*) FROM notes").fetchone()[0]),
        "activePublic": int(
            target.execute(
                "SELECT count(*) FROM notes WHERE is_deleted = 0 AND access_mode = 'public'"
            ).fetchone()[0]
        ),
        "activePrivate": int(
            target.execute(
                "SELECT count(*) FROM notes WHERE is_deleted = 0 AND access_mode = 'private'"
            ).fetchone()[0]
        ),
        "deleted": int(target.execute("SELECT count(*) FROM notes WHERE is_deleted = 1").fetchone()[0]),
        "legacyImageAliases": legacy_image_rows,
        "uniqueMedia": int(target.execute("SELECT count(*) FROM media").fetchone()[0]),
        "uniqueMediaBytes": unique_media_bytes,
        "sourceNoteViewsNotCopied": source_note_views,
        "sqliteIntegrity": integrity,
    }
    target.close()
    database_path.chmod(0o600)

    manifest = {
        "createdAt": datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "counts": counts,
        "databaseSha256": hashlib.sha256(database_path.read_bytes()).hexdigest(),
        "privacy": "Raw viewer IP history was intentionally not copied.",
    }
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    manifest_path.chmod(0o600)

    print(json.dumps(counts, ensure_ascii=False, separators=(",", ":")))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
