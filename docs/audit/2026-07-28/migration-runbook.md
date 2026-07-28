# Migration runbook: Railway → SprintHost

Миграция выполнена 2026-07-28 с явного разрешения владельца. Этот файл сохраняет
план и rollback-контракт; фактический результат описан в
[`deployment-report.md`](deployment-report.md).

## Целевая архитектура

Рекомендуемый вариант:

```text
Obsidian plugin (TypeScript)
  |
  | HTTPS + scoped publish token
  | note ID + revision/hash
  | media SHA-256
  v
SprintHost publish API (PHP 8.3/8.4)
  |-- metadata: SQLite или PostgreSQL 14
  |-- canonical Markdown/JSON
  |-- media: filesystem by SHA-256
  |-- image ID -> hash mapping
  |-- static HTML renderer
  v
nginx static public blog
  |-- /s/<existing-slug-id>
  |-- /api/images/<existing-id> -> mapped file
  |-- sitemap.xml
  |-- search-index.json
  `-- private route with server-side authorization
```

Публичное чтение не запускает PHP/Node. Runtime нужен только для публикации, admin и private access.

## Phase 0 — emergency hardening on Railway

Цель: остановить рост расходов и закрыть P0 до миграции.

### Plugin

- отключить автоматический hourly full-vault update по умолчанию;
- добавить explicit setting для sync interval;
- хранить last published content hash/revision;
- не отправлять note, если hash не изменился;
- вычислять media SHA-256 и не загружать уже известный hash;
- не сканировать весь vault каждый час;
- добавить scoped publish token header;
- не логировать token;
- сохранить ручное `Обновить все` как recoverable operation.

### Server

- закрыть `POST /api/share`, `POST /api/images`, legacy DELETE token authentication;
- удалить update-by-public-ID без ownership/token;
- добавить request size limits;
- добавить server-side schema validation;
- добавить media hash unique constraint;
- дедуплицировать до `sharp`;
- связать image с note/revision;
- санитизировать HTML allowlist;
- заменить private PIN на server-side note password/signed access;
- отключить или изолировать arbitrary link preview;
- добавить security headers;
- обновить vulnerable dependencies.

### Verification gate

- unauthenticated write requests → 401/403;
- existing public GET URLs → 200;
- private API without access → 404/401, content отсутствует;
- malicious Markdown script/event handlers удаляются;
- internal/localhost link preview blocked;
- repeated publish without change creates 0 note/image writes;
- same image twice creates 1 payload;
- build, lint, tests and plugin build pass.

## Phase 1 — immutable backup and inventory

Перед delete/compact/migration:

1. logical export всех tables;
2. отдельный export schema;
3. export списка `id`, `slug`, timestamps, privacy state;
4. hash manifest всех 10 691 image rows;
5. mapping current note content → referenced image IDs;
6. sample restore в disposable local DB;
7. verification counts:
   - notes 134;
   - images 10 691 before cleanup;
   - note_views 322;
   - 15 unique image hashes;
   - 9 currently referenced image IDs.

Backup хранить вне Railway volume.

## Phase 2 — dedupe and media extraction

Не удалять «все дубли по hash» вслепую: URL содержит image ID.

Безопасный алгоритм:

1. выбрать canonical file для каждого hash;
2. выгрузить 15 unique payloads на filesystem;
3. создать mapping каждого legacy image ID → canonical hash path;
4. убедиться, что 9 IDs из текущих note content работают;
5. сохранить redirect/mapping для всех 10 691 IDs, если нужна полная backwards compatibility;
6. после verified backup удалить payload duplicates;
7. compact source DB только если Railway остаётся активным;
8. при немедленной миграции не делать тяжёлый `VACUUM FULL`: новая целевая DB будет компактной сама.

Ожидаемый media payload после dedupe: около 3 MB вместо 2,136 GB.

## Phase 3 — SprintHost staging

### Option C: PHP/static, recommended

Минимальные компоненты:

- `public/index.php` router только для API/private/legacy media mapping;
- static article files;
- publish token table with hashed tokens and scopes;
- note revisions;
- deterministic Markdown renderer + sanitizer;
- image hashing and format validation;
- sitemap/search-index regeneration after successful transaction;
- admin login with separate random session secret;
- audit log without content/secrets.

Tariff starting point:

- X-1: 256 MB RAM, 2 GB disk — достаточно после dedupe для PHP/static;
- X-2: 512 MB RAM, 4 GB disk — безопаснее, если на аккаунте есть другие сайты;
- сначала использовать бесплатный test period и графики нагрузки.

### Option B: Next standalone

Required:

- Next `16.2.12+`;
- `output: 'standalone'`;
- no `next.config.env.DATABASE_URL`;
- Passenger startup config for `.next/standalone/server.js`;
- Node.js 22;
- static/public assets copied into standalone layout;
- PostgreSQL 14-compatible schema;
- filesystem media;
- memory gate under 700 MB under realistic publish/read load;
- X-4 or higher during validation.

Reject this option if Passenger restart, native `sharp`, memory or deploy rollback are unreliable.

## Phase 4 — data migration

Из-за source PostgreSQL 17 → target PostgreSQL 14 использовать controlled migrator, а не слепой downgrade restore.

Recommended migrator:

1. create target schema from reviewed canonical SQL;
2. copy notes in deterministic batches;
3. preserve all note IDs and public slugs;
4. copy 15 media payloads to files;
5. create image legacy mapping;
6. copy or intentionally reset view counters;
7. copy note_views only if IP retention действительно нужен;
8. validate row counts and hashes;
9. regenerate search index and sitemap;
10. run URL parity check.

Privacy migration:

- `noIndex` нельзя автоматически считать защищённым;
- владелец выбирает для 65 notes:
  - truly private authenticated;
  - unlisted but public-by-link;
  - public;
  - delete.

До выбора мигрировать их как deny-by-default.

## Phase 5 — compatibility tests

### Public

- 48/48 active public URLs return 200;
- title/content/date/tags parity;
- canonical URL and sitemap parity;
- all 9 current image references render;
- legacy image IDs return correct files;
- search works in Russian and English;
- mobile layout and code blocks render;
- HTML sanitizer does not break legitimate articles.

### Private

- direct API request without authorization never returns content;
- access is per-note or per-share, not one global browser flag;
- PIN/password is not present in JS;
- noIndex + no-store + no snippets;
- expired access fails closed.

### Publisher

- create;
- update same note;
- rename note while preserving ID;
- manual bulk refresh;
- deleted server note status sync;
- offline/retry;
- one image used in many notes creates one stored payload;
- unchanged hourly/manual sync creates zero writes.

### Operations

- backup restore rehearsal;
- deploy rollback;
- Russian eyeball probes on multiple ISPs;
- TLS and security headers;
- log review with no secrets/content.

## Phase 6 — cutover

1. За 24 часа снизить DNS TTL.
2. Подготовить SprintHost certificate и temporary host.
3. Включить короткий publication freeze.
4. Сделать final incremental sync по `updated_at`.
5. Запустить parity checks.
6. Переключить `read.malovnik.ru` на SprintHost.
7. Плагин не перенастраивать: domain остаётся прежним.
8. Проверить из РФ, Таиланда и внешней сети.
9. Снять freeze.
10. Railway перевести в read-only standby.

## Rollback

В течение 7–14 дней:

- Railway app и DB не удалять;
- source DB не модифицировать destructive cleanup без backup;
- DNS можно вернуть на Railway;
- final delta journal позволяет повторить migration;
- plugin продолжает использовать тот же domain.

Railway shutdown/delete — отдельное owner-approved действие только после:

- 7–14 дней стабильной работы;
- подтверждённого publish flow;
- двух независимых backups;
- restore rehearsal;
- отсутствия необработанных legacy URL.

## Что можно выполнить в следующем этапе

Локально, без внешнего доступа:

- security patch;
- plugin change detection/dedup/auth;
- canonical migrations;
- PHP/static target или Next standalone target;
- DB/media migrator;
- parity checker;
- backup/restore scripts;
- SprintHost deployment package;
- automated smoke/security tests.

После предоставления SprintHost test account/SSH и отдельного разрешения:

- создать staging;
- создать БД;
- загрузить package;
- провести rehearsal migration;
- проверить временный домен.

Только после отдельного production approval:

- применить Railway hardening deploy;
- выполнить backup/cleanup;
- изменить DNS;
- остановить Railway.
