#!/usr/bin/env -S uv run --script
"""Build a token-protected one-time cleanup endpoint for failed releases."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
LOCAL_ROOT = PROJECT_ROOT / ".local/sprinthost"
RELEASE_PATTERN = re.compile(r"^\d{8}T\d{6}Z$")


def release_id(value: str) -> str:
    if RELEASE_PATTERN.fullmatch(value) is None:
        raise argparse.ArgumentTypeError("invalid release id")
    return value


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--current-release", required=True, type=release_id)
    parser.add_argument("--remove-release", action="append", required=True, type=release_id)
    args = parser.parse_args()
    if args.current_release in args.remove_release:
        raise RuntimeError("Current release cannot be a cleanup target")

    token = os.urandom(32).hex()
    name = f"cleanup-{args.current_release}"
    token_path = LOCAL_ROOT / f"{name}.token"
    endpoint_path = LOCAL_ROOT / f"{name}.php"
    template = (
        PROJECT_ROOT / "sprinthost/deploy/cleanup-failed.php.template"
    ).read_text(encoding="utf-8")
    endpoint = (
        template.replace("__CURRENT_RELEASE__", args.current_release)
        .replace(
            "__REMOVE_RELEASES__",
            json.dumps(args.remove_release, separators=(",", ":")),
        )
        .replace("__CLEANUP_TOKEN_SHA256__", hashlib.sha256(token.encode()).hexdigest())
    )
    token_path.write_text(token, encoding="ascii")
    endpoint_path.write_text(endpoint, encoding="utf-8")
    token_path.chmod(0o600)
    endpoint_path.chmod(0o600)
    token = ""
    print(
        json.dumps(
            {
                "endpoint": str(endpoint_path),
                "tokenFile": str(token_path),
                "removeReleases": args.remove_release,
            },
            separators=(",", ":"),
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
