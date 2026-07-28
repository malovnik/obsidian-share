#!/usr/bin/env -S uv run --script
"""Rehearse the one-time activator against an isolated local domain tree."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import socket
import subprocess
import tarfile
import time
import urllib.parse
import urllib.error
import urllib.request
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
LOCAL_ROOT = PROJECT_ROOT / ".local/sprinthost"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--release-id", required=True)
    parser.add_argument("--port", type=int, default=8766)
    parser.add_argument("--clean-existing", action="store_true")
    return parser.parse_args()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def main() -> int:
    args = parse_args()
    source_release = LOCAL_ROOT / "releases" / args.release_id
    root = LOCAL_ROOT / "activation-rehearsal" / args.release_id
    if root.exists():
        if not args.clean_existing:
            raise RuntimeError("Activation rehearsal path already exists")
        shutil.rmtree(root)
    domain = root / "domain"
    public = domain / "public_html/read"
    public.mkdir(mode=0o755, parents=True)
    (public / "index.php").write_text("<?php echo 'old placeholder';\n", encoding="utf-8")

    release = root / "release"
    shutil.copytree(source_release, release)
    production_root = "/home/a0346120/domains/malovnik.ru"
    config = (release / "config.php").read_text(encoding="utf-8")
    config = config.replace(production_root, str(domain))
    (release / "config.php").write_text(config, encoding="utf-8")
    (release / "config.php").chmod(0o600)

    files: dict[str, str] = {}
    for path in sorted(release.rglob("*")):
        if path.is_file() and path.name != "manifest.json":
            files[path.relative_to(release).as_posix()] = sha256(path)
    (release / "manifest.json").write_text(
        json.dumps({"releaseId": args.release_id, "files": files}, sort_keys=True, indent=2)
        + "\n",
        encoding="utf-8",
    )

    archive_name = f"rehearsal-{args.release_id}.tar.gz"
    archive_path = domain / archive_name
    # Match the production archive format. PharData handles GNU long-name
    # records reliably, while POSIX PAX long paths can be skipped silently.
    with tarfile.open(
        archive_path,
        "w:gz",
        compresslevel=6,
        format=tarfile.GNU_FORMAT,
    ) as archive:
        for path in sorted(release.rglob("*")):
            archive.add(path, arcname=path.relative_to(release), recursive=False)

    token = os.urandom(32).hex()
    installer_name = f"rehearsal-{args.release_id}.php"
    template = (
        PROJECT_ROOT / "sprinthost/deploy/activate.php.template"
    ).read_text(encoding="utf-8")
    installer = (
        template.replace("__RELEASE_ID__", "rehearsal-" + args.release_id)
        .replace("__ARCHIVE_NAME__", archive_name)
        .replace("__ARCHIVE_SHA256__", sha256(archive_path))
        .replace("__ACTIVATION_TOKEN_SHA256__", hashlib.sha256(token.encode()).hexdigest())
    )
    (public / installer_name).write_text(installer, encoding="utf-8")

    server_log_path = root / "php-server.log"
    with server_log_path.open("w", encoding="utf-8") as server_log:
        server = subprocess.Popen(
            [
                "/opt/homebrew/opt/php@8.3/bin/php",
                "-S",
                f"127.0.0.1:{args.port}",
                "-t",
                str(public),
            ],
            stdout=subprocess.DEVNULL,
            stderr=server_log,
            text=True,
        )
        failure: Exception | None = None
        try:
            deadline = time.monotonic() + 10
            while time.monotonic() < deadline:
                with socket.socket() as probe:
                    if probe.connect_ex(("127.0.0.1", args.port)) == 0:
                        break
                time.sleep(0.05)
            else:
                raise RuntimeError("Local PHP activation server did not start")

            payload = urllib.parse.urlencode({"token": token}).encode()
            request = urllib.request.Request(
                f"http://127.0.0.1:{args.port}/{installer_name}",
                data=payload,
                method="POST",
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            try:
                with urllib.request.urlopen(request, timeout=30) as response:
                    result = json.loads(response.read())
            except urllib.error.HTTPError as error:
                failure = RuntimeError(
                    f"Activator returned HTTP {error.code}: {error.read().decode('utf-8', 'replace')}"
                )
                result = {}
            if not failure and not result.get("success"):
                failure = RuntimeError("Activator did not report success")
        finally:
            token = ""
            server.terminate()
            try:
                server.wait(timeout=5)
            except subprocess.TimeoutExpired:
                server.kill()
        if failure is not None:
            server_log.flush()
            log_tail = "\n".join(
                server_log_path.read_text(encoding="utf-8").splitlines()[-30:]
            )
            raise RuntimeError(f"{failure}\nPHP server log:\n{log_tail}")

    private = domain / "private/obsidian-share"
    required = [
        private / "current/bootstrap.php",
        private / "data/obsidian-share.sqlite",
        private / "config.php",
        public / "generated/index.html",
        private / "rollbacks" / ("rehearsal-" + args.release_id) / "public/index.php",
    ]
    if not all(path.exists() for path in required):
        raise RuntimeError("Activated or rollback files are incomplete")
    if (public / installer_name).exists() or archive_path.exists():
        raise RuntimeError("One-time deployment artifacts were not removed")

    print(
        json.dumps(
            {
                "releaseId": args.release_id,
                "result": result,
                "requiredFiles": len(required),
                "rehearsalRoot": str(root),
            },
            separators=(",", ":"),
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
