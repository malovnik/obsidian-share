# Evidence ledger

Все действия были read-only относительно production. Railway variables и DB credentials в файл не записывались.

## Source snapshot

```text
Repository: https://github.com/malovnik/obsidian-share.git
Local path: /Users/malovnik/Documents/Dev/obsidian-share
Branch: main
HEAD: bc19f707342c7a4b4c66cf0897184b6455d3768c
Production deployment: 1126be5b-9160-4d5a-b505-b1b27c3fc765
Deployment status: SUCCESS
```

Local Obsidian plugin:

```text
/Users/malovnik/Documents/malovnik-obsidian/.obsidian/plugins/obsidian-share-custom
```

Repository and installed plugin `src/main.ts` differ in only three lines: default URL, description example and placeholder. Functional logic is otherwise the same.

## Verification

```text
npm ci: PASS
npm run build: PASS
npx tsc --noEmit (installed plugin): PASS
npm run lint: FAIL — next lint is not a valid Next.js 16 command
tests: absent
```

Application audit:

```text
10 vulnerabilities
6 high
4 moderate
```

Installed plugin toolchain audit:

```text
12 vulnerabilities
10 high
2 moderate
```

Plugin findings affect its local dev/build toolchain; the distributed runtime is a compiled bundle.

Semgrep:

```text
86 tracked files
213 applicable rules
2 automated findings
```

Semgrep did not follow the full Markdown → DB → `dangerouslySetInnerHTML` data flow, so the stored XSS finding is manual and stronger than the automated output.

## Railway identity

```text
Project: Obsidian Publisher
Project ID: bb459d0d-903d-45aa-8675-f82a56cc04e9
Environment: production
Environment ID: 9826b5cc-cc7a-44b7-a94b-4ccd0b2ccead
App service: obsidian-share
App service ID: 6f8cf339-2293-484f-93f8-fd4b2c214b3d
DB service: Postgres
DB service ID: 17869819-b033-4f97-b3f5-f485ec5cb6a0
DB image: postgres-ssl:17
```

## Metrics

```text
App 24h:
  CPU avg 0.0006
  RAM avg 0.7748 GB

App 7d:
  CPU avg 0.0008
  RAM avg 0.7521 GB

App 30d:
  CPU avg 0.0008
  RAM avg 0.6535 GB
  RAM min 0.2729 GB
  RAM max 0.9086 GB

DB 24h:
  CPU avg 0.0004
  RAM avg 0.2353 GB
  disk current 2.6058 GB

DB 7d:
  RAM avg 0.2359 GB
  disk min 2.4638 GB
  disk current 2.6058 GB

DB 30d:
  RAM avg 0.2243 GB
  disk min 2.0273 GB
  disk current 2.6042 GB
```

## Database

```json
{
  "server_version": "17.7",
  "database_size": "2244 MB",
  "notes_total": 134,
  "notes_public_live": 48,
  "notes_private_live": 65,
  "notes_deleted": 21,
  "images_total": 10691,
  "images_payload": "2136 MB",
  "images_unique_payloads": 15,
  "images_duplicate_rows": 10676,
  "images_exact_duplicate_reclaim": "2133 MB",
  "images_max_copies_of_one_payload": 1615,
  "referenced_image_rows": 9,
  "referenced_image_payload": "1662 kB",
  "unreferenced_image_rows": 10682,
  "unreferenced_image_payload": "2134 MB",
  "note_views_total": 322,
  "duplicate_note_view_pairs": 9
}
```

Production table sizes:

```text
images: 2222 MB
notes: 15 MB
note_views: 80 kB
```

Recent duplicate image ingestion:

```text
2026-07-14: 127 rows / 23 MB
2026-07-15: 64 rows / 12 MB
2026-07-16: 160 rows / 29 MB
2026-07-17: 192 rows / 35 MB
2026-07-18: 186 rows / 34 MB
2026-07-19: 112 rows / 20 MB
2026-07-20: 80 rows / 14 MB
2026-07-21: 64 rows / 12 MB
2026-07-22: 88 rows / 16 MB
2026-07-23: 160 rows / 29 MB
2026-07-24: 120 rows / 22 MB
2026-07-25: 104 rows / 19 MB
2026-07-26: 104 rows / 19 MB
2026-07-27: 64 rows / 12 MB
```

## Live HTTP

Test location: current workstation in Thailand.

```text
/ status=200 total=0.295s
/api/notes?limit=3 status=200 total=0.191s
/api/share/nonexistent status=404 total=0.154s
/api/admin/notes status=401 total=0.134s
/sitemap.xml status=200 total=0.147s
```

Response headers expose `server: railway-hikari` and `x-powered-by: Next.js`. CSP, HSTS, `X-Content-Type-Options` and frame restrictions were absent.

## Russian reachability

Globalping measurement:

https://globalping.io?measurement=2udXnMXnQXieih7hg00020qCx

```text
Russia+eyeball probes: 5
HTTP 200: 1 (Timeweb)
Timeout: 4 (including two MTS probes)
```

## Runtime logs

Observed patterns:

- repeated PostgreSQL notice `word is too long to be indexed`;
- repeated FTS trigger execution during hourly note updates;
- periodic ~13 MB WAL/checkpoint distances during update bursts;
- image response failures when a Unicode filename is placed directly in `Content-Disposition`;
- repeated invalid/unknown Server Action requests, consistent with public internet scanning and an outdated Next.js deployment.

## GitHub

```text
Visibility: PUBLIC
Default branch: main
Open issues: #1 Reduce Railway cost for Obsidian Share
Branch protection: absent
CI workflows: absent
GitHub Actions SHA pinning: disabled
LICENSE file: absent
```

## Sources checked

- Railway pricing: https://docs.railway.com/pricing
- SprintHost Node.js/Passenger: https://help.sprinthost.ru/howto/nodejs
- SprintHost DB management: https://help.sprinthost.ru/control-panel/dumpdb
- SprintHost current X tariffs: https://sprinthost.ru/tariffs/x1
- WordPress REST API: https://developer.wordpress.org/rest-api/reference/
- WordPress API authentication: https://developer.wordpress.org/rest-api/using-the-rest-api/authentication/
