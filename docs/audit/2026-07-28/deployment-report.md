# Production deployment report

Дата: 2026-07-28
Рабочий URL: `https://read.malovnik.ru`
Активный SprintHost release: `20260728T045110Z`
Проверенный code/media hotfix: `20260728T065948Z` + `20260728T070856Z`

## Фактическое состояние

- DNS и HTTPS ведут на SprintHost.
- Public root: `/home/a0346120/domains/malovnik.ru/public_html/read`.
- Private runtime/data: `/home/a0346120/domains/malovnik.ru/private/obsidian-share`.
- 137 note rows с сохранёнными активными и soft-deleted записями.
- 15 content-addressed WebP payloads вместо 10 691 повторных PostgreSQL payloads.
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
- JPEG, PNG, GIF и входной WebP перекодируются через GD в WebP quality 82;
  ширина ограничена 1920 px с сохранением пропорций.
- Хэш и дедупликация считаются по фактически сохранённому WebP, а исходный
  SHA-256 остаётся алиасом для совместимости с Obsidian plugin.
- В админке восстановлены компактные SVG-иконки обложки и корзины; нативный
  `Choose File` скрыт, выбор файла автоматически запускает загрузку.

## Где находится база данных

Production использует SQLite-файл:

`/home/a0346120/domains/malovnik.ru/private/obsidian-share/data/obsidian-share.sqlite`

Это приватный файл приложения за пределами `public_html`, а не управляемая
MySQL/PostgreSQL-база SprintHost. Поэтому в разделе панели «Базы данных» она
не показывается. После media hotfix: `PRAGMA integrity_check = ok`, 137 note
rows, 15/15 media rows в WebP, битых `note_media` и `media_aliases` нет.

Перед нормализацией создан и проверен SQLite online backup:

`/home/a0346120/domains/malovnik.ru/private/obsidian-share/backups/before-media-normalize-20260728T070225Z.sqlite`

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

## Railway и rollback

Владелец удалил Railway project после переключения на SprintHost. Railway
больше не является standby и не содержит актуальную production БД.

Local immutable source backup:

`.local/backups/railway-2026-07-28.dump`

SHA-256:

`ce2aff39d9dd059169c6ad23a09b4007ef3367399cbccb9c5b15fbd4d2d3adf0`

The dump passed `pg_restore --list` and a disposable restore.

Текущий rollback для media hotfix — проверенный SQLite backup выше и локальные
пофайловые FTP-копии в `.local/sprinthost/hotfix-backups/`.
