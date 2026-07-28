#!/usr/bin/env -S uv run --script
"""Bounded black-box acceptance checks for the SprintHost application."""

from __future__ import annotations

import argparse
import html as html_module
import http.cookiejar
import json
import os
import re
import sqlite3
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", required=True)
    parser.add_argument("--database", type=Path, required=True)
    parser.add_argument("--project-root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--with-admin", action="store_true")
    return parser.parse_args()


class Client:
    def __init__(self, base_url: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.cookies = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(self.cookies)
        )

    def request(
        self,
        path: str,
        *,
        method: str = "GET",
        headers: dict[str, str] | None = None,
        data: bytes | None = None,
    ) -> tuple[int, dict[str, str], bytes]:
        request = urllib.request.Request(
            self.base_url + path,
            method=method,
            data=data,
            headers={"User-Agent": "obsidian-share-acceptance/1.0", **(headers or {})},
        )
        try:
            with self.opener.open(request, timeout=20) as response:
                return response.status, dict(response.headers.items()), response.read()
        except urllib.error.HTTPError as error:
            return error.code, dict(error.headers.items()), error.read()


def require(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


def keychain_publish_token() -> str:
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
    require(len(token) >= 32, "Publish token is unavailable")
    return token


def private_password() -> str:
    password = os.environ.get("PRIVATE_NOTE_PASSWORD", "")
    if password:
        return password
    password = subprocess.run(
        [
            "/usr/bin/security",
            "find-generic-password",
            "-a",
            "read.malovnik.ru",
            "-s",
            "codex.obsidian-share.private-password",
            "-w",
        ],
        check=True,
        capture_output=True,
        text=True,
    ).stdout.strip()
    require(password != "", "Private-note password is unavailable")
    return password


def csrf(html: str) -> str:
    match = re.search(r'name="csrf" value="([^"]+)"', html)
    require(match is not None, "CSRF token is missing")
    return match.group(1)


def content_probe(markdown: str) -> str | None:
    value = re.sub(r"\A---\n.*?\n---\n", "", markdown, flags=re.S)
    value = re.sub(r"!\[[^\]]*\]\([^)]*\)|!\[\[[^\]]+\]\]", " ", value)
    value = re.sub(r"[`*_>#\[\]()!~|:\-]+", " ", value)
    value = re.sub(r"\s+", " ", value).strip()
    return value[:80] if len(value) >= 30 else None


def main() -> int:
    args = parse_args()
    database = sqlite3.connect(args.database)
    database.row_factory = sqlite3.Row
    client = Client(args.base_url)
    checks: dict[str, Any] = {}

    status, headers, body = client.request("/healthz")
    require(status == 200, "healthz failed")
    require(json.loads(body)["status"] == "ok", "healthz payload failed")
    checks["health"] = "ok"

    status, _, body = client.request("/")
    home = body.decode("utf-8")
    require(status == 200 and "Заметки Никиты Малова" in home, "homepage failed")

    public_notes = database.execute(
        """
        SELECT id, canonical_path, title
        FROM notes
        WHERE is_deleted = 0 AND access_mode = 'public'
          AND (expires_at IS NULL OR expires_at > strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
        ORDER BY id
        """
    ).fetchall()
    for note in public_notes:
        status, _, body = client.request(
            "/s/" + urllib.parse.quote(str(note["canonical_path"]), safe="")
        )
        html = body.decode("utf-8")
        require(status == 200, "A public canonical URL failed")
        require(
            str(note["title"]) in html_module.unescape(html),
            "A public article title mismatched",
        )
        lowered = html.lower()
        require("javascript:" not in lowered, "Unsafe javascript URL reached a public page")
        require("onerror=" not in lowered, "Unsafe event handler reached a public page")
        require("<iframe" not in lowered, "Unsafe iframe reached a public page")
    checks["publicCanonicalUrls"] = len(public_notes)

    private_notes = database.execute(
        """
        SELECT id, canonical_path, markdown
        FROM notes
        WHERE is_deleted = 0 AND access_mode = 'private'
          AND (expires_at IS NULL OR expires_at > strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
        ORDER BY id
        """
    ).fetchall()
    for note in private_notes:
        isolated = Client(args.base_url)
        status, response_headers, body = isolated.request(
            "/s/" + urllib.parse.quote(str(note["canonical_path"]), safe="")
        )
        html = body.decode("utf-8")
        require(status == 200 and "Введите PIN-код" in html, "Private gate failed")
        require(
            "no-store" in response_headers.get("Cache-Control", ""),
            "Private gate cache policy failed",
        )
        probe = content_probe(str(note["markdown"]))
        if probe is not None:
            require(probe not in html, "Private note content leaked before unlock")
    checks["privateGates"] = len(private_notes)

    status, _, _ = client.request(
        "/api/v1/notes",
        method="POST",
        headers={"Content-Type": "application/json"},
        data=b'{"title":"unauthorized","content":"x","sourceId":"x"}',
    )
    require(status == 401, "Unauthenticated publish was not rejected")
    checks["unauthenticatedPublish"] = 401

    token = keychain_publish_token()
    sample_source = database.execute(
        "SELECT source_id FROM notes WHERE source_id IS NOT NULL LIMIT 1"
    ).fetchone()
    require(sample_source is not None, "No source note exists for metadata check")
    status, _, body = client.request(
        "/api/v1/meta?sourceId="
        + urllib.parse.quote(str(sample_source["source_id"]), safe=""),
        headers={"Authorization": f"Bearer {token}"},
    )
    require(status == 200 and "contentHash" in json.loads(body), "Authenticated metadata failed")
    token = ""
    checks["authenticatedMetadata"] = "ok"

    public_media = database.execute(
        """
        SELECT DISTINCT ma.legacy_id
        FROM note_media nm
        JOIN notes n ON n.id = nm.note_id
        JOIN media_aliases ma ON ma.media_hash = nm.media_hash
        WHERE n.is_deleted = 0 AND n.access_mode = 'public'
        ORDER BY length(ma.legacy_id), ma.legacy_id
        LIMIT 20
        """
    ).fetchall()
    for media in public_media:
        status, response_headers, body = client.request(
            "/api/images/" + urllib.parse.quote(str(media["legacy_id"]), safe="")
        )
        require(status == 200, "A legacy public media URL failed")
        require(response_headers.get("Content-Type", "").startswith("image/"), "Media MIME failed")
        require(len(body) > 0, "Media payload was empty")
    checks["legacyMediaUrls"] = len(public_media)

    status, _, body = client.request("/search-index.json")
    search_index = json.loads(body)
    require(status == 200 and len(search_index) == len(public_notes), "Search index count failed")
    status, _, body = client.request("/sitemap.xml")
    require(status == 200 and body.count(b"<url>") == len(public_notes) + 1, "Sitemap count failed")
    checks["searchAndSitemap"] = "ok"

    if private_notes:
        note = private_notes[0]
        private_client = Client(args.base_url)
        path = "/s/" + urllib.parse.quote(str(note["canonical_path"]), safe="")
        status, _, body = private_client.request(path)
        gate = body.decode("utf-8")
        payload = urllib.parse.urlencode(
            {"csrf": csrf(gate), "password": private_password()}
        ).encode()
        status, _, body = private_client.request(
            path,
            method="POST",
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            data=payload,
        )
        unlocked = body.decode("utf-8")
        probe = content_probe(str(note["markdown"]))
        require(status == 200 and (probe is None or probe in unlocked), "Private unlock failed")
        checks["privateUnlock"] = "ok"

    if args.with_admin:
        username = os.environ.get("ADMIN_USERNAME", "")
        password = os.environ.get("ADMIN_PASSWORD", "")
        require(username != "" and password != "", "Admin environment is unavailable")
        admin = Client(args.base_url)
        status, _, body = admin.request("/admin")
        login = body.decode("utf-8")
        payload = urllib.parse.urlencode(
            {
                "csrf": csrf(login),
                "username": username,
                "password": password,
            }
        ).encode()
        status, _, body = admin.request(
            "/admin/login",
            method="POST",
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            data=payload,
        )
        require(status == 200 and "Obsidian Share" in body.decode("utf-8"), "Admin login failed")
        checks["adminLogin"] = "ok"

    print(json.dumps(checks, ensure_ascii=False, separators=(",", ":")))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"ACCEPTANCE FAILED: {error}", file=sys.stderr)
        raise SystemExit(1)
