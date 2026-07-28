# Production deployment report

Дата: 2026-07-28
Рабочий URL: `https://read.malovnik.ru`
Активный SprintHost release: `20260728T045110Z`

## Фактическое состояние

- DNS и HTTPS ведут на SprintHost.
- Public root: `/home/a0346120/domains/malovnik.ru/public_html/read`.
- Private runtime/data: `/home/a0346120/domains/malovnik.ru/private/obsidian-share`.
- 134 notes: 48 public, 65 private, 21 soft-deleted.
- 15 content-addressed media payloads вместо 10 691 повторных PostgreSQL payloads.
- 10 722 legacy image aliases сохранены; старые image URL продолжают работать.
- 141 article aliases сохраняют прежние `/s/...` URL.
- Сырые IP из Railway `note_views` намеренно не переносились; агрегатные счётчики сохранены.
- Публичные страницы статические. PHP используется только для publish API, private access, admin, media authorization и view counter.

## Сохранённый дизайн

В production сохранён прежний дизайн блога, а не брендбук:

- Inter 300–800, белый фон, чёрно-серая палитра;
- прежние размеры header/home/search/card grid;
- 1/2/3 колонки на mobile/tablet/desktop;
- статья 680 px с прежним оглавлением;
- прежний белый PIN modal на затемнённом фоне;
- компактная светлая admin;
- feed снова показывает 12 карточек и догружает по 12.

В PHP tests есть регрессия, блокирующая случайный возврат брендбучных шрифтов/стиля.

## Security и correctness

- Publish/media/delete/meta требуют scoped bearer token.
- Токен, FTP password и private password хранятся в macOS Keychain и отсутствуют в репозитории.
- Private note content выдаётся только после server-side password verification; PIN отсутствует в client bundle.
- Raw Markdown HTML очищается; `javascript:`, event handlers и iframe не доходят до страницы.
- Link-preview endpoint отключён, чтобы закрыть SSRF.
- Request limits, CSRF, secure sessions, login rate limit, CSP, HSTS, nosniff и frame deny включены.
- Image payload проверяется, адресуется SHA-256 и дедуплицируется до записи.
- Неизменённая публикация создаёт ноль note revisions.
- SQLite schema и runtime SQL совместимы со старой SQLite-библиотекой SprintHost.
- Просмотры хранят только HMAC viewer hash + день; raw IP не записывается.

## Проверки release

- archive SHA-256 + per-file manifest verification;
- disposable activation rehearsal;
- SQLite integrity: `ok`;
- PHP tests: 11 passed;
- plugin TypeScript/build: passed;
- 48/48 public canonical URL: HTTP 200;
- 65/65 private URL: закрытый gate, no-store, без утечки content;
- private unlock: passed;
- admin login: passed;
- unauthenticated publish: 401;
- malicious Origin for view write: 403;
- legacy media sample: 20/20;
- repeated existing media upload: `deduplicated: true`;
- sitemap/search counts: passed;
- production health: HTTP 200.

## Obsidian plugin

Version `2.0.0` installed into:

`/Users/malovnik/Documents/malovnik-obsidian/.obsidian/plugins/obsidian-share-custom`

The installer preserved the previous files in a timestamped `.codex-backup-*`
directory. Settings point to `https://read.malovnik.ru`; token matches Keychain
and `data.json` mode is `0600`. The running plugin was toggled off/on in Obsidian;
the v2-only commands `Принудительно обновить текущую статью` and
`Обновить изменённые опубликованные статьи` are active.

## Railway standby and rollback

Both Railway services have zero running instances:

- `obsidian-share`;
- `Postgres`.

The project, deployment definitions and 2.6 GB PostgreSQL volume are retained as
a reversible emergency standby. Compute billing should stop; retained volume
storage may still be billed.

Local immutable source backup:

`.local/backups/railway-2026-07-28.dump`

SHA-256:

`ce2aff39d9dd059169c6ad23a09b4007ef3367399cbccb9c5b15fbd4d2d3adf0`

The dump passed `pg_restore --list` and a disposable restore.

Emergency Railway start:

```sh
railway scale --service obsidian-share asia-southeast1-eqsg3a=1
railway scale --service Postgres asia-southeast1-eqsg3a=1
```

After both instances are healthy, DNS would need to be returned to the Railway
origin. Do not delete the Railway project/volume until the agreed observation
window is over.
