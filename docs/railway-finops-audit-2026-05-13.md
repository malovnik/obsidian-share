# Railway FinOps Audit

Date: 2026-05-13
Workspace: `malovnik's Projects`
Workspace ID: `6f59d854-9de8-44d5-9090-b85724ea1354`
Mode: read-only inventory and audit log

## Purpose

Find Railway projects that can be made cheaper without breaking production, losing data, changing domains, or doing silent migrations.

This document is the working audit ledger. First pass is inventory only. Later passes should fill the checklists and notes project by project.

## Guardrails

- No deploys during inventory.
- No service delete, sleep toggle, variable change, domain change, volume change, or plan change without explicit confirmation.
- No database migration or data export/import without backup and restore plan.
- Treat public domains, bot tokens, user data, databases, and paid products as production-critical until proven otherwise.
- Record evidence before recommendations: command, timestamp, service ID, observed metric/log/status.

## Inventory Summary

Command evidence:

```bash
railway whoami --json
railway --version
railway project list --json
```

Observed:

- Railway CLI: `4.31.0`
- Workspaces visible: `1`
- Projects visible: `21`
- Environments visible: `21`
- Services visible: `40`
- Empty projects: `1`

## What We Check In Every Project

### 1. Project Identity

- [ ] Project name and ID recorded.
- [ ] Workspace recorded.
- [ ] Environments recorded.
- [ ] Service list recorded.
- [ ] Linked repo/image source recorded for each service.
- [ ] Public/custom domains recorded.
- [ ] Criticality marked: `prod-critical`, `internal`, `experimental`, `unknown`.

### 2. Runtime State

- [ ] Latest deployment status.
- [ ] Service stopped/running state.
- [ ] Sleep setting.
- [ ] Replica count.
- [ ] Runtime/build system.
- [ ] Start command/pre-deploy command.
- [ ] Restart policy and recent restart loops.
- [ ] Healthcheck presence.

### 3. Usage And Cost Symptoms

- [ ] 24h memory average per service.
- [ ] 72h memory average per service.
- [ ] Latest memory after deploy/restart.
- [ ] CPU average and spikes.
- [ ] Network/egress if visible.
- [ ] Volume/object storage size.
- [ ] Build/deploy frequency.
- [ ] Always-on services that look idle.

### 4. Database And Storage

- [ ] Count databases per project.
- [ ] Identify duplicate or orphan-looking databases.
- [ ] DB size and table/index top offenders.
- [ ] Volume size and actual used size.
- [ ] Large blobs stored in DB.
- [ ] Backup/restore path exists before any change.

### 5. App-Level Waste

- [ ] Production start does not run schema push/migrations every boot.
- [ ] DB client has sane pool/idle/connect limits.
- [ ] Read paths do not write counters/logs synchronously unless needed.
- [ ] Logs do not spam repeated warnings/errors.
- [ ] Background workers are not duplicated.
- [ ] Dev/staging/demo services are not always-on unless needed.

### 6. Recommendation

- [ ] P0 money leak: fix soon.
- [ ] P1 easy win: low-risk optimization.
- [ ] P2 architecture: needs code/data work.
- [ ] P3 observe only.
- [ ] Do not touch without owner/backup.

Recommendation format:

```text
Symptom:
Evidence:
Likely cause:
Expected savings:
Risk:
Next safe action:
Rollback:
```

## Project Inventory

| # | Project | Project ID | Envs | Services | First-pass signal |
|---:|---|---|---:|---|---|
| 1 | Журнал тренировок | `84c3b7db-6907-48fc-b6a6-f24fefc7a0fa` | 1 | `golubika-landing`, `worker` | app + worker pair; check whether worker is always-on |
| 2 | ClaudeInClaude | `58185bae-82bb-4ec7-9eae-a36823c40282` | 1 | `cloud-agent-runtime` | single runtime; check idle memory and restart/log noise |
| 3 | bountiful-harmony | `2f9bbc63-c023-456f-af25-2c4a9489f41c` | 1 | none | empty project; candidate archive/delete only after confirmation |
| 4 | Telegram Genai | `a299db35-42e6-4f0f-ad4a-08c3831e12a7` | 1 | `Бот транскрибатор` | bot/worker; check whether it must be always-on |
| 5 | Сайт продажи клуба | `bb15b8a7-112d-48e2-9b3a-769c6af02607` | 1 | `Основной сайт`, `Сайт под Илью` | two sites; check traffic and sleep/static hosting options |
| 6 | Matrix Messenger | `998b7007-cd27-4baf-919a-50296cb0b6e3` | 1 | `tuwunel` | single service; check if active product or stale |
| 7 | AI Pervoprohodcy 15LP Frank Kern | `17b6fe03-a006-4c7e-93d9-09ad435fede7` | 1 | `tg-bot`, `mini-landings` | bot + landing; check split criticality |
| 8 | Боты клуба | `349d120e-f548-4681-ae0e-b881b419e7c7` | 1 | `Postgres-7sSu`, `Бот Консультант по эфиру Кими Сайты`, `Бот статист Сервер`, `Бот статист Фронт`, `mini-app`, `Postgres`, `ИИшка Клуба` | 7 services incl. 2 Postgres-looking DBs; high-priority audit |
| 9 | Daily Digest | `6177e7ad-6118-43fb-8c57-8175c0d9ac1d` | 1 | `tg-daily-summary` | scheduled/worker candidate; check if always-on is necessary |
| 10 | Universal RAG | `0cd46773-8068-4482-a8b7-56f36b9aa683` | 1 | `MCP сервера`, `Бэкенд`, `Фронтенд`, `Продающий Ленд` | 4 services; check idle memory and whether frontend/landing can be static/sleeping |
| 11 | ПОДАРОК КриптоВыпускникам | `ae144e31-8514-4640-a16a-6dd9c35828c5` | 1 | `web`, `coinchecknimlast` | web + worker/app; check relevance and traffic |
| 12 | OFZ Screener | `8594da08-b6dc-450f-b1a7-a3d814bd517b` | 1 | `ofz-mcp-server`, `ofz-screener` | app + MCP service; check usage and idle memory |
| 13 | Платный транскрибатор | `04204605-406d-456f-8c71-3934eabf3cc8` | 1 | `frontend`, `backend` | paid product; check carefully, likely production-critical |
| 14 | Go YouTube Analyzer | `d7cef726-adb1-412d-b303-be9374de805a` | 1 | `go-youtube-analyzer` | single Go service; likely low memory but verify |
| 15 | MyCMS-System | `93d9c44f-88fc-49d2-a902-ece2942170ce` | 1 | `База`, `Система` | app + DB; check DB size and idle app memory |
| 16 | Ютуб Транскриб МСП | `72773c75-31af-4551-8204-affcd96021e4` | 1 | `youtube-transcript-mcp` | MCP service; check current usage and always-on need |
| 17 | InstaCutter | `60705506-12f1-4aca-ac9b-91c3ce5d6da7` | 1 | `server`, `front`, `Postgres` | frontend + server + DB; high-priority audit |
| 18 | Obsidian Publisher | `bb459d0d-903d-45aa-8675-f82a56cc04e9` | 1 | `Postgres`, `obsidian-share` | already optimized; keep 24h/72h observation |
| 19 | Антон Халанский | `87ff8a48-08d9-4023-9ed6-07842cdf5168` | 1 | `halansky` | single site/app; check if active and whether static/sleep viable |
| 20 | IFS-Reflection-Bot | `5206e0fb-3406-46f9-9f8a-d8b5d8295d38` | 1 | `ПРОД БЕЗ НИКА НЕ ТРОГАТЬ`, `ТРЕНИРОВОЧНЫЙ БОТЛОМАЙ!!!` | explicit do-not-touch prod; audit read-only only |
| 21 | GPT без регистрации | `0a603878-ae20-42d9-93ee-ea8046d31cab` | 1 | `worker` | single worker; check if live/used |

## Project Audit Cards

### 1. Журнал тренировок

- Project ID: `84c3b7db-6907-48fc-b6a6-f24fefc7a0fa`
- Services: `golubika-landing`, `worker`
- Status: inventory only
- Criticality: unknown
- Notes:
  - Need to determine if `worker` is event-driven, scheduled, or always-on.
- Checklist:
  - [ ] Runtime state checked
  - [ ] Usage metrics checked
  - [ ] Logs checked
  - [ ] Domains checked
  - [ ] Data/storage checked
  - [ ] Recommendation written

### 2. ClaudeInClaude

- Project ID: `58185bae-82bb-4ec7-9eae-a36823c40282`
- Services: `cloud-agent-runtime`
- Status: inventory only
- Criticality: unknown
- Notes:
  - Single runtime service; likely judged by idle memory and whether it is still used.
- Checklist:
  - [ ] Runtime state checked
  - [ ] Usage metrics checked
  - [ ] Logs checked
  - [ ] Domains checked
  - [ ] Data/storage checked
  - [ ] Recommendation written

### 3. bountiful-harmony

- Project ID: `2f9bbc63-c023-456f-af25-2c4a9489f41c`
- Services: none
- Status: inventory only
- Criticality: likely empty/unknown
- Notes:
  - No services visible. Potential cleanup candidate, but delete/archive needs explicit confirmation.
- Checklist:
  - [ ] Runtime state checked
  - [ ] Usage metrics checked
  - [ ] Logs checked
  - [ ] Domains checked
  - [ ] Data/storage checked
  - [ ] Recommendation written

### 4. Telegram Genai

- Project ID: `a299db35-42e6-4f0f-ad4a-08c3831e12a7`
- Services: `Бот транскрибатор`
- Status: inventory only
- Criticality: unknown
- Notes:
  - Bot service; check whether webhook/polling design requires always-on runtime.
- Checklist:
  - [ ] Runtime state checked
  - [ ] Usage metrics checked
  - [ ] Logs checked
  - [ ] Domains checked
  - [ ] Data/storage checked
  - [ ] Recommendation written

### 5. Сайт продажи клуба

- Project ID: `bb15b8a7-112d-48e2-9b3a-769c6af02607`
- Services: `Основной сайт`, `Сайт под Илью`
- Status: inventory only
- Criticality: unknown
- Notes:
  - Two site services; check whether either can sleep or be served as static.
- Checklist:
  - [ ] Runtime state checked
  - [ ] Usage metrics checked
  - [ ] Logs checked
  - [ ] Domains checked
  - [ ] Data/storage checked
  - [ ] Recommendation written

### 6. Matrix Messenger

- Project ID: `998b7007-cd27-4baf-919a-50296cb0b6e3`
- Services: `tuwunel`
- Status: inventory only
- Criticality: unknown
- Notes:
  - Need ownership/current-use check before recommending changes.
- Checklist:
  - [ ] Runtime state checked
  - [ ] Usage metrics checked
  - [ ] Logs checked
  - [ ] Domains checked
  - [ ] Data/storage checked
  - [ ] Recommendation written

### 7. AI Pervoprohodcy 15LP Frank Kern

- Project ID: `17b6fe03-a006-4c7e-93d9-09ad435fede7`
- Services: `tg-bot`, `mini-landings`
- Status: inventory only
- Criticality: unknown
- Notes:
  - Bot and landing may have different optimization paths.
- Checklist:
  - [ ] Runtime state checked
  - [ ] Usage metrics checked
  - [ ] Logs checked
  - [ ] Domains checked
  - [ ] Data/storage checked
  - [ ] Recommendation written

### 8. Боты клуба

- Project ID: `349d120e-f548-4681-ae0e-b881b419e7c7`
- Services: `Postgres-7sSu`, `Бот Консультант по эфиру Кими Сайты`, `Бот статист Сервер`, `Бот статист Фронт`, `mini-app`, `Postgres`, `ИИшка Клуба`
- Status: measured read-only on 2026-05-13
- Criticality: mixed; at least `Бот статист Фронт` has custom public domain `clubbot.nikexpert.ru`
- Notes:
  - Highest initial audit priority confirmed: all 7 services are running, and the project has 2 Postgres services.
  - 24h average memory across all services is about `0.477 GB`; latest sampled total is about `0.480 GB`. CPU is near zero.
  - `Postgres-7sSu` is running with a `50 GB` volume configured but `0 MB` current volume usage. This is the strongest cost/cleanup candidate, but dependencies must be checked before any stop/delete.
  - `Postgres` has `50 GB` volume configured and about `1130.6 MB` current usage.
  - Runtime logs for `Бот Консультант по эфиру Кими Сайты` and `Бот статист Сервер` include Telegram polling URLs with full bot token in the message. Tokens were not copied into this document. Treat as security issue: fix logging and rotate affected Telegram tokens after code/config fix.
  - `Бот статист Сервер` logs sampled `80/80` lines as Railway `level=error`, but messages are HTTPX `INFO` successful Telegram `getUpdates`. This creates false error noise.
  - `Бот статист Фронт` logs sampled `80/80` lines as `level=error`; sample includes Next.js `failed-to-find-server-action`. Needs code-level investigation before optimization.
  - `ИИшка Клуба` is the largest memory service here (`~0.158 GB` avg) and logs repeated aiogram "Update is not handled" info messages.
  - Public endpoints sampled: `mini-app` 200, `Бот статист Сервер` root 404, `ИИшка Клуба` 200, `Бот статист Фронт` Railway domain 200, `clubbot.nikexpert.ru` 200.
- Evidence:
  - `railway project list --json`
  - GraphQL project/service query for project `349d120e-f548-4681-ae0e-b881b419e7c7`
  - GraphQL metrics query for environment `1afd4e32-f2a5-4351-b70b-75ca3ecbb31e`, 24h window, grouped by service
  - Temporary local Railway CLI link in `mktemp` directory for service status, variable keys, and sanitized logs
  - Public `curl` checks with `--max-time 15`
- Service metrics:

| Service | Source | Domain signal | 24h avg memory GB | Latest memory GB | 24h avg CPU | Storage/volume | Log signal |
|---|---|---|---:|---:|---:|---|---|
| `Postgres-7sSu` | `ghcr.io/railwayapp-templates/postgres-ssl:17` | none | `0.033650` | `0.037392` | `0.000171` | volume `50 GB`, current `0 MB` | Postgres checkpoint logs marked `error` by Railway |
| `Бот Консультант по эфиру Кими Сайты` | `malovnik/tg-webinar-bot` | none | `0.076302` | `0.075653` | `0.000564` | no volume seen | Telegram token appears in log messages; successful polling marked `error` |
| `Бот статист Сервер` | `malovnik/club-stats-bot` | Railway domain root `404` | `0.077520` | `0.077545` | `0.003265` | no volume seen | Telegram token appears in log messages; successful polling marked `error` |
| `Бот статист Фронт` | `malovnik/club-stats-bot` | Railway domain `200`, custom `clubbot.nikexpert.ru` `200` | `0.064595` | `0.064262` | `0.000003` | no volume seen | Next.js `failed-to-find-server-action` errors |
| `mini-app` | `malovnik/club-stats-bot` | Railway domain `200` | `0.040473` | `0.040473` | `0.000000` | no volume seen | old nginx favicon error only in small sample |
| `Postgres` | `ghcr.io/railwayapp-templates/postgres-ssl:17` | none | `0.026910` | `0.026972` | `0.000180` | volume `50 GB`, current `1130.6 MB` | Postgres checkpoint logs marked `error` by Railway |
| `ИИшка Клуба` | `malovnik/ai-bot-for-club` | Railway domain `200` | `0.157875` | `0.157794` | `0.000120` | no volume seen | repeated aiogram unhandled update info |

- Recommendation:
  - P0 security: stop leaking Telegram bot tokens into logs, then rotate affected Telegram tokens. Do not rotate before code/log fix or the new token will leak again.
  - P1 cost/cleanup: investigate whether `Postgres-7sSu` is referenced by any running service. If not referenced, plan backup/snapshot and then stop/delete after explicit approval.
  - P1 noise/reliability: fix logging levels for Telegram polling services so successful `getUpdates` calls are not emitted as Railway errors.
  - P2 code quality: investigate `Бот статист Фронт` Next.js `failed-to-find-server-action` errors in `malovnik/club-stats-bot`.
  - P3 cost: this project is not a huge memory offender compared with the old Obsidian Publisher state; likely savings are cleanup/security/noise plus possibly one unused Postgres service.
- Checklist:
  - [x] Runtime state checked
  - [x] Usage metrics checked
  - [x] Logs checked
  - [x] Domains checked
  - [x] Data/storage checked
  - [x] Recommendation written

### 9. Daily Digest

- Project ID: `6177e7ad-6118-43fb-8c57-8175c0d9ac1d`
- Services: `tg-daily-summary`
- Status: inventory only
- Criticality: unknown
- Notes:
  - Name suggests scheduled workload; verify whether it needs always-on service.
- Checklist:
  - [ ] Runtime state checked
  - [ ] Usage metrics checked
  - [ ] Logs checked
  - [ ] Domains checked
  - [ ] Data/storage checked
  - [ ] Recommendation written

### 10. Universal RAG

- Project ID: `0cd46773-8068-4482-a8b7-56f36b9aa683`
- Services: `MCP сервера`, `Бэкенд`, `Фронтенд`, `Продающий Ленд`
- Status: inventory only
- Criticality: unknown
- Notes:
  - Multi-service project; check frontend/landing static or sleep options separately from backend/MCP.
- Checklist:
  - [ ] Runtime state checked
  - [ ] Usage metrics checked
  - [ ] Logs checked
  - [ ] Domains checked
  - [ ] Data/storage checked
  - [ ] Recommendation written

### 11. ПОДАРОК КриптоВыпускникам

- Project ID: `ae144e31-8514-4640-a16a-6dd9c35828c5`
- Services: `web`, `coinchecknimlast`
- Status: inventory only
- Criticality: unknown
- Notes:
  - Need to check whether campaign/project is still active.
- Checklist:
  - [ ] Runtime state checked
  - [ ] Usage metrics checked
  - [ ] Logs checked
  - [ ] Domains checked
  - [ ] Data/storage checked
  - [ ] Recommendation written

### 12. OFZ Screener

- Project ID: `8594da08-b6dc-450f-b1a7-a3d814bd517b`
- Services: `ofz-mcp-server`, `ofz-screener`
- Status: inventory only
- Criticality: unknown
- Notes:
  - App + MCP service; audit should check traffic and whether MCP must be always-on.
- Checklist:
  - [ ] Runtime state checked
  - [ ] Usage metrics checked
  - [ ] Logs checked
  - [ ] Domains checked
  - [ ] Data/storage checked
  - [ ] Recommendation written

### 13. Платный транскрибатор

- Project ID: `04204605-406d-456f-8c71-3934eabf3cc8`
- Services: `frontend`, `backend`
- Status: inventory only
- Criticality: likely prod-critical
- Notes:
  - Paid product assumption. Treat changes as high-risk until confirmed.
- Checklist:
  - [ ] Runtime state checked
  - [ ] Usage metrics checked
  - [ ] Logs checked
  - [ ] Domains checked
  - [ ] Data/storage checked
  - [ ] Recommendation written

### 14. Go YouTube Analyzer

- Project ID: `d7cef726-adb1-412d-b303-be9374de805a`
- Services: `go-youtube-analyzer`
- Status: inventory only
- Criticality: unknown
- Notes:
  - Go service may already be memory-efficient; verify before spending time.
- Checklist:
  - [ ] Runtime state checked
  - [ ] Usage metrics checked
  - [ ] Logs checked
  - [ ] Domains checked
  - [ ] Data/storage checked
  - [ ] Recommendation written

### 15. MyCMS-System

- Project ID: `93d9c44f-88fc-49d2-a902-ece2942170ce`
- Services: `База`, `Система`
- Status: inventory only
- Criticality: unknown
- Notes:
  - App + DB; audit DB size, connection behavior, and app idle memory.
- Checklist:
  - [ ] Runtime state checked
  - [ ] Usage metrics checked
  - [ ] Logs checked
  - [ ] Domains checked
  - [ ] Data/storage checked
  - [ ] Recommendation written

### 16. Ютуб Транскриб МСП

- Project ID: `72773c75-31af-4551-8204-affcd96021e4`
- Services: `youtube-transcript-mcp`
- Status: inventory only
- Criticality: unknown
- Notes:
  - MCP service; check if there is current traffic and whether always-on is justified.
- Checklist:
  - [ ] Runtime state checked
  - [ ] Usage metrics checked
  - [ ] Logs checked
  - [ ] Domains checked
  - [ ] Data/storage checked
  - [ ] Recommendation written

### 17. InstaCutter

- Project ID: `60705506-12f1-4aca-ac9b-91c3ce5d6da7`
- Services: `server`, `front`, `Postgres`
- Status: inventory only
- Criticality: unknown
- Notes:
  - High-priority audit: frontend + backend + DB means several possible idle memory/storage leaks.
- Checklist:
  - [ ] Runtime state checked
  - [ ] Usage metrics checked
  - [ ] Logs checked
  - [ ] Domains checked
  - [ ] Data/storage checked
  - [ ] Recommendation written

### 18. Obsidian Publisher

- Project ID: `bb459d0d-903d-45aa-8675-f82a56cc04e9`
- Services: `Postgres`, `obsidian-share`
- Status: Gate 3 optimization deployed; observe 24h/72h
- Criticality: prod-critical
- Notes:
  - Already optimized production start, DB pool, and SSR article view-counter writes.
  - Keep observation before deciding image storage or platform migration.
- Checklist:
  - [x] Runtime state checked
  - [x] Usage metrics baseline checked
  - [x] Logs checked
  - [x] Domains checked
  - [x] Data/storage checked
  - [ ] 24h/72h recommendation written

### 19. Антон Халанский

- Project ID: `87ff8a48-08d9-4023-9ed6-07842cdf5168`
- Services: `halansky`
- Status: inventory only
- Criticality: unknown
- Notes:
  - Single site/app; check if active and whether sleep/static hosting is safe.
- Checklist:
  - [ ] Runtime state checked
  - [ ] Usage metrics checked
  - [ ] Logs checked
  - [ ] Domains checked
  - [ ] Data/storage checked
  - [ ] Recommendation written

### 20. IFS-Reflection-Bot

- Project ID: `5206e0fb-3406-46f9-9f8a-d8b5d8295d38`
- Services: `ПРОД БЕЗ НИКА НЕ ТРОГАТЬ`, `ТРЕНИРОВОЧНЫЙ БОТЛОМАЙ!!!`
- Status: inventory only
- Criticality: prod-critical/unknown
- Notes:
  - Service name explicitly says not to touch prod without Nikita. Audit read-only only.
- Checklist:
  - [ ] Runtime state checked
  - [ ] Usage metrics checked
  - [ ] Logs checked
  - [ ] Domains checked
  - [ ] Data/storage checked
  - [ ] Recommendation written

### 21. GPT без регистрации

- Project ID: `0a603878-ae20-42d9-93ee-ea8046d31cab`
- Services: `worker`
- Status: inventory only
- Criticality: unknown
- Notes:
  - Single worker; check if it is live, idle, or obsolete.
- Checklist:
  - [ ] Runtime state checked
  - [ ] Usage metrics checked
  - [ ] Logs checked
  - [ ] Domains checked
  - [ ] Data/storage checked
  - [ ] Recommendation written

## Batch Measurement Pass 2026-05-13

Generated: `2026-05-13T08:08:55.351Z`
Window: `2026-05-12T08:08:55.351Z` -> `2026-05-13T08:08:55.351Z`
Scope: all Railway projects except `Obsidian Publisher`.
Mode: read-only. No deploys, deletes, variable changes, sleep toggles, domain changes, or database mutations.

### Batch Summary

- Projects checked: `20`
- Services checked: `38`
- Priority split: `P0=4`, `P1=6`, `P2=4`, `P3=6`
- `P0` means security or urgent correctness risk, not necessarily highest cost.
- Token-like secrets found in logs are recorded only as `token_leak`; raw tokens are not copied into this document.

| Priority | Project | Services | Running | 24h avg mem GB | Latest mem GB | 24h avg CPU | Findings |
|---|---|---:|---:|---:|---:|---:|---|
| P0 | ПОДАРОК КриптоВыпускникам | 2 | 2 | 0.523 | 0.523 | 0.0021 | 2 |
| P0 | Боты клуба | 7 | 7 | 0.477 | 0.480 | 0.0043 | 8 |
| P0 | GPT без регистрации | 1 | 1 | 0.073 | 0.074 | 0.0004 | 2 |
| P0 | AI Pervoprohodcy 15LP Frank Kern | 2 | 2 | 0.059 | 0.059 | 0.0003 | 2 |
| P1 | Платный транскрибатор | 2 | 2 | 0.378 | 0.378 | 0.0000 | 2 |
| P1 | Matrix Messenger | 1 | 1 | 0.344 | 0.343 | 0.0001 | 2 |
| P1 | InstaCutter | 3 | 3 | 0.341 | 0.343 | 0.0010 | 3 |
| P1 | Журнал тренировок | 2 | 2 | 0.132 | 0.132 | 0.0002 | 2 |
| P1 | Daily Digest | 1 | 1 | 0.084 | 0.083 | 0.0002 | 2 |
| P1 | bountiful-harmony | 0 | 0 | 0.000 | 0.000 | 0.0000 | 1 |
| P2 | Сайт продажи клуба | 2 | 2 | 0.834 | 0.829 | 0.0000 | 4 |
| P2 | MyCMS-System | 2 | 2 | 0.505 | 0.505 | 0.0002 | 3 |
| P2 | IFS-Reflection-Bot | 2 | 1 | 0.162 | 0.163 | 0.0001 | 1 |
| P2 | Telegram Genai | 1 | 1 | 0.017 | 0.017 | 0.0001 | 1 |
| P3 | Universal RAG | 4 | 1 | 0.857 | 0.870 | 0.1193 | 0 |
| P3 | OFZ Screener | 2 | 2 | 0.171 | 0.170 | 0.0000 | 0 |
| P3 | Ютуб Транскриб МСП | 1 | 1 | 0.135 | 0.135 | 0.0020 | 0 |
| P3 | Антон Халанский | 1 | 1 | 0.100 | 0.098 | 0.0000 | 0 |
| P3 | ClaudeInClaude | 1 | 1 | 0.099 | 0.096 | 0.0000 | 0 |
| P3 | Go YouTube Analyzer | 1 | 1 | 0.008 | 0.008 | 0.0000 | 0 |

### Top Findings

#### P0

- ПОДАРОК КриптоВыпускникам: coinchecknimlast: token-like Telegram bot URL appears in logs; fix logging then rotate token.
- Боты клуба: Бот статист Сервер: token-like Telegram bot URL appears in logs; fix logging then rotate token.
- Боты клуба: Бот Консультант по эфиру Кими Сайты: token-like Telegram bot URL appears in logs; fix logging then rotate token.
- GPT без регистрации: worker: token-like Telegram bot URL appears in logs; fix logging then rotate token.
- AI Pervoprohodcy 15LP Frank Kern: tg-bot: token-like Telegram bot URL appears in logs; fix logging then rotate token.

#### P1

- Боты клуба: Postgres-7sSu: running service has 49 GB volume with 0 MB used; check dependencies before stop/delete.
- Платный транскрибатор: backend: running service has 49 GB volume with 0 MB used; check dependencies before stop/delete.
- Matrix Messenger: tuwunel: running service has 49 GB volume with 0 MB used; check dependencies before stop/delete.
- InstaCutter: Postgres: running service has 49 GB volume with 0 MB used; check dependencies before stop/delete.
- Журнал тренировок: worker: running service has 49 GB volume with 0 MB used; check dependencies before stop/delete.
- Daily Digest: tg-daily-summary: running service has 49 GB volume with 0 MB used; check dependencies before stop/delete.
- bountiful-harmony: Empty project with no services; candidate for archive/delete after confirmation.

#### P2

- ПОДАРОК КриптоВыпускникам: coinchecknimlast: moderate idle memory avg 0.439 GB with very low CPU.
- Боты клуба: Бот статист Сервер: recent logs are mostly Railway level=error; inspect log level / runtime errors.
- Боты клуба: Postgres: recent logs are mostly Railway level=error; inspect log level / runtime errors.
- Боты клуба: Postgres-7sSu: recent logs are mostly Railway level=error; inspect log level / runtime errors.
- Боты клуба: Бот Консультант по эфиру Кими Сайты: recent logs are mostly Railway level=error; inspect log level / runtime errors.
- Боты клуба: Бот статист Фронт: recent logs are mostly Railway level=error; inspect log level / runtime errors.
- GPT без регистрации: worker: recent logs are mostly Railway level=error; inspect log level / runtime errors.
- AI Pervoprohodcy 15LP Frank Kern: tg-bot: recent logs are mostly Railway level=error; inspect log level / runtime errors.
- Платный транскрибатор: backend: moderate idle memory avg 0.334 GB with very low CPU.
- Matrix Messenger: tuwunel: moderate idle memory avg 0.344 GB with very low CPU.
- InstaCutter: server: recent logs are mostly Railway level=error; inspect log level / runtime errors.
- InstaCutter: Postgres: recent logs are mostly Railway level=error; inspect log level / runtime errors.
- Журнал тренировок: worker: recent logs are mostly Railway level=error; inspect log level / runtime errors.
- Daily Digest: tg-daily-summary: recent logs are mostly Railway level=error; inspect log level / runtime errors.
- Сайт продажи клуба: Сайт под Илью: moderate idle memory avg 0.434 GB with very low CPU.
- Сайт продажи клуба: Сайт под Илью: recent logs are mostly Railway level=error; inspect log level / runtime errors.
- Сайт продажи клуба: Основной сайт: moderate idle memory avg 0.400 GB with very low CPU.
- Сайт продажи клуба: Основной сайт: recent logs are mostly Railway level=error; inspect log level / runtime errors.
- MyCMS-System: Система: moderate idle memory avg 0.476 GB with very low CPU.
- MyCMS-System: Система: recent logs are mostly Railway level=error; inspect log level / runtime errors.
- MyCMS-System: База: recent logs are mostly Railway level=error; inspect log level / runtime errors.
- IFS-Reflection-Bot: ПРОД БЕЗ НИКА НЕ ТРОГАТЬ: recent logs are mostly Railway level=error; inspect log level / runtime errors.
- Telegram Genai: Бот транскрибатор: recent logs are mostly Railway level=error; inspect log level / runtime errors.

### Per-Project Results

#### ПОДАРОК КриптоВыпускникам

- Project ID: `ae144e31-8514-4640-a16a-6dd9c35828c5`
- Environment: `production` (`a411327c-9995-4a0c-b740-cdfb38bd94c0`)
- Priority: `P0`
- Services: `2`; running: `2`
- 24h avg memory: `0.523 GB`; latest memory: `0.523 GB`; avg CPU: `0.0021`
- Findings:
  - [P0] coinchecknimlast: token-like Telegram bot URL appears in logs; fix logging then rotate token.
  - [P2] coinchecknimlast: moderate idle memory avg 0.439 GB with very low CPU.

| Service | Status | Source | 24h avg mem GB | CPU avg | Volume | Domain checks | Log signal |
|---|---|---|---:|---:|---|---|---|
| coinchecknimlast | SUCCESS/running | malovnik/coinchecknimlast | 0.439 | 0.0007 | - | - | token_leak; info:40 |
| web | SUCCESS/running | malovnik/crypto-channel-checker | 0.084 | 0.0014 | - | web-production-51367.up.railway.app:200, web-production-7fbaf.up.railway.app:200 | info:29 |

#### Боты клуба

- Project ID: `349d120e-f548-4681-ae0e-b881b419e7c7`
- Environment: `production` (`1afd4e32-f2a5-4351-b70b-75ca3ecbb31e`)
- Priority: `P0`
- Services: `7`; running: `7`
- 24h avg memory: `0.477 GB`; latest memory: `0.480 GB`; avg CPU: `0.0043`
- Findings:
  - [P0] Бот статист Сервер: token-like Telegram bot URL appears in logs; fix logging then rotate token.
  - [P2] Бот статист Сервер: recent logs are mostly Railway level=error; inspect log level / runtime errors.
  - [P2] Postgres: recent logs are mostly Railway level=error; inspect log level / runtime errors.
  - [P1] Postgres-7sSu: running service has 49 GB volume with 0 MB used; check dependencies before stop/delete.
  - [P2] Postgres-7sSu: recent logs are mostly Railway level=error; inspect log level / runtime errors.
  - [P0] Бот Консультант по эфиру Кими Сайты: token-like Telegram bot URL appears in logs; fix logging then rotate token.
  - [P2] Бот Консультант по эфиру Кими Сайты: recent logs are mostly Railway level=error; inspect log level / runtime errors.
  - [P2] Бот статист Фронт: recent logs are mostly Railway level=error; inspect log level / runtime errors.

| Service | Status | Source | 24h avg mem GB | CPU avg | Volume | Domain checks | Log signal |
|---|---|---|---:|---:|---|---|---|
| mini-app | SUCCESS/running | malovnik/club-stats-bot | 0.040 | 0.0000 | - | mini-app-production-f436.up.railway.app:200 | info:5, error:1 |
| Бот статист Сервер | SUCCESS/running | malovnik/club-stats-bot | 0.078 | 0.0033 | - | bot-statist-server-production.up.railway.app:404 | token_leak; error:40 |
| Postgres | SUCCESS/running | ghcr.io/railwayapp-templates/postgres-ssl:17 | 0.027 | 0.0002 | 49GB/1131MB | - | error:40 |
| Postgres-7sSu | SUCCESS/running | ghcr.io/railwayapp-templates/postgres-ssl:17 | 0.034 | 0.0002 | 49GB/0MB | - | error:40 |
| ИИшка Клуба | SUCCESS/running | malovnik/ai-bot-for-club | 0.158 | 0.0001 | - | ai-bot-for-club-production.up.railway.app:200 | info:40 |
| Бот Консультант по эфиру Кими Сайты | SUCCESS/running | malovnik/tg-webinar-bot | 0.076 | 0.0006 | - | - | token_leak; error:40 |
| Бот статист Фронт | SUCCESS/running | malovnik/club-stats-bot | 0.065 | 0.0000 | - | bot-statist-front-production.up.railway.app:200, clubbot.nikexpert.ru:200 | error:40 |

#### GPT без регистрации

- Project ID: `0a603878-ae20-42d9-93ee-ea8046d31cab`
- Environment: `production` (`e0475ea6-234a-4b5f-8443-042cf66d1b17`)
- Priority: `P0`
- Services: `1`; running: `1`
- 24h avg memory: `0.073 GB`; latest memory: `0.074 GB`; avg CPU: `0.0004`
- Findings:
  - [P0] worker: token-like Telegram bot URL appears in logs; fix logging then rotate token.
  - [P2] worker: recent logs are mostly Railway level=error; inspect log level / runtime errors.

| Service | Status | Source | 24h avg mem GB | CPU avg | Volume | Domain checks | Log signal |
|---|---|---|---:|---:|---|---|---|
| worker | SUCCESS/running | malovnik/free_gpt_tg | 0.073 | 0.0004 | 5GB/0MB | worker-production-e295.up.railway.app:200 | token_leak; error:40 |

#### AI Pervoprohodcy 15LP Frank Kern

- Project ID: `17b6fe03-a006-4c7e-93d9-09ad435fede7`
- Environment: `production` (`1b255f1a-03a3-47e4-b426-c892ad1d335e`)
- Priority: `P0`
- Services: `2`; running: `2`
- 24h avg memory: `0.059 GB`; latest memory: `0.059 GB`; avg CPU: `0.0003`
- Findings:
  - [P0] tg-bot: token-like Telegram bot URL appears in logs; fix logging then rotate token.
  - [P2] tg-bot: recent logs are mostly Railway level=error; inspect log level / runtime errors.

| Service | Status | Source | 24h avg mem GB | CPU avg | Volume | Domain checks | Log signal |
|---|---|---|---:|---:|---|---|---|
| mini-landings | SUCCESS/running | malovnik/ai-vsl-kern | 0.018 | 0.0001 | 49GB/1120MB | mini-landings-production.up.railway.app:200, 15ab.nikexpert.ru:200 | quiet |
| tg-bot | SUCCESS/running | malovnik/ai-vsl-kern | 0.041 | 0.0002 | 49GB/1060MB | tg-bot-production-45c8.up.railway.app:502 | token_leak; error:40 |

#### Платный транскрибатор

- Project ID: `04204605-406d-456f-8c71-3934eabf3cc8`
- Environment: `production` (`eebbc0f9-f50a-4261-942e-f2314d8e8508`)
- Priority: `P1`
- Services: `2`; running: `2`
- 24h avg memory: `0.378 GB`; latest memory: `0.378 GB`; avg CPU: `0.0000`
- Findings:
  - [P1] backend: running service has 49 GB volume with 0 MB used; check dependencies before stop/delete.
  - [P2] backend: moderate idle memory avg 0.334 GB with very low CPU.

| Service | Status | Source | 24h avg mem GB | CPU avg | Volume | Domain checks | Log signal |
|---|---|---|---:|---:|---|---|---|
| frontend | SUCCESS/running | malovnik/Transcriber | 0.044 | 0.0000 | - | frontend-production-ecdc.up.railway.app:200 | quiet |
| backend | SUCCESS/running | malovnik/Transcriber | 0.334 | 0.0000 | 49GB/0MB | backend-production-7382.up.railway.app:200 | info:40 |

#### Matrix Messenger

- Project ID: `998b7007-cd27-4baf-919a-50296cb0b6e3`
- Environment: `production` (`b0f2fb58-bd0b-4ba7-aaa8-cc40875c071b`)
- Priority: `P1`
- Services: `1`; running: `1`
- 24h avg memory: `0.344 GB`; latest memory: `0.343 GB`; avg CPU: `0.0001`
- Findings:
  - [P1] tuwunel: running service has 49 GB volume with 0 MB used; check dependencies before stop/delete.
  - [P2] tuwunel: moderate idle memory avg 0.344 GB with very low CPU.

| Service | Status | Source | 24h avg mem GB | CPU avg | Volume | Domain checks | Log signal |
|---|---|---|---:|---:|---|---|---|
| tuwunel | SUCCESS/running | malovnik/tuwunel-matrix | 0.344 | 0.0001 | 49GB/0MB | msg.nikexpert.ru:200 | quiet |

#### InstaCutter

- Project ID: `60705506-12f1-4aca-ac9b-91c3ce5d6da7`
- Environment: `production` (`ba20e86e-4dd5-4b78-a184-26a1ee3dfba6`)
- Priority: `P1`
- Services: `3`; running: `3`
- 24h avg memory: `0.341 GB`; latest memory: `0.343 GB`; avg CPU: `0.0010`
- Findings:
  - [P2] server: recent logs are mostly Railway level=error; inspect log level / runtime errors.
  - [P1] Postgres: running service has 49 GB volume with 0 MB used; check dependencies before stop/delete.
  - [P2] Postgres: recent logs are mostly Railway level=error; inspect log level / runtime errors.

| Service | Status | Source | 24h avg mem GB | CPU avg | Volume | Domain checks | Log signal |
|---|---|---|---:|---:|---|---|---|
| server | SUCCESS/running | malovnik/instacutter | 0.199 | 0.0000 | - | server-production-9866.up.railway.app:404 | error:35, info:5 |
| Postgres | SUCCESS/running | ghcr.io/railwayapp-templates/postgres-ssl:17 | 0.034 | 0.0002 | 49GB/0MB | - | error:40 |
| front | SUCCESS/running | malovnik/instacutter | 0.108 | 0.0008 | - | instacutter-production.up.railway.app:200, instacut.nikexpert.ru:200 | quiet |

#### Журнал тренировок

- Project ID: `84c3b7db-6907-48fc-b6a6-f24fefc7a0fa`
- Environment: `production` (`71e1cb5c-12b2-49a8-a733-9f4179f5cccc`)
- Priority: `P1`
- Services: `2`; running: `2`
- 24h avg memory: `0.132 GB`; latest memory: `0.132 GB`; avg CPU: `0.0002`
- Findings:
  - [P1] worker: running service has 49 GB volume with 0 MB used; check dependencies before stop/delete.
  - [P2] worker: recent logs are mostly Railway level=error; inspect log level / runtime errors.

| Service | Status | Source | 24h avg mem GB | CPU avg | Volume | Domain checks | Log signal |
|---|---|---|---:|---:|---|---|---|
| golubika-landing | SUCCESS/running | malovnik/golubika-landing | 0.022 | 0.0001 | - | golubika-landing-production.up.railway.app:200 | info:40 |
| worker | SUCCESS/running | malovnik/moyperviyrepo | 0.110 | 0.0001 | 49GB/0MB | - | error:40 |

#### Daily Digest

- Project ID: `6177e7ad-6118-43fb-8c57-8175c0d9ac1d`
- Environment: `production` (`18327603-898a-4b07-957f-ffb5561ad6b4`)
- Priority: `P1`
- Services: `1`; running: `1`
- 24h avg memory: `0.084 GB`; latest memory: `0.083 GB`; avg CPU: `0.0002`
- Findings:
  - [P1] tg-daily-summary: running service has 49 GB volume with 0 MB used; check dependencies before stop/delete.
  - [P2] tg-daily-summary: recent logs are mostly Railway level=error; inspect log level / runtime errors.

| Service | Status | Source | 24h avg mem GB | CPU avg | Volume | Domain checks | Log signal |
|---|---|---|---:|---:|---|---|---|
| tg-daily-summary | SUCCESS/running | malovnik/tg-daily-summary | 0.084 | 0.0002 | 49GB/0MB | - | error:40 |

#### bountiful-harmony

- Project ID: `2f9bbc63-c023-456f-af25-2c4a9489f41c`
- Environment: `production` (`75979709-6c4f-48f3-af07-3c2bd7a8f0a4`)
- Priority: `P1`
- Services: `0`; running: `0`
- 24h avg memory: `0.000 GB`; latest memory: `0.000 GB`; avg CPU: `0.0000`
- Findings:
  - [P1] Empty project with no services; candidate for archive/delete after confirmation.

#### Сайт продажи клуба

- Project ID: `bb15b8a7-112d-48e2-9b3a-769c6af02607`
- Environment: `production` (`031eae7f-a9f7-4024-ac80-d859a278a4b7`)
- Priority: `P2`
- Services: `2`; running: `2`
- 24h avg memory: `0.834 GB`; latest memory: `0.829 GB`; avg CPU: `0.0000`
- Findings:
  - [P2] Сайт под Илью: moderate idle memory avg 0.434 GB with very low CPU.
  - [P2] Сайт под Илью: recent logs are mostly Railway level=error; inspect log level / runtime errors.
  - [P2] Основной сайт: moderate idle memory avg 0.400 GB with very low CPU.
  - [P2] Основной сайт: recent logs are mostly Railway level=error; inspect log level / runtime errors.

| Service | Status | Source | 24h avg mem GB | CPU avg | Volume | Domain checks | Log signal |
|---|---|---|---:|---:|---|---|---|
| Сайт под Илью | SUCCESS/running | malovnik/ai-club-site | 0.434 | 0.0000 | - | sajt-pod-ilyu-production.up.railway.app:200, tsymb.nikexpert.ru:200 | error:40 |
| Основной сайт | SUCCESS/running | malovnik/ai-club-site | 0.400 | 0.0000 | - | ai-club-site-production.up.railway.app:200, club.nikexpert.ru:200 | error:40 |

#### MyCMS-System

- Project ID: `93d9c44f-88fc-49d2-a902-ece2942170ce`
- Environment: `production` (`296eecc0-35e9-4323-abf8-9dc3daea490a`)
- Priority: `P2`
- Services: `2`; running: `2`
- 24h avg memory: `0.505 GB`; latest memory: `0.505 GB`; avg CPU: `0.0002`
- Findings:
  - [P2] Система: moderate idle memory avg 0.476 GB with very low CPU.
  - [P2] Система: recent logs are mostly Railway level=error; inspect log level / runtime errors.
  - [P2] База: recent logs are mostly Railway level=error; inspect log level / runtime errors.

| Service | Status | Source | 24h avg mem GB | CPU avg | Volume | Domain checks | Log signal |
|---|---|---|---:|---:|---|---|---|
| Система | SUCCESS/running | malovnik/MyCMS-System | 0.476 | 0.0001 | 5GB/211MB | mycms-system-production.up.railway.app:200, dev.nikexpert.ru:200 | error:40 |
| База | SUCCESS/running | ghcr.io/railwayapp-templates/postgres-ssl:17 | 0.029 | 0.0002 | 5GB/0MB | - | error:40 |

#### IFS-Reflection-Bot

- Project ID: `5206e0fb-3406-46f9-9f8a-d8b5d8295d38`
- Environment: `production` (`b4ab6dc6-3bb5-4090-9210-6cd419870eae`)
- Priority: `P2`
- Services: `2`; running: `1`
- 24h avg memory: `0.162 GB`; latest memory: `0.163 GB`; avg CPU: `0.0001`
- Findings:
  - [P2] ПРОД БЕЗ НИКА НЕ ТРОГАТЬ: recent logs are mostly Railway level=error; inspect log level / runtime errors.

| Service | Status | Source | 24h avg mem GB | CPU avg | Volume | Domain checks | Log signal |
|---|---|---|---:|---:|---|---|---|
| ПРОД БЕЗ НИКА НЕ ТРОГАТЬ | SUCCESS/running | malovnik/IFSKateBot | 0.162 | 0.0001 | - | - | error:40 |
| ТРЕНИРОВОЧНЫЙ БОТЛОМАЙ!!! | unknown | malovnik/IFSKateBot | - | - | - | - | quiet |

#### Telegram Genai

- Project ID: `a299db35-42e6-4f0f-ad4a-08c3831e12a7`
- Environment: `production` (`dbef87fa-64b5-475d-9143-55623a50d3f2`)
- Priority: `P2`
- Services: `1`; running: `1`
- 24h avg memory: `0.017 GB`; latest memory: `0.017 GB`; avg CPU: `0.0001`
- Findings:
  - [P2] Бот транскрибатор: recent logs are mostly Railway level=error; inspect log level / runtime errors.

| Service | Status | Source | 24h avg mem GB | CPU avg | Volume | Domain checks | Log signal |
|---|---|---|---:|---:|---|---|---|
| Бот транскрибатор | SUCCESS/running | malovnik/bottranscribestructure | 0.017 | 0.0001 | - | - | error:13 |

#### Universal RAG

- Project ID: `0cd46773-8068-4482-a8b7-56f36b9aa683`
- Environment: `production` (`459a3cab-12a6-400a-9d14-ce9d0d03d9d8`)
- Priority: `P3`
- Services: `4`; running: `1`
- 24h avg memory: `0.857 GB`; latest memory: `0.870 GB`; avg CPU: `0.1193`
- Findings: no immediate issue from this read-only pass.

| Service | Status | Source | 24h avg mem GB | CPU avg | Volume | Domain checks | Log signal |
|---|---|---|---:|---:|---|---|---|
| Продающий Ленд | SUCCESS/running | malovnik/kursio-landing | 0.027 | 0.0001 | - | prodayushij-lend-production.up.railway.app:200 | info:40 |
| Бэкенд | NEEDS_APPROVAL/stopped | malovnik/universal-rag | 0.254 | 0.0015 | - | web-production-4d980.up.railway.app:200 | error:29, info:11 |
| Фронтенд | NEEDS_APPROVAL/stopped | malovnik/universal-rag | 0.179 | 0.0000 | - | frontend-production-66ba.up.railway.app:200 | quiet |
| MCP сервера | NEEDS_APPROVAL/stopped | malovnik/universal-rag | 0.398 | 0.1178 | - | mcp-servera-production.up.railway.app:200 | info:27, error:13 |

#### OFZ Screener

- Project ID: `8594da08-b6dc-450f-b1a7-a3d814bd517b`
- Environment: `production` (`39d6f389-d396-4811-b690-8bb43edd7f75`)
- Priority: `P3`
- Services: `2`; running: `2`
- 24h avg memory: `0.171 GB`; latest memory: `0.170 GB`; avg CPU: `0.0000`
- Findings: no immediate issue from this read-only pass.

| Service | Status | Source | 24h avg mem GB | CPU avg | Volume | Domain checks | Log signal |
|---|---|---|---:|---:|---|---|---|
| ofz-screener | SUCCESS/running | malovnik/ofz-screener | 0.067 | 0.0000 | - | ofz-screener-production.up.railway.app:200 | info:40 |
| ofz-mcp-server | SUCCESS/running | malovnik/ofz-mcp-server | 0.104 | 0.0000 | - | ofz-mcp-server-production.up.railway.app:200 | quiet |

#### Ютуб Транскриб МСП

- Project ID: `72773c75-31af-4551-8204-affcd96021e4`
- Environment: `production` (`e3b5e390-1df6-4e54-bd07-f6426b754da4`)
- Priority: `P3`
- Services: `1`; running: `1`
- 24h avg memory: `0.135 GB`; latest memory: `0.135 GB`; avg CPU: `0.0020`
- Findings: no immediate issue from this read-only pass.

| Service | Status | Source | 24h avg mem GB | CPU avg | Volume | Domain checks | Log signal |
|---|---|---|---:|---:|---|---|---|
| youtube-transcript-mcp | SUCCESS/running | malovnik/youtube-transcript-mcp | 0.135 | 0.0020 | - | youtube-transcript-mcp-production-b27c.up.railway.app:200, aitube.nikexpert.ru:200 | info:16, error:24 |

#### Антон Халанский

- Project ID: `87ff8a48-08d9-4023-9ed6-07842cdf5168`
- Environment: `production` (`c429ebaa-431e-4a45-bca4-cf46c0a08372`)
- Priority: `P3`
- Services: `1`; running: `1`
- 24h avg memory: `0.100 GB`; latest memory: `0.098 GB`; avg CPU: `0.0000`
- Findings: no immediate issue from this read-only pass.

| Service | Status | Source | 24h avg mem GB | CPU avg | Volume | Domain checks | Log signal |
|---|---|---|---:|---:|---|---|---|
| halansky | SUCCESS/running | malovnik/halansky | 0.100 | 0.0000 | - | halansky-production.up.railway.app:200 | quiet |

#### ClaudeInClaude

- Project ID: `58185bae-82bb-4ec7-9eae-a36823c40282`
- Environment: `production` (`dbf9cff0-b04e-404d-b138-29df75f9112d`)
- Priority: `P3`
- Services: `1`; running: `1`
- 24h avg memory: `0.099 GB`; latest memory: `0.096 GB`; avg CPU: `0.0000`
- Findings: no immediate issue from this read-only pass.

| Service | Status | Source | 24h avg mem GB | CPU avg | Volume | Domain checks | Log signal |
|---|---|---|---:|---:|---|---|---|
| cloud-agent-runtime | SUCCESS/running | - | 0.099 | 0.0000 | 49GB/1158MB | cloud-agent-runtime-production.up.railway.app:200 | info:19 |

#### Go YouTube Analyzer

- Project ID: `d7cef726-adb1-412d-b303-be9374de805a`
- Environment: `production` (`212ac8bd-0af9-4da6-8c82-c05daa032f82`)
- Priority: `P3`
- Services: `1`; running: `1`
- 24h avg memory: `0.008 GB`; latest memory: `0.008 GB`; avg CPU: `0.0000`
- Findings: no immediate issue from this read-only pass.

| Service | Status | Source | 24h avg mem GB | CPU avg | Volume | Domain checks | Log signal |
|---|---|---|---:|---:|---|---|---|
| go-youtube-analyzer | SUCCESS/running | malovnik/go-youtube-analyzer | 0.008 | 0.0000 | - | go-youtube-analyzer-production.up.railway.app:200 | error:1, info:11 |

### Batch Recommendations

1. Fix P0 log secret leakage first, then rotate affected Telegram tokens. Rotating before log fix will leak new tokens again.
2. For every running `0 MB used / 49 GB volume` candidate, check service variable references and application code before stopping anything.
3. Investigate high-memory or stopped-with-recent-metrics projects separately before cost actions; current status and 24h history can differ.
4. Keep `Obsidian Publisher` on its separate 24h/72h observation track.

### Optimization Wave Status

| Wave | Scope | Status | Evidence | Next decision |
|---|---|---|---|---|
| P0 token log leakage | 5 affected services | deployed, verified | PRs merged and Railway logs checked 2026-05-13 | rotate affected Telegram tokens next; code redaction is now in place |
| P1 zero-used volumes | 6 candidates | dependency proof complete | Railway volume list, variable comparisons, repo code scan, SQL size probes | no stop/delete yet; most candidates are active dependencies |
| P2 memory/log cleanup | site/app repos | not started | batch audit 2026-05-13 | repo-specific plans and post-deploy observation |

### Optimization Execution Log

- 2026-05-13: Started P0 token-log redaction wave. Mode: code redaction first, no token rotation until deployed log redaction is verified.
- 2026-05-13: `ПОДАРОК КриптоВыпускникам / coinchecknimlast` fixed in `malovnik/coinchecknimlast` PR #1. Railway deployment `598dbc81-5b76-4ff0-87fc-0534046ac1eb` reached `SUCCESS`; post-deploy log scan returned `NO_RAW_TOKEN_PATTERN`.
- 2026-05-13: `Боты клуба / Бот статист Сервер` fixed in `malovnik/club-stats-bot` PR #1. Railway deployment `5785c68e-d8a8-4595-8a81-a6a27d4608c0` reached `SUCCESS`; post-deploy log scan returned `NO_RAW_TOKEN_PATTERN`. Remaining note: logs are still mostly Railway `level=error` because this repo still writes normal Python logging to stderr; handle in P2/noise wave.
- 2026-05-13: `GPT без регистрации / worker` fixed in `malovnik/free_gpt_tg` PR #1. GitHub merge did not trigger a fresh Railway deploy, so manual Railway upload was used. Deployment `ae387423-23c0-4dd7-b1e0-9a8d89a5a3b5` reached `SUCCESS`; post-deploy log scan returned `NO_RAW_TOKEN_PATTERN` and `25 info`.
- 2026-05-13: `AI Pervoprohodcy 15LP Frank Kern / tg-bot` fixed in `malovnik/ai-vsl-kern` PR #1. Railway deployment `ed24d710-60ac-426f-a237-24427afcd16c` reached `SUCCESS`; post-deploy log scan returned `NO_RAW_TOKEN_PATTERN` and `5 info`.
- 2026-05-13: `Боты клуба / Бот Консультант по эфиру Кими Сайты` was confirmed to use separate repo `malovnik/tg-webinar-bot`, not `malovnik/club-stats-bot`. Fixed in `malovnik/tg-webinar-bot` PR #1. Railway deployment `8f5f14ce-0c84-4caf-8565-cf53f29e5d50` reached `SUCCESS`; post-deploy log scan returned `NO_RAW_TOKEN_PATTERN` and `34 info`.
- 2026-05-13: P0 code redaction is verified across all five affected services. Token rotation is still required to fully retire secrets that may already have appeared in historical logs; do this only with fresh tokens available and a controlled Railway variable update per service.
- 2026-05-13: Completed P1 dependency proof for zero-used volume candidates without stopping or deleting anything.

### P1 Zero-Used Volume Proof

| Project / service | Volume evidence | Dependency evidence | Decision |
|---|---|---|---|
| `Боты клуба / Postgres-7sSu` | `postgres-7ssu-volume`, `/var/lib/postgresql/data`, Railway shows `0MB/50000MB` | Variable comparison shows `mini-app`, `Бот статист Сервер`, and `Бот статист Фронт` use this DB. Read-only SQL probe reports `11 MB` and `12` user tables. | Active database. Do not stop/delete. Backup first; only consider size/downscale if Railway supports it safely. |
| `Платный транскрибатор / backend` | `backend-volume`, `/app/storage`, Railway shows `0MB/50000MB` | Railway env has `RAILWAY_VOLUME_MOUNT_PATH` and `STORAGE_PATH` pointing to the mount. Code writes uploads, chunks, results, sessions, payments, promo codes, and used token records under `STORAGE_PATH`. | Active paid-product storage path. Do not remove. Consider object storage/DB redesign later, not cleanup. |
| `Matrix Messenger / tuwunel` | `tuwunel-volume`, `/data`, Railway shows `0MB/50000MB` | Railway env has `TUWUNEL_DATABASE_PATH` pointing to the mount. Repo sets `database_path = "/data"` and startup clears `/data/LOCK`. | Active Matrix/Tuwunel database. Do not remove. Candidate for memory tuning, not deletion. |
| `InstaCutter / Postgres` | `postgres-volume`, `/var/lib/postgresql/data`, Railway shows `0MB/50000MB` | `server` `DATABASE_URL` exactly matches this Postgres service. Read-only SQL probe reports `50 MB` and `9` user tables. | Active database. Do not stop/delete. Backup first; optimize app/DB separately. |
| `Журнал тренировок / worker` | `worker-volume`, `/data`, Railway shows `0MB/50000MB` | Railway env has `DB_PATH` on the mounted path. Repo uses SQLite via `aiosqlite` and initializes workout/user/template tables. | Active bot data store. Do not remove. Possible future: confirm backup/export path and reduce volume size if safe. |
| `Daily Digest / tg-daily-summary` | `tg-daily-summary-volume`, `/app/data`, Railway shows `0MB/50000MB` | Railway env has `DB_PATH` on the mounted path. Repo uses SQLite via `aiosqlite`, creates message/topic/summary tables, and runs retention cleanup. | Active digest data store. Do not remove. Possible future: convert to scheduled job only if bot design allows. |
| `bountiful-harmony` | no services visible | empty project in Railway inventory | Safe cleanup candidate, but delete/archive still requires explicit confirmation. |

### Security Findings Outside Cost Scope

- 2026-05-13: `malovnik/Transcriber` is a private repo, but `railway-env-backend.txt` is tracked in Git and contains production backend secrets. Do not quote or copy the values. Next safe action: remove the tracked env dump, add an ignore rule/template, and rotate exposed credentials (`OpenAI`, payment webhook secret, JWT/signing secrets) with a controlled deploy.

### Follow-Up Check 2026-05-14 10:00 HCMC

Scope: read-only heartbeat check after P0 token-log deployments. No Railway infrastructure mutations.

Local tooling note:

- Railway CLI initially failed with `Unauthorized` because `~/.railway/config.json` had a 21-byte invalid trailing fragment after a complete JSON object. The file was backed up to `~/.railway/config.json.bak.20260514100140` and repaired locally. Railway auth then returned user `Nikita`.

P0 deployment and log check:

| Service | Deployment | Status | 6h raw token scan | 6h log levels |
|---|---|---|---|---|
| `coinchecknimlast` | `598dbc81-5b76-4ff0-87fc-0534046ac1eb` | `SUCCESS` | none found | quiet |
| `Бот статист Сервер` | `5785c68e-d8a8-4595-8a81-a6a27d4608c0` | `SUCCESS` | none found | `error:66` |
| `Бот Консультант по эфиру Кими Сайты` | `8f5f14ce-0c84-4caf-8565-cf53f29e5d50` | `SUCCESS` | none found | quiet |
| `GPT без регистрации / worker` | `ae387423-23c0-4dd7-b1e0-9a8d89a5a3b5` | `SUCCESS` | none found | quiet |
| `AI Pervoprohodcy 15LP Frank Kern / tg-bot` | `ed24d710-60ac-426f-a237-24427afcd16c` | `SUCCESS` | none found | `info:13` |

12h memory trend:

| Service | 2026-05-13 baseline/latest GB | 12h avg GB | latest GB | Interpretation |
|---|---:|---:|---:|---|
| `coinchecknimlast` | `0.439` | `0.106` | `0.106` | strong improvement |
| `Бот статист Сервер` | `0.078` | `0.055` | `0.055` | improved, but stderr/error log noise remains |
| `Бот Консультант по эфиру Кими Сайты` | `0.076` | `0.072` | `0.072` | stable/slightly improved |
| `GPT без регистрации / worker` | `0.073` | `0.103` | `0.103` | higher than baseline; observe before acting |
| `AI Pervoprohodcy 15LP Frank Kern / tg-bot` | `0.041` | `0.043` | `0.044` | stable/slightly higher |
| `Obsidian Publisher / obsidian-share` | `0.151` | `0.443` | `0.498` | still far below old 1 GB avg, but climbing from immediate post-deploy low |
| `Obsidian Publisher / Postgres` | `0.234` | `0.242` | `0.226` | stable |

Obsidian public smoke:

- `GET https://read.malovnik.ru/` returned `200`.
- `GET https://read.malovnik.ru/api/notes?limit=3` returned `200` and 3 notes.

Next safe actions:

1. Rotate Telegram bot tokens now that code redaction is deployed.
2. Fix `club-stats-bot` stdout/stderr logging so successful polling is no longer counted as Railway `error`.
3. Continue Obsidian observation for another 24h/72h window; current app memory rose to about `0.50 GB`, which is not a regression to the old `~1.0 GB` average but is no longer the immediate `~0.15 GB` post-deploy low.

### Obsidian Memory Regression Check 2026-05-14 13:42 HCMC

Scope: read-only diagnosis after user reported that `Obsidian Publisher` memory keeps growing again after roughly one day.

Current Railway status:

- Latest active `obsidian-share` deployment: `384f7b70-7e34-480a-8602-e7ac528b2da0`, `SUCCESS`, deployed `2026-05-13 13:14:45 +07:00`.
- Public smoke checks:
  - `GET https://read.malovnik.ru/` returned `200`.
  - `GET https://read.malovnik.ru/api/notes?limit=3` returned `200`.

24h Railway metrics, window `2026-05-13T06:42:58Z` to `2026-05-14T06:42:58Z`:

| Service | Measurement | Min | Avg | Max | Latest |
|---|---|---:|---:|---:|---:|
| `obsidian-share` | `MEMORY_USAGE_GB` | `0.198` | `0.423` | `0.500` | `0.499` |
| `obsidian-share` | `CPU_USAGE` | `0.000010` | `0.000857` | `0.001416` | `0.000015` |
| `Postgres` | `MEMORY_USAGE_GB` | `0.192` | `0.236` | `0.252` | `0.214` |
| `Postgres` | `CPU_USAGE` | `0.000066` | `0.000600` | `0.000854` | `0.000170` |

Live app process snapshot:

| Process | RSS |
|---|---:|
| `next-server (v16.0.10)` | `529452 KB` |
| `npm start` | `73944 KB` |
| `sh -c next start` | `1872 KB` |

`/proc/15/status` for the `next-server` process:

- `VmRSS`: `529452 KB`
- `RssAnon`: `441364 KB`
- `RssFile`: `88088 KB`
- `VmData`: `2383112 KB`
- `Threads`: `43`

Interpretation:

- The active growth is in the Next.js app process, not Postgres.
- Postgres is stable around `0.21-0.24 GB`.
- The app is not back at the old `~1.0 GB` average, but it has stabilized near `~0.5 GB`, so the immediate `~0.15 GB` post-restart reading was not a durable steady state.
- `npm start` alone costs about `74 MB` RSS. Moving Railway start to a standalone Node server should remove that overhead, but it will not solve the whole `next-server` footprint.
- The current durable cost path is runtime and asset architecture: reduce Next.js server overhead first, then move image serving/storage out of the always-on Node/Postgres path.

Recommended next step:

1. Low-risk runtime change: enable Next standalone output and start `node .next/standalone/server.js` directly on Railway. Expected effect: remove the `npm start` process and reduce deployment/runtime overhead. This is a safe intermediate optimization, not the final cost fix.
2. Main cost fix: move image binaries out of Postgres/Node serving path into object storage/CDN-compatible storage, after backup and migration plan. This attacks the real heavy path: `images` table is about `1095 MB` and image requests force the Node app to read bytea payloads into memory.
3. Secondary cleanup: reduce synchronous view-counter writes and fix search-vector NOTICE spam. Useful for DB/write noise, but not the primary app RSS cause.

### All-Projects Remeasurement 2026-05-14 14:03 HCMC

Scope: read-only 24h metrics comparison for all Railway projects after user clarified the focus is the whole Railway workspace, not only `Obsidian Publisher`.

Important correction:

- 2026-05-13 work was not a full optimization of every Railway project.
- Completed changes were P0 token-log redaction deployments for five services, plus P1 dependency proof for zero-used volume candidates.
- Most P1/P2/P3 projects were measured and ranked only; no code/runtime/infrastructure optimization was applied to them yet.

Current 24h window: `2026-05-13T07:03:57Z` to `2026-05-14T07:03:57Z`.

| Project | Baseline avg GB | Current avg GB | Delta avg GB | Current latest GB | Direction |
|---|---:|---:|---:|---:|---|
| `Universal RAG` | `0.857` | `0.895` | `+0.038` | `0.897` | flat/slightly up |
| `Сайт продажи клуба` | `0.834` | `0.806` | `-0.028` | `0.813` | flat |
| `Obsidian Publisher` | `1.228` | `0.671` | `-0.557` | `0.718` | down vs old avg, up vs immediate post-deploy low |
| `MyCMS-System` | `0.505` | `0.495` | `-0.010` | `0.499` | flat |
| `Боты клуба` | `0.477` | `0.424` | `-0.053` | `0.402` | down |
| `Matrix Messenger` | `0.344` | `0.343` | `-0.001` | `0.343` | flat |
| `InstaCutter` | `0.341` | `0.340` | `-0.001` | `0.346` | flat |
| `Платный транскрибатор` | `0.378` | `0.288` | `-0.090` | `0.275` | down |
| `ПОДАРОК КриптоВыпускникам` | `0.523` | `0.259` | `-0.264` | `0.196` | down |
| `ClaudeInClaude` | `0.099` | `0.190` | `+0.091` | `0.190` | up |
| `OFZ Screener` | `0.171` | `0.178` | `+0.007` | `0.180` | flat |
| `IFS-Reflection-Bot` | `0.162` | `0.163` | `+0.001` | `0.163` | flat |
| `Журнал тренировок` | `0.132` | `0.142` | `+0.010` | `0.144` | flat |
| `Ютуб Транскриб МСП` | `0.135` | `0.132` | `-0.003` | `0.130` | flat |
| `GPT без регистрации` | `0.073` | `0.101` | `+0.028` | `0.089` | flat/slightly up |
| `Антон Халанский` | `0.100` | `0.098` | `-0.002` | `0.098` | flat |
| `Daily Digest` | `0.084` | `0.083` | `-0.001` | `0.083` | flat |
| `AI Pervoprohodcy 15LP Frank Kern` | `0.059` | `0.064` | `+0.005` | `0.069` | flat |
| `Telegram Genai` | `0.017` | `0.017` | `+0.000` | `0.017` | flat |
| `Go YouTube Analyzer` | `0.008` | `0.017` | `+0.009` | `0.017` | flat/small absolute increase |
| `bountiful-harmony` | `0.000` | `0.000` | `+0.000` | `0.000` | unchanged empty project |

Interpretation:

- Real decreases are visible in `ПОДАРОК КриптоВыпускникам`, `Платный транскрибатор`, `Боты клуба`, and `Obsidian Publisher` versus old 24h average.
- The largest current memory consumers are still `Universal RAG`, `Сайт продажи клуба`, `Obsidian Publisher`, `MyCMS-System`, and `Боты клуба`.
- `Universal RAG` is currently the biggest workspace memory line item, but previous audit showed several services with stopped/current-status mismatch, so it needs a focused status/history pass before any action.
- `Сайт продажи клуба` and `MyCMS-System` were not optimized yet. They remain the clearest P2 code/runtime candidates.
- `bountiful-harmony` remains a pure cleanup candidate, but deletion/archive requires explicit confirmation.

Next safe batch order:

1. `Сайт продажи клуба`: inspect both site services and determine if they can be static/sleep/combined.
2. `MyCMS-System`: inspect app + DB, remove idle runtime waste or tune deployment.
3. `Universal RAG`: reconcile current running services vs 24h metrics before touching anything.
4. `Obsidian Publisher`: continue dedicated app runtime/image-storage optimization separately.

### Сайт продажи клуба Runtime Optimization 2026-05-14 14:25 HCMC

Scope: safe runtime optimization for both production services in Railway project `bb15b8a7-112d-48e2-9b3a-769c6af02607`; no data stores, migrations, domains, variables, or destructive Railway settings were changed.

Repository: `malovnik/ai-club-site`

Change:

- PR: `https://github.com/malovnik/ai-club-site/pull/1`
- Commit: `cdff4cb fix: use standalone Next runtime on Railway`
- Follow-up docs PR: `https://github.com/malovnik/ai-club-site/pull/2`
- Current `main` commit after both PRs: `08d4ac8 docs: document standalone Railway runtime (#2)`
- Enabled Next.js `output: 'standalone'`.
- Changed runtime start path from full `next start` package runtime to `.next/standalone/server.js`.
- Added a build-time asset copy step for `.next/static` and `public` inside `.next/standalone`.

Why this was safe:

- Static export was not used because the app has a dynamic route: `/api/video/[name]`.
- The app still runs as a Next.js server and keeps the dynamic S3 presigned-video endpoint intact.
- Both services use the same GitHub repo and branch, so the change applied consistently to `Основной сайт` and `Сайт под Илью`.

Validation before deploy:

- `npm ci`: passed.
- `npm run build`: passed.
- Local standalone smoke on `PORT=3107`: `/` returned `200`, `/oferta` returned `200`, `/api/video/test` returned `404` as expected for a missing S3 object.
- `git diff --check`: passed.

Production deployments:

| Service | Deployment | Status | Started |
|---|---|---|---|
| `Основной сайт` | `b587ed0d-36f7-47b4-a1ad-8a4d80e14d1d` | `SUCCESS` | `2026-05-14 14:28:01 +07` |
| `Сайт под Илью` | `43c4cae9-4ce2-488a-8585-a158d648e58c` | `SUCCESS` | `2026-05-14 14:28:01 +07` |

Note: first runtime PR deployed successfully as `0dc20d14-23c1-4430-81bc-542164b37316` and `d43db2bb-b0ff-4e17-af1b-fecdccfa51a1`; docs-only PR #2 triggered another successful Railway deploy and is now the active production deployment for both services.

Production smoke:

| URL | HTTP | Time | Bytes |
|---|---:|---:|---:|
| `https://club.nikexpert.ru/` | `200` | `0.541s` | `101544` |
| `https://club.nikexpert.ru/oferta` | `200` | `0.384s` | `228881` |
| `https://tsymb.nikexpert.ru/` | `200` | `1.670s` | `101544` |
| `https://tsymb.nikexpert.ru/oferta` | `200` | `0.386s` | `228881` |

Immediate runtime evidence:

| Service | cgroup `memory.current` after deploy | Approx MB |
|---|---:|---:|
| `Основной сайт` | `49713152` bytes | `47.4 MB` |
| `Сайт под Илью` | `47853568` bytes | `45.6 MB` |

Log check:

- Both services show the new runtime command: `HOSTNAME=0.0.0.0 node .next/standalone/server.js`.
- Both active services reached ready state after docs-only redeploy: `Ready in 90ms` and `Ready in 73ms`.
- Only error-level log line in the 10-minute post-deploy window was the non-fatal npm warning: `npm warn config production Use --omit=dev instead.`
- No application exception or crash-loop signal was seen during the post-deploy check.

Open follow-up:

- The immediate memory drop is strong, but Railway cost math should be rechecked over a 24h window because memory graphs can settle after warm traffic.
- The runtime is still invoked through Railway/npm as process 1, even though the application command is now standalone Node. If the npm warning remains noisy, add `NPM_CONFIG_OMIT=dev` or adjust Railway start handling later.
- `npm audit` reports `13` vulnerabilities (`4` moderate, `9` high). This was not auto-fixed because dependency upgrades are a separate risk surface from the runtime optimization.

### MyCMS-System Runtime Optimization 2026-05-14 18:52 HCMC

Scope: safe runtime optimization for Railway project `93d9c44f-88fc-49d2-a902-ece2942170ce`, service `Система`; no database, volume, domain, variable, or destructive Railway settings were changed.

Repository: `malovnik/MyCMS-System`

Changes:

- PR #10: `https://github.com/malovnik/MyCMS-System/pull/10`
- Commit on `main`: `9515bfc fix: use standalone Next runtime on Railway`
- Enabled Next.js `output: 'standalone'`.
- Changed Railway/app startup from `npm run migrate:prod && next start` to `npm run migrate:prod && HOSTNAME=0.0.0.0 node .next/standalone/server.js`.
- Added a build-time asset copy step for `.next/static` and `public` into `.next/standalone`.
- Kept `migrate:prod` before app startup because production uses PostgreSQL and Drizzle migrations.

Production hardening follow-up:

- PR #11: `https://github.com/malovnik/MyCMS-System/pull/11`
- Commit on `main`: `0a49527 fix: keep migration runner in production runtime`
- Moved `tsx` from `devDependencies` to `dependencies` at the already locked version `4.20.6`.
- Reason: `migrate:prod` runs during Railway production startup through `npx tsx lib/db/migrate.ts`; before PR #11 Railway had to install `tsx` during runtime startup and logged `npm warn exec`.

Validation before deploy:

- `npm ci`: passed.
- `npm run build`: passed. Local build still logs expected warnings when `DATABASE_URL`/Prodamus variables are absent outside Railway.
- Local standalone smoke on `PORT=3108`: `/about` returned `200`, `/legal/privacy` returned `200`, `/uploads/not-found.png` returned `404`.
- `npm run type-check`: passed after removing stale local `tsconfig.tsbuildinfo`.
- `git diff --check`: passed.
- `npm run lint:check`: blocked by existing ESLint config issue (`Converting circular structure to JSON`) before linting. Not introduced by this runtime change; left for a separate tooling cleanup.

Production deployments:

| Service | Deployment | Status | Commit | Started |
|---|---|---|---|---|
| `Система` | `23c76d89-66f2-4abf-9986-695dc4cee4c6` | `SUCCESS` | `9515bfc` | `2026-05-14 18:39:12 +07` |
| `Система` | `349d15f2-65eb-4cfd-9fd7-013c4b7ff74c` | `SUCCESS` | `0a49527` | `2026-05-14 18:46:18 +07` |

Production smoke after final deployment:

| URL | HTTP | Time | Bytes |
|---|---:|---:|---:|
| `https://dev.nikexpert.ru/` | `200` | `1.667s` | `56294` |
| `https://dev.nikexpert.ru/about` | `200` | `1.125s` | `42776` |
| `https://dev.nikexpert.ru/legal/privacy` | `200` | `0.647s` | `34515` |
| `https://mycms-system-production.up.railway.app/` | `200` | `0.701s` | `56294` |

Immediate runtime evidence after final deployment:

| Service | Baseline 24h avg mem | cgroup `memory.current` after deploy | Approx MB |
|---|---:|---:|---:|
| `Система` | `0.476 GB` | `172937216` bytes | `164.9 MB` |

Log check after final deployment:

- Recent app logs: `31 info`, `0 error`.
- `migrate:prod` completed successfully.
- No `npm warn exec` remained after moving `tsx` into production dependencies.
- Runtime reached ready state: `Ready in 293ms`.

Open follow-up:

- Recheck Railway 24h memory/cost graph tomorrow; immediate cgroup memory suggests a major reduction, but billing graphs should be confirmed over a full window.
- Tooling cleanup candidate: fix ESLint 9 / Next config circular-structure failure so `npm run lint:check` becomes usable again.
- Build-time warnings for local missing `DATABASE_URL`/Prodamus config are noisy but not production failures; consider reducing local build noise separately if it slows future audits.

### All-Projects Remeasurement 2026-05-15 10:38 HCMC

Scope: read-only remeasurement after the `Сайт продажи клуба` and `MyCMS-System` standalone-runtime optimizations. No Railway infrastructure, variables, services, volumes, or deployments were changed during this pass.

Current 24h window: `2026-05-14T03:36:15Z` to `2026-05-15T03:36:15Z`.

| Project | 2026-05-14 avg GB | Current avg GB | Delta avg GB | Current latest GB | CPU avg | Note |
|---|---:|---:|---:|---:|---:|---|
| `Universal RAG` | `0.895` | `0.901` | `+0.006` | `0.905` | `0.1221` | top consumer; live MCP traffic |
| `Obsidian Publisher` | `0.671` | `0.658` | `-0.013` | `0.605` | `0.0008` | still high, architecture work |
| `Боты клуба` | `0.424` | `0.404` | `-0.020` | `0.407` | `0.0027` |  |
| `InstaCutter` | `0.340` | `0.345` | `+0.005` | `0.342` | `0.0011` |  |
| `Matrix Messenger` | `0.343` | `0.343` | `+0.000` | `0.343` | `0.0001` |  |
| `MyCMS-System` | `0.495` | `0.304` | `-0.191` | `0.205` | `0.0004` | standalone win now visible |
| `Платный транскрибатор` | `0.288` | `0.275` | `-0.013` | `0.274` | `0.0000` |  |
| `Сайт продажи клуба` | `0.806` | `0.225` | `-0.581` | `0.120` | `0.0001` | standalone win now visible |
| `ПОДАРОК КриптоВыпускникам` | `0.259` | `0.196` | `-0.063` | `0.196` | `0.0017` |  |
| `ClaudeInClaude` | `0.190` | `0.188` | `-0.002` | `0.188` | `0.0000` |  |
| `OFZ Screener` | `0.178` | `0.179` | `+0.001` | `0.178` | `0.0000` |  |
| `IFS-Reflection-Bot` | `0.163` | `0.166` | `+0.003` | `0.170` | `0.0001` |  |
| `Журнал тренировок` | `0.142` | `0.147` | `+0.005` | `0.148` | `0.0001` |  |
| `Ютуб Транскриб МСП` | `0.132` | `0.130` | `-0.002` | `0.129` | `0.0020` |  |
| `Антон Халанский` | `0.098` | `0.098` | `-0.000` | `0.097` | `0.0000` |  |
| `GPT без регистрации` | `0.101` | `0.089` | `-0.012` | `0.083` | `0.0004` |  |
| `Daily Digest` | `0.083` | `0.084` | `+0.001` | `0.085` | `0.0002` |  |
| `AI Pervoprohodcy 15LP Frank Kern` | `0.064` | `0.069` | `+0.005` | `0.068` | `0.0003` |  |
| `Telegram Genai` | `0.017` | `0.017` | `+0.000` | `0.018` | `0.0001` |  |
| `Go YouTube Analyzer` | `0.017` | `0.017` | `-0.000` | `0.017` | `0.0000` |  |
| `bountiful-harmony` | `0.000` | `0.000` | `+0.000` | `0.000` | `0.0000` | empty project |

Interpretation:

- The `Сайт продажи клуба` optimization is now visible in the 24h graph: `0.806 -> 0.225 GB` avg, latest `0.120 GB`.
- The `MyCMS-System` optimization is now visible but only partially through the 24h window because the deploy happened during the window: `0.495 -> 0.304 GB` avg, latest `0.205 GB`.
- `Universal RAG` is the current top consumer and is not idle: total avg CPU is `0.1221`, mostly from `MCP сервера`.
- `Obsidian Publisher` is second, with low CPU and still meaningful memory; next savings there are likely architecture/data-path work rather than another restart.

#### Universal RAG Focused Read-Only Reconciliation 2026-05-15

Project: `0cd46773-8068-4482-a8b7-56f36b9aa683`
Environment: `production` (`459a3cab-12a6-400a-9d14-ce9d0d03d9d8`)

Important caution:

- User confirmed `Universal RAG` contains MCP servers with constant external calls.
- Do not sleep, stop, restart, redeploy, or approve pending deployments on this project without a separate focused plan.
- Railway `latestDeployment` is misleading for three services: it shows newer `NEEDS_APPROVAL/stopped` deployments, while older `SUCCESS` deployments are still active and serving traffic.

Current per-service 24h metrics:

| Service | Service ID | 24h avg mem GB | Latest GB | Max GB | CPU avg | CPU latest | Samples |
|---|---|---:|---:|---:|---:|---:|---:|
| `MCP сервера` | `3b9bdce7-c8fc-4ee1-8880-1aaddf5d9f0d` | `0.419` | `0.424` | `0.424` | `0.1206` | `0.0439` | `289` |
| `Бэкенд` | `3cf649cf-df0c-40aa-aec5-6f30fd8ce85d` | `0.257` | `0.257` | `0.258` | `0.0015` | `0.0005` | `289` |
| `Фронтенд` | `c3148ba1-ef44-4986-bcd5-599aee263cb7` | `0.192` | `0.192` | `0.192` | `0.0000` | `0.0000` | `289` |
| `Продающий Ленд` | `e2c2e0c2-a0bc-4d28-ac96-e6d5438d83c1` | `0.032` | `0.032` | `0.032` | `0.0001` | `0.0000` | `289` |

Active production deployments:

| Service | Active SUCCESS deployment | Created | Commit | Root | Start command |
|---|---|---|---|---|---|
| `Продающий Ленд` | `f8cf9b27-575b-4a26-be8d-e1640999a650` | `2026-03-26T06:53:33Z` | `8c22844e6aceed12a0e3398833163d729033e976` | `` | Railway Vite/Caddy auto-runtime |
| `Бэкенд` | `8e8c8d3c-6a58-47ae-85f8-c6ed0c236a65` | `2026-04-09T08:46:01Z` | `8e557a2bfcdbb24718e8d704c9d01250abcce066` | `/packages/backend` | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| `Фронтенд` | `8c6eaf51-d3cf-4beb-8d66-e9cd59954f4d` | `2026-03-25T18:41:57Z` | `15f6d79f9c453f6f510b61049b6e2bf078c39d74` | `/packages/frontend` | `npx next start --port $PORT` |
| `MCP сервера` | `aecaf1ae-56ec-4974-81d1-51487f731db7` | `2026-04-09T15:50:55Z` | `f55b4d7ef476ea870030e0b50f9b9aa37de64152` | `/packages/mcp-server` | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |

Domain checks:

| URL | HTTP | Time | Bytes |
|---|---:|---:|---:|
| `https://prodayushij-lend-production.up.railway.app/` | `200` | `0.187s` | `461` |
| `https://web-production-4d980.up.railway.app/` | `200` | `0.242s` | `64` |
| `https://frontend-production-66ba.up.railway.app/` | `200` | `0.308s` | `15789` |
| `https://mcp-servera-production.up.railway.app/` | `200` | `0.918s` | `902` |

Recent logs:

- `Продающий Ленд`: no logs in the 10-minute window.
- `Бэкенд`: one normal `GET /` 200 log in the 10-minute window.
- `Фронтенд`: no logs in the 10-minute window.
- `MCP сервера`: active traffic. 10-minute sample showed `59` lines: `48 info`, `11 error`.
- MCP `error` level lines are mostly `INFO:mcp...` messages emitted to stderr, not proven application failures.
- MCP logs show repeated OAuth discovery `404` probes and real MCP calls such as `/mcp/aipervoprohodciedu/` returning `200`/`202`.

Recommended next safe action:

1. Do not mutate `MCP сервера` first. It is active and CPU-bearing.
2. If optimizing `Universal RAG`, start with the `Фронтенд` service only: it is `~0.192 GB`, has near-zero CPU, and uses `npx next start --port $PORT`, which may have the same standalone-runtime opportunity as `Сайт продажи клуба` and `MyCMS-System`.
3. Before touching the repo, inspect `malovnik/universal-rag` branches/pending deployments because three services have newer `NEEDS_APPROVAL/stopped` deployments. A new commit can interact with Railway approval state.
4. Treat `MCP сервера` as a separate later pass: code-level profiling/log-level cleanup first, deploy only with a rollback window and live MCP smoke tests.

### Universal RAG Frontend Runtime Optimization 2026-05-15 10:54 HCMC

Scope: isolated runtime optimization for Railway project `0cd46773-8068-4482-a8b7-56f36b9aa683`, service `Фронтенд` only. `MCP сервера`, `Бэкенд`, `Продающий Ленд`, variables, domains, and volumes were not changed.

Why this was isolated instead of merged to `main`:

- Active production frontend was running commit `15f6d79f9c453f6f510b61049b6e2bf078c39d74`.
- Repository `main` had moved far ahead and Railway already had unapproved newer deployments for frontend/backend/MCP.
- A normal PR into `main` from the active production commit would look like a rollback of newer main work.
- To avoid touching MCP/backends, the change was made on branch `codex/frontend-standalone-runtime` from the active frontend commit and deployed directly to the `Фронтенд` service via `railway up --service c3148ba1-ef44-4986-bcd5-599aee263cb7`.

Repository: `malovnik/universal-rag`

Branch and commit:

- Branch: `codex/frontend-standalone-runtime`
- Commit: `eab3419 fix: use standalone runtime for Railway frontend`
- Changed files only under `packages/frontend`: `next.config.ts`, `package.json`, `railway.json`.

Change:

- Enabled Next.js `output: 'standalone'` for `packages/frontend`.
- Changed frontend build script to copy `.next/static` into `.next/standalone/.next/static`.
- Changed runtime command from `npx next start --port $PORT` to `HOSTNAME=0.0.0.0 node .next/standalone/server.js`.

Validation before deploy:

- `npm ci`: passed in `packages/frontend`.
- `AUTH_SECRET=local-build-secret-min-32-characters API_KEY=local BACKEND_URL=http://127.0.0.1:8000 NEXT_PUBLIC_MCP_SERVER_URL=http://127.0.0.1:8001 npm run build`: passed.
- Local standalone server on `PORT=3110`: `/` returned `200`, `/login` returned `200`, `/api/auth/logout` returned `405` as expected for a method-restricted route.
- `git diff --check`: passed.
- `npm run lint`: existing frontend lint failures unrelated to this change (`react-hooks/set-state-in-effect`, `react-hooks/purity`, and warnings). Not fixed in this cost-focused pass.

Deployments:

| Deployment | Status | Notes |
|---|---|---|
| `8c0c8b2f-b858-4386-a179-b4aae56ac8d8` | `FAILED` | Safe failed attempt from `packages/frontend`; Railway expected config at `/packages/frontend/railway.json`, but upload root was already the package directory. No production change. |
| `99360185-855f-4dc3-9cc0-d1652608aefb` | `SUCCESS` | Isolated deploy from repo root to `Фронтенд` service only. |

Post-deploy service state:

| Service | Active SUCCESS deployment after deploy | Changed? |
|---|---|---|
| `Продающий Ленд` | `f8cf9b27-575b-4a26-be8d-e1640999a650` | no |
| `Бэкенд` | `8e8c8d3c-6a58-47ae-85f8-c6ed0c236a65` | no |
| `Фронтенд` | `99360185-855f-4dc3-9cc0-d1652608aefb` | yes |
| `MCP сервера` | `aecaf1ae-56ec-4974-81d1-51487f731db7` | no |

Production smoke:

| URL | HTTP | Time | Bytes |
|---|---:|---:|---:|
| `https://frontend-production-66ba.up.railway.app/` | `200` | `1.920s` | `15789` |
| `https://frontend-production-66ba.up.railway.app/login` | `200` | `1.443s` | `15789` |

Immediate runtime evidence:

| Service | Previous 24h avg mem | cgroup `memory.current` after deploy | Approx MB |
|---|---:|---:|---:|
| `Фронтенд` | `0.192 GB` | `53837824` bytes | `51.3 MB` |

Post-deploy logs:

- `Фронтенд`: 7 info lines, 0 error lines; `Ready in 82ms`.
- `Бэкенд`: no logs in the post-deploy sample window.
- `MCP сервера`: still active traffic; no deployment change. Error-level lines remain the known INFO-to-stderr MCP logging pattern.

Follow-up:

- Recheck `Universal RAG` 24h metrics tomorrow; frontend latest memory should settle near the new standalone runtime footprint.
- Do not merge `codex/frontend-standalone-runtime` into `main` until the pending Railway approval/main-branch deployment situation is reconciled.
- Next Universal RAG savings should not target `MCP сервера` with broad runtime changes; profile/code-level logging and request behavior first.

### Universal RAG Branch Reconciliation 2026-05-15 11:55 HCMC

Goal: reconcile GitHub source-of-truth after the isolated frontend optimization and clean up branch drift without losing the live cost improvement.

Actions:

- Merged PR `malovnik/universal-rag#1` into `main`: `02ea408 fix(frontend): preserve standalone Railway runtime`.
- This added the frontend standalone scripts and synced `packages/frontend/package-lock.json`, fixing the `npm ci` lockfile drift on current `main`.
- The merge exposed a Railway config hazard: `MCP сервера` has no package-local `railway.json` / service-level watch pattern, so unrelated `main` changes can still trigger MCP deployments.
- A merge-triggered MCP deployment was removed, then the MCP service was restored from the previously stable code path via deployment `9510c0d9-f071-4de9-b144-00204aa66861`.
- The first auto-deploy from `main` for frontend failed because Railway selected `packages/frontend/Dockerfile`, while the optimized runtime was the Nixpacks standalone path.
- A later Dockerfile-path attempt also failed after image push; the service was restored by deploying the frontend without the stale Dockerfile so Railway used Nixpacks again.

Current live Railway state after recovery:

| Service | Latest / active status | Deployment | Notes |
|---|---|---|---|
| `Фронтенд` | `SUCCESS` | `db6fab43-3ad1-44cc-af15-ff881a712805` | Nixpacks standalone; `/login` returned `200`, `/api/auth/logout` returned expected `405`. |
| `MCP сервера` | `SUCCESS` | `9510c0d9-f071-4de9-b144-00204aa66861` | Restored and smoke checked: `/docs` returned `200`, `/openapi.json` returned `200`. |
| `Бэкенд` | active prior `SUCCESS` still present among approval backlog | `8e8c8d3c-6a58-47ae-85f8-c6ed0c236a65` | No backend code or deploy approval was changed. |

GitHub branch state:

- Obsolete branches deleted: `codex/frontend-standalone-main`, `codex/frontend-standalone-runtime`.
- Active PR left open: `malovnik/universal-rag#2` (`codex/frontend-docker-start-command`) now retitled to `fix(frontend): force Nixpacks standalone on Railway`.
- PR `#2` removes the stale `packages/frontend/Dockerfile`, which is the source-of-truth fix needed for future GitHub auto-deploys to keep using the working Nixpacks standalone path.

Important blocker before merging PR `#2`:

- Resolved later on 2026-05-15: `MCP сервера` now has Railway environment config `build.watchPatterns=["packages/mcp-server/**"]`.
- The config patch was committed via Railway staged changes with deploys skipped, so the active MCP deployment was not restarted.
- PR `#2` was then merged successfully. The resulting frontend-only main commit produced an MCP deployment entry `7bfe6a6a-ebe1-403b-a57c-fcce72f6ab1a` with status `SKIPPED`, proving the watch pattern guard works.

### Universal RAG Watch-Pattern Fix 2026-05-15 12:15 HCMC

Scope: Railway project `Universal RAG`, environment `production`. Goal was to prevent unrelated frontend/main changes from redeploying `MCP сервера`.

Railway environment config applied:

| Service | Config |
|---|---|
| `MCP сервера` | `build.builder=RAILPACK`, `build.buildCommand="pip install -r requirements.txt"`, `build.watchPatterns=["packages/mcp-server/**"]` |
| `Фронтенд` | `build.builder=NIXPACKS`, `build.watchPatterns=["packages/frontend/**"]`, `deploy.startCommand="HOSTNAME=0.0.0.0 node .next/standalone/server.js"` |

Execution notes:

- CLI dot-path edit for `build.watchPatterns` returned `No changes to apply`; it did not mutate the config.
- Used Railway Public API staged changes instead: `environmentStageChanges`, then `environmentPatchCommitStaged(skipDeploys=true)`.
- This matches Railway's staged changes model and avoided restarting MCP just to change a path filter.
- PR `malovnik/universal-rag#2` was merged after the MCP guardrail existed.
- Obsolete frontend branches are now gone; `malovnik/universal-rag` has no open PRs and `main` is at `8f49166`.

Verification:

| Check | Result |
|---|---|
| MCP latest deploy after PR #2 merge | `7bfe6a6a-ebe1-403b-a57c-fcce72f6ab1a` `SKIPPED` |
| MCP active deploy | `9510c0d9-f071-4de9-b144-00204aa66861` `SUCCESS` |
| MCP smoke | `/docs` `200`, `/openapi.json` `200` |
| Frontend deploy from merged main | `5d8567cb-5f1b-45ab-8282-a00a0dae0a98` `SUCCESS` |
| Frontend smoke | `/login` `200`, `/api/auth/logout` `405` expected |
| GitHub PRs | no open PRs |

## First Measurement Pass Order

Suggested order for the next task:

1. `Боты клуба` - largest service count, 2 Postgres-looking services.
2. `Universal RAG` - 4 services, likely mixed frontend/backend/MCP.
3. `InstaCutter` - frontend + backend + Postgres.
4. `Платный транскрибатор` - paid product, careful read-only check.
5. `Сайт продажи клуба` - two site services, likely sleep/static opportunities.
6. `Obsidian Publisher` - follow 24h/72h observation, not another change yet.
7. Remaining single-service projects by latest usage/cost symptoms.

## Change Log

- 2026-05-13: Created superpowers implementation plan for Railway optimization: `docs/superpowers/plans/2026-05-13-railway-finops-optimization.md`.
- 2026-05-13: Completed batch read-only measurement pass for all Railway projects except `Obsidian Publisher`; recorded P0/P1/P2/P3 summary and per-project service evidence.
- 2026-05-13: Created read-only inventory and per-project audit checklist from Railway CLI project list.
- 2026-05-13: Completed read-only measurement pass for `Боты клуба`; recorded service metrics, domain checks, log/security findings, and recommendations.
- 2026-05-14: Optimized `Сайт продажи клуба` runtime via Next.js standalone output, merged PR `malovnik/ai-club-site#1`, verified both Railway services healthy, and recorded immediate cgroup memory near `50 MB` per service.
- 2026-05-14: Optimized `MyCMS-System / Система` runtime via Next.js standalone output and fixed the production migration runner dependency; merged PRs `malovnik/MyCMS-System#10` and `#11`, verified deployment `349d15f2-65eb-4cfd-9fd7-013c4b7ff74c` healthy with immediate cgroup memory near `165 MB`.
- 2026-05-15: Completed read-only all-project remeasurement after cost drop to about `$23/mo`; confirmed `Universal RAG` is now top memory consumer but active MCP traffic makes it unsafe for broad runtime changes. Recommended next target is `Universal RAG / Фронтенд` only, not `MCP сервера`.
- 2026-05-15: Optimized `Universal RAG / Фронтенд` only via isolated Railway deploy `99360185-855f-4dc3-9cc0-d1652608aefb`; backend and MCP active deployments were unchanged. Immediate frontend cgroup memory was about `51 MB` vs prior 24h avg `0.192 GB`.
- 2026-05-15: Reconciled `Universal RAG` branch drift: merged frontend standalone scripts and lockfile to `main`, cleaned obsolete branches, restored MCP after an unintended watch-pattern-triggered deploy, restored frontend to Nixpacks standalone deployment `db6fab43-3ad1-44cc-af15-ff881a712805`, and left PR `malovnik/universal-rag#2` open to remove the stale Dockerfile after MCP watch-pattern risk is handled.
- 2026-05-15: Fixed `Universal RAG` Railway watch patterns via staged environment config with skipped deploys: MCP is now limited to `packages/mcp-server/**`, frontend is pinned to Nixpacks standalone, PR `#2` was merged, MCP correctly produced a `SKIPPED` deployment on the frontend-only merge, and frontend deployed successfully from `main` as `5d8567cb-5f1b-45ab-8282-a00a0dae0a98`.
