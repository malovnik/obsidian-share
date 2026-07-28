#!/usr/bin/env python3
"""Upload a short-lived PHP capability probe over FTP and remove it."""

from __future__ import annotations

import argparse
import ftplib
import getpass
import io
import json
import secrets
import ssl
import urllib.request


PROBE = b"""<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
echo json_encode([
  'php_version' => PHP_VERSION,
  'sapi' => PHP_SAPI,
  'document_root' => $_SERVER['DOCUMENT_ROOT'] ?? null,
  'script_filename' => $_SERVER['SCRIPT_FILENAME'] ?? null,
  'extensions' => [
    'pdo_sqlite' => extension_loaded('pdo_sqlite'),
    'sqlite3' => extension_loaded('sqlite3'),
    'pdo_pgsql' => extension_loaded('pdo_pgsql'),
    'pgsql' => extension_loaded('pgsql'),
    'mbstring' => extension_loaded('mbstring'),
    'intl' => extension_loaded('intl'),
    'gd' => extension_loaded('gd'),
    'imagick' => extension_loaded('imagick'),
    'sodium' => extension_loaded('sodium'),
    'opcache' => extension_loaded('Zend OPcache'),
  ],
  'limits' => [
    'memory_limit' => ini_get('memory_limit'),
    'upload_max_filesize' => ini_get('upload_max_filesize'),
    'post_max_size' => ini_get('post_max_size'),
    'max_execution_time' => ini_get('max_execution_time'),
    'opcache_validate_timestamps' => ini_get('opcache.validate_timestamps'),
    'opcache_revalidate_freq' => ini_get('opcache.revalidate_freq'),
  ],
  'writable' => is_writable(__DIR__),
], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
"""


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--server", required=True)
    parser.add_argument("--user", required=True)
    parser.add_argument("--remote-dir", required=True)
    parser.add_argument("--base-url", required=True)
    args = parser.parse_args()

    password = getpass.getpass("FTP password: ")
    filename = f".codex-probe-{secrets.token_hex(12)}.php"
    remote_path = f"{args.remote_dir.rstrip('/')}/{filename}"
    url = f"{args.base_url.rstrip('/')}/{filename}"

    ftp = ftplib.FTP(args.server, timeout=30)
    try:
        ftp.login(args.user, password)
        ftp.storbinary(f"STOR {remote_path}", io.BytesIO(PROBE))

        request = urllib.request.Request(
            url,
            headers={"User-Agent": "obsidian-share-capability-probe/1.0"},
        )
        with urllib.request.urlopen(
            request,
            timeout=30,
            context=ssl.create_default_context(),
        ) as response:
            payload = json.loads(response.read().decode("utf-8"))
            print(json.dumps(payload, ensure_ascii=False, indent=2))
    finally:
        try:
            ftp.delete(remote_path)
        except ftplib.all_errors:
            pass
        try:
            ftp.quit()
        except ftplib.all_errors:
            ftp.close()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
