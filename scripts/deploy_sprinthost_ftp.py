#!/usr/bin/env -S uv run --script
"""Upload one verified SprintHost release through the dedicated FTP account."""

from __future__ import annotations

import argparse
import ftplib
import json
import re
import subprocess
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
LOCAL_ROOT = PROJECT_ROOT / ".local/sprinthost"
RELEASE_PATTERN = re.compile(r"^\d{8}T\d{6}Z$")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--release-id", required=True)
    parser.add_argument(
        "--remove-release",
        action="append",
        default=[],
        help="Remove an exact obsolete release archive and activator after upload",
    )
    return parser.parse_args()


def require_release_id(value: str) -> str:
    if RELEASE_PATTERN.fullmatch(value) is None:
        raise ValueError(f"Invalid release id: {value!r}")
    return value


def keychain_password() -> str:
    password = subprocess.run(
        [
            "/usr/bin/security",
            "find-generic-password",
            "-a",
            "codexapp@a0346120",
            "-s",
            "codex.sprinthost.malovnik.ru.ftp",
            "-w",
        ],
        check=True,
        capture_output=True,
        text=True,
    ).stdout.strip()
    if password == "":
        raise RuntimeError("SprintHost FTP password is unavailable in macOS Keychain")
    return password


def upload_atomic(ftp: ftplib.FTP, local: Path, remote: str) -> int:
    if not local.is_file():
        raise FileNotFoundError(local)
    expected = local.stat().st_size
    temporary = remote + ".uploading"
    try:
        ftp.delete(temporary)
    except ftplib.error_perm as error:
        if not str(error).startswith("550"):
            raise
    with local.open("rb") as handle:
        ftp.storbinary(f"STOR {temporary}", handle, blocksize=256 * 1024)
    uploaded = ftp.size(temporary)
    if uploaded != expected:
        try:
            ftp.delete(temporary)
        finally:
            raise RuntimeError(
                f"FTP size mismatch for {remote}: expected {expected}, got {uploaded}"
            )
    try:
        ftp.delete(remote)
    except ftplib.error_perm as error:
        if not str(error).startswith("550"):
            raise
    ftp.rename(temporary, remote)
    final_size = ftp.size(remote)
    if final_size != expected:
        raise RuntimeError(f"Final FTP size mismatch for {remote}")
    return expected


def delete_if_present(ftp: ftplib.FTP, remote: str) -> bool:
    try:
        ftp.delete(remote)
        return True
    except ftplib.error_perm as error:
        if str(error).startswith("550"):
            return False
        raise


def main() -> int:
    args = parse_args()
    release_id = require_release_id(args.release_id)
    stale_ids = [require_release_id(value) for value in args.remove_release]
    if release_id in stale_ids:
        raise ValueError("The active upload cannot also be removed")

    archive_name = f"obsidian-share-{release_id}.tar.gz"
    installer_name = f"activate-{release_id}.php"
    archive_path = LOCAL_ROOT / archive_name
    installer_path = LOCAL_ROOT / installer_name

    password = keychain_password()
    ftp = ftplib.FTP("ftp.malovnik.ru", timeout=60)
    ftp.login("codexapp@a0346120", password)
    password = ""
    ftp.set_pasv(True)

    uploaded: dict[str, int] = {}
    removed: list[str] = []
    try:
        if ftp.pwd() != "/":
            raise RuntimeError("Unexpected FTP home; refusing to upload")
        root_names = set(ftp.nlst())
        if "public_html" not in root_names:
            raise RuntimeError("Expected public_html directory is unavailable")

        uploaded["/" + archive_name] = upload_atomic(
            ftp,
            archive_path,
            "/" + archive_name,
        )
        uploaded["/public_html/read/" + installer_name] = upload_atomic(
            ftp,
            installer_path,
            "/public_html/read/" + installer_name,
        )

        for stale_id in stale_ids:
            stale_archive = f"/obsidian-share-{stale_id}.tar.gz"
            stale_installer = f"/public_html/read/activate-{stale_id}.php"
            for remote in (stale_archive, stale_installer):
                if delete_if_present(ftp, remote):
                    removed.append(remote)
    finally:
        try:
            ftp.quit()
        except ftplib.all_errors:
            ftp.close()

    print(
        json.dumps(
            {"releaseId": release_id, "uploaded": uploaded, "removed": removed},
            separators=(",", ":"),
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
