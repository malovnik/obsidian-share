#!/usr/bin/env python3
"""Read-only recursive FTP inventory for migration safety checks."""

from __future__ import annotations

import argparse
import ftplib
import getpass
from collections.abc import Iterator


def walk(ftp: ftplib.FTP, root: str, limit: int) -> Iterator[tuple[str, dict[str, str]]]:
    pending = [root.rstrip("/")]
    seen = 0

    while pending:
        directory = pending.pop()
        for name, facts in ftp.mlsd(directory):
            if name in {".", ".."}:
                continue

            path = f"{directory}/{name}"
            seen += 1
            if seen > limit:
                raise RuntimeError(f"Inventory exceeded safety limit of {limit} entries")

            yield path, facts
            if facts.get("type") == "dir":
                pending.append(path)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--server", required=True)
    parser.add_argument("--user", required=True)
    parser.add_argument("--remote-dir", required=True)
    parser.add_argument("--limit", type=int, default=20_000)
    args = parser.parse_args()

    password = getpass.getpass("FTP password: ")
    ftp = ftplib.FTP(args.server, timeout=30)
    ftp.login(args.user, password)

    total_files = 0
    php_files: list[str] = []
    control_files: list[str] = []

    try:
        for path, facts in walk(ftp, args.remote_dir, args.limit):
            if facts.get("type") != "file":
                continue
            total_files += 1
            lowered = path.lower()
            if lowered.endswith((".php", ".phtml", ".phar")):
                php_files.append(path)
            if lowered.endswith((".htaccess", "php.ini", ".user.ini")):
                control_files.append(path)
    finally:
        try:
            ftp.quit()
        except ftplib.all_errors:
            ftp.close()

    print(f"files={total_files}")
    print(f"php_like={len(php_files)}")
    for path in php_files:
        print(f"PHP {path}")
    print(f"server_controls={len(control_files)}")
    for path in control_files:
        print(f"CONTROL {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
