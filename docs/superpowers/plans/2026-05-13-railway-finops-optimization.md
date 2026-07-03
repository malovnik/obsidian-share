# Railway FinOps Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce Railway waste and security risk across Nikita's projects without breaking production services, losing data, or changing infrastructure without proof.

**Architecture:** Work in safety waves. First fix P0 token leakage in application logs and rotate only after code is deployed. Then prove whether zero-used running volumes are unreferenced before stopping anything. Finally optimize moderate idle-memory services with repo-specific code changes and post-deploy Railway observation.

**Tech Stack:** Railway CLI/API, GitHub CLI, Python services using `python-telegram-bot`, Node/Next/Vite services, uv for Python validation, npm for Node validation, private Markdown audit ledger.

---

## Skill Execution Record

- Superpowers skill used: `claude-plugin-superpowers-writing-plans`.
- Supporting workflow skill used: `workflow-guides` for refactor/optimization workflow.
- Serena memories used:
  - `railway_finops_batch_audit_except_obsidian_2026_05_13`
  - `railway_finops_boty_kluba_audit_2026_05_13`
- Audit source: `/Users/malovnik/Documents/Dev/obsidian-share/docs/railway-finops-audit-2026-05-13.md`
- Scope excluded by user: `Obsidian Publisher`.

## File Structure

This plan coordinates multiple repos and infrastructure checks. Keep the public `obsidian-share` repo as the private audit ledger only; do not push internal Railway IDs to the public repository.

- Modify: `/Users/malovnik/Documents/Dev/obsidian-share/docs/railway-finops-audit-2026-05-13.md`
  - Responsibility: private evidence ledger, findings, status updates, and before/after measurements.
- Create or clone when missing: `/Users/malovnik/Documents/Dev/coinchecknimlast`
  - Repo: `malovnik/coinchecknimlast`
  - Modify: `cranal.py`
  - Responsibility: stop Telegram bot token leakage in logs for `ПОДАРОК КриптоВыпускникам / coinchecknimlast`.
- Create or clone when missing: `/Users/malovnik/Documents/Dev/club-stats-bot`
  - Repo: `malovnik/club-stats-bot`
  - Modify: `bot/main.py`
  - Inspect later: `web/` for Next.js `failed-to-find-server-action`.
  - Responsibility: stop token leakage/log noise for `Боты клуба`; later handle web runtime errors.
- Create or clone when missing: `/Users/malovnik/Documents/Dev/free_gpt_tg`
  - Repo: `malovnik/free_gpt_tg`
  - Modify: `start.py`, `bot_refactored.py`
  - Responsibility: stop token leakage in `GPT без регистрации / worker`.
- Create or clone when missing: `/Users/malovnik/Documents/Dev/ai-vsl-kern`
  - Repo: `malovnik/ai-vsl-kern`
  - Modify: `tg-bot/bot.py`
  - Responsibility: stop token leakage in `AI Pervoprohodcy 15LP Frank Kern / tg-bot`.
- Inspect only first: `/Users/malovnik/Documents/Dev/Transcriber`
  - Repo: `malovnik/Transcriber`
  - Responsibility: prove whether `backend` 49 GB / 0 MB volume is used before infrastructure action.
- Clone later if missing:
  - `/Users/malovnik/Documents/Dev/tuwunel-matrix`
  - `/Users/malovnik/Documents/Dev/instacutter`
  - `/Users/malovnik/Documents/Dev/moyperviyrepo`
  - `/Users/malovnik/Documents/Dev/tg-daily-summary`
  - `/Users/malovnik/Documents/Dev/ai-club-site`
  - `/Users/malovnik/Documents/Dev/MyCMS-System`

## Priority Map

P0 first:

- `ПОДАРОК КриптоВыпускникам / coinchecknimlast`: token-like Telegram bot URL in logs.
- `Боты клуба / Бот статист Сервер`: token-like Telegram bot URL in logs.
- `Боты клуба / Бот Консультант по эфиру Кими Сайты`: token-like Telegram bot URL in logs.
- `GPT без регистрации / worker`: token-like Telegram bot URL in logs.
- `AI Pervoprohodcy 15LP Frank Kern / tg-bot`: token-like Telegram bot URL in logs.

P1 second:

- Running zero-used volumes: `Postgres-7sSu`, `Transcriber/backend`, `Matrix Messenger/tuwunel`, `InstaCutter/Postgres`, `Журнал тренировок/worker`, `Daily Digest/tg-daily-summary`.
- Empty project: `bountiful-harmony`.

P2 third:

- Moderate idle memory: `Сайт продажи клуба`, `MyCMS-System`, `Платный транскрибатор/backend`, `Matrix Messenger/tuwunel`.
- Error-log noise: services marked mostly `level=error`.

## Task 1: Prepare Private Optimization Workspace

**Files:**
- Create/modify repo worktrees under `/Users/malovnik/Documents/Dev/`
- Modify: `/Users/malovnik/Documents/Dev/obsidian-share/docs/railway-finops-audit-2026-05-13.md`

- [ ] **Step 1: Verify Railway and GitHub authentication**

Run:

```bash
railway whoami --json
gh auth status
```

Expected:

- Railway returns user `Nikita` and workspace `malovnik's Projects`.
- GitHub CLI is authenticated for `github.com`.

- [ ] **Step 2: Create or update local clones for P0 repos**

Run:

```bash
cd /Users/malovnik/Documents/Dev
for repo in coinchecknimlast club-stats-bot free_gpt_tg ai-vsl-kern; do
  if [ -d "$repo/.git" ]; then
    git -C "$repo" fetch origin --prune
  else
    gh repo clone "malovnik/$repo" "$repo"
  fi
done
```

Expected:

- Each repo exists as a Git checkout.
- No production infrastructure changes occur.

- [ ] **Step 3: Create working branches**

Run:

```bash
cd /Users/malovnik/Documents/Dev/coinchecknimlast && git switch -c codex/railway-redact-telegram-token-logs
cd /Users/malovnik/Documents/Dev/club-stats-bot && git switch -c codex/railway-redact-telegram-token-logs
cd /Users/malovnik/Documents/Dev/free_gpt_tg && git switch -c codex/railway-redact-telegram-token-logs
cd /Users/malovnik/Documents/Dev/ai-vsl-kern && git switch -c codex/railway-redact-telegram-token-logs
```

Expected:

- Each repo is on a `codex/railway-redact-telegram-token-logs` branch.

- [ ] **Step 4: Record workspace start in the audit ledger**

Append to `/Users/malovnik/Documents/Dev/obsidian-share/docs/railway-finops-audit-2026-05-13.md`:

```markdown
### Optimization Execution Log

- 2026-05-13: Started P0 token-log redaction wave across `coinchecknimlast`, `club-stats-bot`, `free_gpt_tg`, and `ai-vsl-kern`. Mode: code changes only, no token rotation until deployed log redaction is verified.
```

Expected:

- Audit ledger has a clear execution start marker.

## Task 2: Add Token-Redacting Logging To `coinchecknimlast`

**Files:**
- Modify: `/Users/malovnik/Documents/Dev/coinchecknimlast/cranal.py`
- Test: Python compile and local logging smoke

- [ ] **Step 1: Add redaction helpers above `setup_logging()`**

Insert this code above `def setup_logging():`

```python
TELEGRAM_TOKEN_RE = re.compile(r"bot\d+:[A-Za-z0-9_-]+")


class SecretRedactingFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.msg = TELEGRAM_TOKEN_RE.sub("bot<redacted>", str(record.msg))
        if record.args:
            record.args = tuple(
                TELEGRAM_TOKEN_RE.sub("bot<redacted>", str(arg))
                for arg in record.args
            )
        return True
```

- [ ] **Step 2: Attach the filter and quiet noisy HTTP clients in `setup_logging()`**

Change `setup_logging()` to this full body:

```python
def setup_logging():
    logger = logging.getLogger()
    logger.setLevel(getattr(logging, LOG_LEVEL, logging.INFO))
    logger.handlers.clear()

    redactor = SecretRedactingFilter()
    formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")

    stdout_handler = logging.StreamHandler(sys.stdout)
    stdout_handler.setFormatter(formatter)
    stdout_handler.addFilter(redactor)
    logger.addHandler(stdout_handler)

    if os.getenv("RAILWAY_ENVIRONMENT") is None:
        file_handler = RotatingFileHandler(
            "crypto_analyzer.log",
            maxBytes=10 * 1024 * 1024,
            backupCount=3,
            encoding="utf-8",
        )
        file_handler.setFormatter(formatter)
        file_handler.addFilter(redactor)
        logger.addHandler(file_handler)

    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("telegram").setLevel(logging.WARNING)
```

- [ ] **Step 3: Validate Python syntax with uv**

Run:

```bash
cd /Users/malovnik/Documents/Dev/coinchecknimlast
uv run --with-requirements requirements.txt python -m py_compile cranal.py
```

Expected:

- Command exits `0`.

- [ ] **Step 4: Smoke-test redaction without Telegram network calls**

Run:

```bash
cd /Users/malovnik/Documents/Dev/coinchecknimlast
uv run --with-requirements requirements.txt python - <<'PY'
import logging
from cranal import setup_logging

setup_logging()
logging.info("https://api.telegram.org/bot123456:ABC_secret-token/getUpdates")
PY
```

Expected output contains:

```text
https://api.telegram.org/bot<redacted>/getUpdates
```

Expected output does not contain:

```text
bot123456:ABC_secret-token
```

- [ ] **Step 5: Commit**

Run:

```bash
cd /Users/malovnik/Documents/Dev/coinchecknimlast
git add cranal.py
git commit -m "fix: redact Telegram tokens from logs"
```

Expected:

- One commit on `codex/railway-redact-telegram-token-logs`.

## Task 3: Add Token-Redacting Logging To `club-stats-bot`

**Files:**
- Modify: `/Users/malovnik/Documents/Dev/club-stats-bot/bot/main.py`
- Test: Python compile and local logging smoke

- [ ] **Step 1: Add `re` import**

Modify the top imports in `bot/main.py`:

```python
import asyncio
import logging
import re
import signal
```

- [ ] **Step 2: Add redaction helpers above `logging.basicConfig(...)`**

Insert this code above the existing `logging.basicConfig(...)` call:

```python
TELEGRAM_TOKEN_RE = re.compile(r"bot\d+:[A-Za-z0-9_-]+")


class SecretRedactingFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.msg = TELEGRAM_TOKEN_RE.sub("bot<redacted>", str(record.msg))
        if record.args:
            record.args = tuple(
                TELEGRAM_TOKEN_RE.sub("bot<redacted>", str(arg))
                for arg in record.args
            )
        return True
```

- [ ] **Step 3: Replace logging configuration**

Replace the existing `logging.basicConfig(...)` block and `logger = logging.getLogger(__name__)` with:

```python
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
for handler in logging.getLogger().handlers:
    handler.addFilter(SecretRedactingFilter())

logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("telegram").setLevel(logging.WARNING)

logger = logging.getLogger(__name__)
```

- [ ] **Step 4: Validate Python syntax with uv**

Run:

```bash
cd /Users/malovnik/Documents/Dev/club-stats-bot/bot
uv run --with-requirements requirements.txt python -m py_compile main.py handlers.py scheduler.py database.py
```

Expected:

- Command exits `0`.

- [ ] **Step 5: Smoke-test redaction**

Run:

```bash
cd /Users/malovnik/Documents/Dev/club-stats-bot/bot
uv run --with-requirements requirements.txt python - <<'PY'
import logging
import main

logging.error("POST https://api.telegram.org/bot123456:ABC_secret-token/getUpdates")
PY
```

Expected output contains:

```text
POST https://api.telegram.org/bot<redacted>/getUpdates
```

Expected output does not contain:

```text
bot123456:ABC_secret-token
```

- [ ] **Step 6: Commit**

Run:

```bash
cd /Users/malovnik/Documents/Dev/club-stats-bot
git add bot/main.py
git commit -m "fix: redact Telegram tokens from bot logs"
```

Expected:

- One commit on `codex/railway-redact-telegram-token-logs`.

## Task 4: Add Token-Redacting Logging To `free_gpt_tg`

**Files:**
- Modify: `/Users/malovnik/Documents/Dev/free_gpt_tg/start.py`
- Modify: `/Users/malovnik/Documents/Dev/free_gpt_tg/bot_refactored.py`
- Test: Python compile and local logging smoke

- [ ] **Step 1: Add redaction to `start.py`**

Change imports and logging setup in `start.py` to:

```python
import os
import sys
import asyncio
import threading
import logging
import re
from multiprocessing import Process

TELEGRAM_TOKEN_RE = re.compile(r"bot\d+:[A-Za-z0-9_-]+")


class SecretRedactingFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.msg = TELEGRAM_TOKEN_RE.sub("bot<redacted>", str(record.msg))
        if record.args:
            record.args = tuple(
                TELEGRAM_TOKEN_RE.sub("bot<redacted>", str(arg))
                for arg in record.args
            )
        return True


logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
for handler in logging.getLogger().handlers:
    handler.addFilter(SecretRedactingFilter())

logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("telegram").setLevel(logging.WARNING)

logger = logging.getLogger(__name__)
```

- [ ] **Step 2: Add redaction to `bot_refactored.py`**

Change imports and logging setup in `bot_refactored.py` to:

```python
import logging
import re
from telegram import Update, BotCommand
from telegram.ext import Application, CommandHandler, MessageHandler, CallbackQueryHandler, ContextTypes, filters
from telegram.ext import JobQueue

TELEGRAM_TOKEN_RE = re.compile(r"bot\d+:[A-Za-z0-9_-]+")


class SecretRedactingFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.msg = TELEGRAM_TOKEN_RE.sub("bot<redacted>", str(record.msg))
        if record.args:
            record.args = tuple(
                TELEGRAM_TOKEN_RE.sub("bot<redacted>", str(arg))
                for arg in record.args
            )
        return True


logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
for handler in logging.getLogger().handlers:
    handler.addFilter(SecretRedactingFilter())

logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("telegram").setLevel(logging.WARNING)

logger = logging.getLogger(__name__)
```

Keep the existing imports that follow these lines in `bot_refactored.py`; do not remove application-specific imports.

- [ ] **Step 3: Validate Python syntax with uv**

Run:

```bash
cd /Users/malovnik/Documents/Dev/free_gpt_tg
uv run --with-requirements requirements.txt python -m py_compile start.py bot_refactored.py
```

Expected:

- Command exits `0`.

- [ ] **Step 4: Smoke-test redaction**

Run:

```bash
cd /Users/malovnik/Documents/Dev/free_gpt_tg
uv run --with-requirements requirements.txt python - <<'PY'
import logging
import start

logging.error("GET https://api.telegram.org/bot123456:ABC_secret-token/getUpdates")
PY
```

Expected output contains:

```text
GET https://api.telegram.org/bot<redacted>/getUpdates
```

Expected output does not contain:

```text
bot123456:ABC_secret-token
```

- [ ] **Step 5: Commit**

Run:

```bash
cd /Users/malovnik/Documents/Dev/free_gpt_tg
git add start.py bot_refactored.py
git commit -m "fix: redact Telegram tokens from logs"
```

Expected:

- One commit on `codex/railway-redact-telegram-token-logs`.

## Task 5: Add Token-Redacting Logging To `ai-vsl-kern`

**Files:**
- Modify: `/Users/malovnik/Documents/Dev/ai-vsl-kern/tg-bot/bot.py`
- Test: uv compile and local logging smoke

- [ ] **Step 1: Add `re` import**

Modify imports in `tg-bot/bot.py`:

```python
import os
import json
import sqlite3
import logging
import asyncio
import re
from datetime import datetime, timezone, timedelta
from pathlib import Path
```

- [ ] **Step 2: Add redaction helpers above `logging.basicConfig(...)`**

Insert this code above the existing `logging.basicConfig(...)` call:

```python
TELEGRAM_TOKEN_RE = re.compile(r"bot\d+:[A-Za-z0-9_-]+")


class SecretRedactingFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.msg = TELEGRAM_TOKEN_RE.sub("bot<redacted>", str(record.msg))
        if record.args:
            record.args = tuple(
                TELEGRAM_TOKEN_RE.sub("bot<redacted>", str(arg))
                for arg in record.args
            )
        return True
```

- [ ] **Step 3: Replace logging configuration**

Replace the existing `logging.basicConfig(...)` block and `logger = logging.getLogger(__name__)` with:

```python
logging.basicConfig(
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    level=logging.INFO
)
for handler in logging.getLogger().handlers:
    handler.addFilter(SecretRedactingFilter())

logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("telegram").setLevel(logging.WARNING)

logger = logging.getLogger(__name__)
```

- [ ] **Step 4: Validate Python syntax with uv**

Run:

```bash
cd /Users/malovnik/Documents/Dev/ai-vsl-kern/tg-bot
uv run python -m py_compile bot.py
```

Expected:

- Command exits `0`.

- [ ] **Step 5: Smoke-test redaction**

Run:

```bash
cd /Users/malovnik/Documents/Dev/ai-vsl-kern/tg-bot
uv run python - <<'PY'
import logging
import bot

logging.error("POST https://api.telegram.org/bot123456:ABC_secret-token/getUpdates")
PY
```

Expected output contains:

```text
POST https://api.telegram.org/bot<redacted>/getUpdates
```

Expected output does not contain:

```text
bot123456:ABC_secret-token
```

- [ ] **Step 6: Commit**

Run:

```bash
cd /Users/malovnik/Documents/Dev/ai-vsl-kern
git add tg-bot/bot.py
git commit -m "fix: redact Telegram tokens from bot logs"
```

Expected:

- One commit on `codex/railway-redact-telegram-token-logs`.

## Task 6: Deploy P0 Fixes And Verify Logs Before Token Rotation

**Files:**
- Modify: `/Users/malovnik/Documents/Dev/obsidian-share/docs/railway-finops-audit-2026-05-13.md`
- GitHub PRs or direct pushes in P0 repos, depending on repo policy confirmed at execution time

- [ ] **Step 1: Push branches**

Run:

```bash
cd /Users/malovnik/Documents/Dev/coinchecknimlast && git push -u origin codex/railway-redact-telegram-token-logs
cd /Users/malovnik/Documents/Dev/club-stats-bot && git push -u origin codex/railway-redact-telegram-token-logs
cd /Users/malovnik/Documents/Dev/free_gpt_tg && git push -u origin codex/railway-redact-telegram-token-logs
cd /Users/malovnik/Documents/Dev/ai-vsl-kern && git push -u origin codex/railway-redact-telegram-token-logs
```

Expected:

- Each branch exists on GitHub.

- [ ] **Step 2: Create PRs unless the repo already uses direct-main deployment**

Run:

```bash
gh pr create --repo malovnik/coinchecknimlast --base main --head codex/railway-redact-telegram-token-logs --title "fix: redact Telegram tokens from logs" --body "Stops Telegram bot token leakage in Railway logs before token rotation."
gh pr create --repo malovnik/club-stats-bot --base main --head codex/railway-redact-telegram-token-logs --title "fix: redact Telegram tokens from bot logs" --body "Stops Telegram bot token leakage in Railway logs before token rotation."
gh pr create --repo malovnik/free_gpt_tg --base main --head codex/railway-redact-telegram-token-logs --title "fix: redact Telegram tokens from logs" --body "Stops Telegram bot token leakage in Railway logs before token rotation."
gh pr create --repo malovnik/ai-vsl-kern --base main --head codex/railway-redact-telegram-token-logs --title "fix: redact Telegram tokens from bot logs" --body "Stops Telegram bot token leakage in Railway logs before token rotation."
```

Expected:

- Four PR URLs, or documented reason why a repo deploys only from direct push.

- [ ] **Step 3: Merge/deploy one repo at a time**

For each repo after checks pass:

```bash
gh pr merge --repo OWNER/REPO PR_NUMBER --squash --delete-branch
```

Expected:

- Railway auto-deploys the affected service.
- Only one P0 repo is deployed at a time.

- [ ] **Step 4: Verify Railway logs are redacted**

For each affected service, run a sanitized log check:

```bash
tmpdir=$(mktemp -d)
cd "$tmpdir"
railway project link --project PROJECT_ID --environment production --service SERVICE_ID --json >/dev/null
railway logs --service SERVICE_ID --lines 80 --json | rg 'bot[0-9]+:[A-Za-z0-9_-]+' && exit 1 || true
```

Expected:

- No raw `bot<digits>:<token>` pattern appears in logs after the new deployment.

- [ ] **Step 5: Record verification**

Append to the audit ledger:

```markdown
- 2026-05-13: Verified P0 log redaction after deploy for `<project/service>`; recent Railway logs contain no raw Telegram bot-token URL pattern. Token rotation can proceed for this service.
```

Expected:

- Each service has a log-redaction verification entry before token rotation.

## Task 7: Rotate Affected Telegram Tokens After Log Redaction

**Files:**
- Modify: Railway variables only after user confirms rotation timing
- Modify: `/Users/malovnik/Documents/Dev/obsidian-share/docs/railway-finops-audit-2026-05-13.md`

- [ ] **Step 1: Confirm the list of affected services**

Use this list:

```text
ПОДАРОК КриптоВыпускникам / coinchecknimlast
Боты клуба / Бот статист Сервер
Боты клуба / Бот Консультант по эфиру Кими Сайты
GPT без регистрации / worker
AI Pervoprohodcy 15LP Frank Kern / tg-bot
```

Expected:

- User confirms which tokens can be rotated now.

- [ ] **Step 2: Rotate in Telegram BotFather**

Manual action:

```text
BotFather -> /revoke -> select bot -> receive new token
```

Expected:

- A new token exists for each affected bot.

- [ ] **Step 3: Update Railway variable for one service**

Run the appropriate command for that service:

```bash
railway variable set TELEGRAM_BOT_TOKEN='<new-token>' --service '<service-name-or-id>'
```

For services using a different variable name:

```bash
railway variable set TG_BOT_TOKEN='<new-token>' --service '<service-name-or-id>'
railway variable set BOT_TOKEN='<new-token>' --service '<service-name-or-id>'
```

Expected:

- Railway redeploys or restarts the service with the new token.

- [ ] **Step 4: Verify each bot service after rotation**

Run:

```bash
railway service status --all --json
railway logs --service '<service-name-or-id>' --lines 80 --json | rg 'Unauthorized|Forbidden|Invalid token|bot[0-9]+:[A-Za-z0-9_-]+' && exit 1 || true
```

Expected:

- Service is `SUCCESS`.
- No invalid-token errors.
- No raw token patterns in logs.

## Task 8: Prove P1 Zero-Used Volumes Are Safe Before Stopping Anything

**Files:**
- Modify: `/Users/malovnik/Documents/Dev/obsidian-share/docs/railway-finops-audit-2026-05-13.md`

- [ ] **Step 1: Build dependency table**

For each P1 volume candidate, run:

```bash
tmpdir=$(mktemp -d)
cd "$tmpdir"
railway project link --project PROJECT_ID --environment production --service SERVICE_ID --json >/dev/null
railway variable list --json > variables.json
jq -r 'keys[]' variables.json
```

Candidates:

```text
Боты клуба / Postgres-7sSu
Платный транскрибатор / backend
Matrix Messenger / tuwunel
InstaCutter / Postgres
Журнал тренировок / worker
Daily Digest / tg-daily-summary
```

Expected:

- Audit ledger records variable key names, not secret values.

- [ ] **Step 2: Inspect repo references for mounted paths**

Run for each corresponding repo:

```bash
rg -n '/data|/app/data|/var/lib|RAILWAY_VOLUME|DATABASE_URL|PGHOST|PGDATABASE|sqlite|chroma|uploads|storage|volume' /Users/malovnik/Documents/Dev/<repo>
```

Expected:

- Audit ledger records whether code references the volume or database.

- [ ] **Step 3: Decide action per candidate**

Use this decision table:

```text
No code reference + 0 MB volume + service is not public-facing -> propose stop first.
Code reference + 0 MB volume -> inspect why unused; do not stop.
Any public endpoint or user-facing dependency -> no stop without owner confirmation.
Database service with 0 MB volume -> backup/snapshot metadata first, then propose stop before delete.
```

Expected:

- Each P1 candidate has one of: `stop candidate`, `keep`, `needs owner`, `needs backup`.

- [ ] **Step 4: Stop only after explicit approval**

For an approved stop candidate:

```bash
railway service status --all --json > before-stop.json
railway service stop --service SERVICE_ID
railway service status --all --json > after-stop.json
```

Expected:

- Service becomes stopped.
- Dependent public endpoints still pass smoke checks.

## Task 9: P2 Memory And Error-Log Cleanup Plan Per Repo

**Files:**
- Create follow-up plan docs under `/Users/malovnik/Documents/Dev/obsidian-share/docs/superpowers/plans/`
- Modify target repos only after P0/P1 wave is stable

- [ ] **Step 1: Create separate plan for `Сайт продажи клуба`**

Plan file:

```text
/Users/malovnik/Documents/Dev/obsidian-share/docs/superpowers/plans/2026-05-13-ai-club-site-memory.md
```

Required investigation:

```bash
gh repo clone malovnik/ai-club-site /Users/malovnik/Documents/Dev/ai-club-site
cd /Users/malovnik/Documents/Dev/ai-club-site
rg -n 'next|express|vite|serve|start|build|middleware|proxy|console\\.error|logger|process\\.env' .
```

Expected:

- A repo-specific plan for reducing two site services from about `0.834 GB` total idle memory.

- [ ] **Step 2: Create separate plan for `MyCMS-System`**

Plan file:

```text
/Users/malovnik/Documents/Dev/obsidian-share/docs/superpowers/plans/2026-05-13-mycms-system-memory.md
```

Required investigation:

```bash
gh repo clone malovnik/MyCMS-System /Users/malovnik/Documents/Dev/MyCMS-System
cd /Users/malovnik/Documents/Dev/MyCMS-System
rg -n 'next|express|fastapi|postgres|sqlite|start|build|console\\.error|logger|process\\.env' .
```

Expected:

- A repo-specific plan for reducing `Система` idle memory and validating whether `База` is active.

- [ ] **Step 3: Create separate plan for `Платный транскрибатор`**

Plan file:

```text
/Users/malovnik/Documents/Dev/obsidian-share/docs/superpowers/plans/2026-05-13-transcriber-backend-volume-memory.md
```

Required investigation:

```bash
cd /Users/malovnik/Documents/Dev/Transcriber
rg -n 'volume|uploads|tmp|storage|DATABASE_URL|sqlite|postgres|ffmpeg|whisper|start|build|logger|console\\.error' .
```

Expected:

- A repo-specific plan that treats the paid product as production-critical.

## Task 10: Update The Private Audit Ledger After Each Wave

**Files:**
- Modify: `/Users/malovnik/Documents/Dev/obsidian-share/docs/railway-finops-audit-2026-05-13.md`

- [ ] **Step 1: Add wave status table**

Add this table under `### Batch Recommendations`:

```markdown
### Optimization Wave Status

| Wave | Scope | Status | Evidence | Next decision |
|---|---|---|---|---|
| P0 token log leakage | 5 affected services | not started | batch audit 2026-05-13 | code redaction, deploy, verify, rotate |
| P1 zero-used volumes | 6 candidates | not started | batch audit 2026-05-13 | dependency proof before stop |
| P2 memory/log cleanup | site/app repos | not started | batch audit 2026-05-13 | repo-specific plans |
```

- [ ] **Step 2: Keep the doc private**

Run:

```bash
cd /Users/malovnik/Documents/Dev/obsidian-share
git status --short
```

Expected:

- `docs/railway-finops-audit-2026-05-13.md` remains untracked or local-only until a redacted/public version is intentionally created.

## Self-Review

### Spec Coverage

- User asked for a real superpowers plan: this file was created using `claude-plugin-superpowers-writing-plans` structure.
- User wants optimization: tasks cover P0, P1, and P2 from the Railway batch audit.
- User wants autonomous, planned execution: tasks are ordered by blast radius and evidence gates.
- User excluded Obsidian Publisher: this plan keeps it on observation track and does not include it in optimization waves.

### Placeholder Scan

- No task depends on unspecified files for P0.
- P1 and P2 discovery commands name exact target repos, exact evidence commands, and exact decision criteria.
- Token rotation is explicitly gated after log redaction verification.

### Type And Command Consistency

- Python validation uses `uv`.
- Railway mutations are gated behind explicit approval for token variables and stop actions.
- Internal Railway IDs stay in the private audit ledger, not in a public push.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-13-railway-finops-optimization.md`.

Two execution options:

1. Subagent-Driven (recommended): dispatch a fresh subagent per repo/wave, review between tasks, fastest when multiple repos are involved.
2. Inline Execution: execute tasks in this session using executing-plans, sequential wave execution with checkpoints.

