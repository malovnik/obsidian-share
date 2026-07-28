# Аудит Obsidian Share

> Этот документ фиксирует исходное состояние до ремонта и миграции. Фактический
> production-результат и статус Railway: [`deployment-report.md`](deployment-report.md).

Дата: 2026-07-28
Локальный проект: `/Users/malovnik/Documents/Dev/obsidian-share`
Production: `https://read.malovnik.ru`
Railway project: `Obsidian Publisher`

## Итог

Продукт маленький, полезный и в текущем виде работает, но эксплуатационно он не готов:

- публичный сайт и API отвечают;
- production соответствует `main` на коммите `bc19f70`;
- локальный Obsidian-плагин функционально совпадает с репозиторием, кроме подстановки рабочего URL;
- сборка приложения и TypeScript-проверка плагина проходят;
- при этом публикация, обновление, удаление и загрузка медиа не защищены авторизацией;
- «приватные» материалы защищены только клиентским PIN и доступны напрямую через API;
- HTML из Markdown не санитизируется;
- endpoint предпросмотра ссылок допускает SSRF;
- production-зависимости содержат high severity advisories;
- миграционная история Drizzle не воспроизводит production schema;
- часовой автосинк плагина создал 10 676 точных дублей изображений и примерно 2,133 GB мусора;
- прямой Railway-origin нестабилен из российских сетей: 4 из 5 российских eyeball-проб завершились timeout.

Главный вывод: проблема не в TypeScript как языке. Проблема в сочетании:

1. тяжёлого постоянно работающего Next.js-процесса;
2. неподходящего для shared hosting runtime-контракта;
3. хранения медиа в PostgreSQL;
4. безусловной часовой перепубликации;
5. отсутствия authentication/security boundary.

## Текущее состояние

### Масштаб данных

| Показатель | Значение |
|---|---:|
| Всего заметок | 134 |
| Публичные активные | 48 |
| `noIndex` активные | 65 |
| Soft-deleted | 21 |
| Записи изображений | 10 691 |
| Уникальные payload изображений | 15 |
| Точные дубли | 10 676 |
| Payload изображений | 2,136 GB |
| Точно освобождаемый объём дублей | 2,133 GB |
| Текущие image-ID, на которые ссылаются заметки | 9 |
| Неиспользуемые строки изображений | 10 682 |
| Неиспользуемый payload | 2,134 GB |
| Уникальные просмотры в журнале | 322 строки |

Все `10 691` image rows имеют `note_id = NULL`: плагин не передаёт `noteId`, поэтому каскадная очистка не работает.

### Railway

| Сервис | 24h RAM avg | 7d RAM avg | 30d RAM avg | Текущее |
|---|---:|---:|---:|---:|
| `obsidian-share` | 0,775 GB | 0,752 GB | 0,654 GB | ~0,795 GB |
| PostgreSQL | 0,235 GB | 0,236 GB | 0,224 GB | ~0,292 GB |

Дополнительно:

- 30d app RAM: min `0,273 GB`, max `0,909 GB`;
- 30d DB disk: min `2,027 GB`, current `~2,604 GB`;
- CPU обоих сервисов почти нулевой;
- в production один app replica и один PostgreSQL;
- последний app deploy: 2026-07-03;
- live smoke: `/` 200, `/api/notes` 200, `/api/share/nonexistent` 404, `/api/admin/notes` 401, `/sitemap.xml` 200.

По официальной цене Railway (`$10 / GB RAM / month`, `$0.15 / GB volume / month`) 30-дневный resource run rate составляет примерно:

- app RAM: `$6.54`;
- DB RAM: `$2.24`;
- storage: `$0.34`;
- CPU: почти ноль;
- итого: около `$9.1/month`;
- текущий 7-дневный run rate ближе к `$10.3/month`.

Это расчёт по метрикам, не invoice. Подписка Hobby засчитывается в usage.

Источник: https://docs.railway.com/pricing

### Доступность в РФ

DNS:

- `read.malovnik.ru` → `v3hm3dqj.up.railway.app`;
- Railway edge address на момент проверки: `69.46.46.93`.

Globalping HTTP HEAD из пяти `Russia+eyeball` probes:

- Timeweb: HTTP 200, total 432 ms;
- MTS: timeout;
- MTS: timeout;
- Kurier: timeout;
- ещё одна российская eyeball-сеть: timeout.

Measurement: https://globalping.io?measurement=2udXnMXnQXieih7hg00020qCx

Вывод: это не только пользовательское ощущение. Direct Railway origin реально недоступен части российских ISP.

## Почему растут база и RAM

Плагин при загрузке Obsidian запускает таймер раз в час:

1. обходит все Markdown-файлы vault;
2. выбирает ранее опубликованные;
3. перечитывает каждую заметку;
4. заново загружает каждую Obsidian-картинку;
5. заново обновляет заметку, даже если содержимое не менялось.

Сервер:

1. принимает base64 JSON;
2. декодирует изображение;
3. каждый раз прогоняет его через `sharp`;
4. создаёт новый `nanoid`;
5. кладёт новый `bytea` в PostgreSQL;
6. не проверяет hash/deduplication;
7. не связывает image row с заметкой.

Практический результат:

- 15 реальных изображений превратились в 10 691 DB rows;
- одно изображение имеет до 1 615 копий;
- за последние две недели ежедневно добавлялось 12–35 MB повторов;
- full-text trigger повторно индексирует неизменившийся контент;
- production logs заполнены `word is too long to be indexed`;
- `sharp` регулярно обрабатывает одинаковые файлы и является вероятным источником роста RSS после fresh deploy.

## Критические риски

### P0 — любой человек может изменить или удалить статью

`POST /api/share` не требует token/session. Клиент может передать публичный `shareId` и перезаписать существующую статью.

Legacy `DELETE /api/share/:id` также не требует авторизации. ID уже присутствует в публичном URL.

### P0 — неограниченная загрузка медиа за ваш счёт

`POST /api/images` публичный и неавторизованный. Любой клиент может загружать файлы до 10 MB на запрос. Нет quota, rate limit или ownership.

### P0 — приватность не реализована

Флаг `noIndex` скрывает материал от sitemap/search, но не защищает контент.

- PIN зашит в публичный client bundle;
- проверка происходит только в браузере;
- успешность хранится в общем `sessionStorage`;
- `/api/share/:id` отдаёт `noIndex` note без PIN/password.

Само значение PIN в этом отчёте намеренно не дублируется.

### P0 — stored XSS

`marked()` принимает HTML из Markdown, результат сохраняется и вставляется через `dangerouslySetInnerHTML`. Санитайзера нет.

Так как publish API открыт, атакующий может создать или перезаписать страницу с произвольным HTML/JS на доверенном домене.

### P1 — SSRF и memory DoS

`/api/link-preview?url=`:

- принимает любой URL;
- не ограничивает scheme;
- не блокирует localhost/private/link-local/metadata networks;
- следует redirects без повторной проверки;
- читает весь response body;
- держит Map cache без верхней границы и фоновой очистки.

### P1 — уязвимые production dependencies

`npm audit`:

- всего: 10;
- high: 6;
- moderate: 4.

Прямые high-risk зависимости:

- `next 16.0.10`, актуальная доступная версия в проверке `16.2.12`;
- `drizzle-orm 0.36.4`, advisory на identifier escaping, fixed `0.45.2`;
- `sharp 0.34.5`, advisory inherited from libvips, fixed `0.35.3`;
- `postcss 8.5.6`, несколько disclosure/path traversal advisories.

`sharp` особенно важен: публичный unauthenticated upload обрабатывает недоверенные изображения.

### P1 — миграции не воспроизводят production

`drizzle/meta/_journal.json` содержит только `0000` и `0001`.

В production есть, но journal/migrations не воспроизводят полностью:

- таблицу `images`;
- `notes.cover_image_id`;
- search migration `0002`;
- `note_views` migration `0003`;
- актуальные индексы и триггеры.

Fresh `npm run db:deploy` не создаст production-equivalent schema.

### P1 — password field вводит в заблуждение

В schema comment написано «хэш», но API сохраняет password как plain text и сравнивает plain text. Плагин это поле сейчас не использует.

### P2 — operational gaps

- `npm run build` проходит;
- `npm run lint` сломан: `next lint` удалён из Next.js 16;
- тестов нет;
- CI нет;
- branch protection отсутствует;
- healthcheck не настроен;
- `railway.toml` декларирует Nixpacks, фактический builder — Railpack;
- в репозитории плагина нет lockfile;
- `package.json` плагина имеет версию `1.1.0`, manifest — `1.0.0`;
- production logs показывают ошибки `Content-Disposition` на кириллических filenames;
- security headers CSP/HSTS/nosniff/frame-ancestors отсутствуют;
- README заявляет MIT, но файла LICENSE нет.

## Подходимость технологий

### Obsidian plugin: TypeScript оставить

Это правильный выбор. Obsidian API нативно ориентирован на TypeScript/JavaScript. Переписывать плагин на другой язык не нужно.

Нужно изменить transport:

- scoped publish token;
- content revision/hash;
- image SHA-256;
- upload only on change;
- server dedup response;
- controllable auto-sync вместо unconditional hourly full-vault scan.

### Next.js: технически подходит, экономически не подходит текущему размещению

Для кастомного full-stack продукта Next.js нормален, но для 48 публичных статей и редких публикаций постоянный Node process слишком дорог.

SprintHost официально поддерживает Node.js 22 через Phusion Passenger:

https://help.sprinthost.ru/howto/nodejs

Next.js 16 можно собрать с `output: 'standalone'` и запускать через generated `server.js`, но Passenger-вариант нужно обязательно проверять на временном домене. Текущий процесс почти упирается в 1 GB RAM лимит дешёвых тарифов.

### PostgreSQL: можно сохранить

SprintHost поддерживает PostgreSQL и создание/импорт БД:

https://help.sprinthost.ru/control-panel/dumpdb

Production сейчас PostgreSQL 17.7, SprintHost документирует PostgreSQL 14.15. Прямой dump/restore вниз по major version нельзя считать гарантированным. Безопаснее создать целевую schema и переносить application rows контролируемым migrator script.

После удаления дублей реальный объём контента мал. Для нового лёгкого publisher также достаточно SQLite.

## Варианты миграции

| Вариант | Изменения | RAM/цена | Риск | Вердикт |
|---|---|---|---|---|
| A. Оставить Railway и починить | Auth, dedup, cleanup, upgrades, restart | Вероятно Hobby minimum `$5` | РФ остаётся частично недоступной | Только краткосрочная стабилизация |
| B. Next.js + PostgreSQL на SprintHost | Standalone/Passenger, PG14, media files | Ориентир X-4: 1 GB/8 GB | Passenger/native modules/RAM | Лучший минимальный перенос |
| C. PHP publisher + static blog на SprintHost | Новый небольшой API, static render, SQLite/PG, media files | Ориентир X-1/X-2 | Нужна аккуратная реализация | Рекомендуемая целевая архитектура |
| D. WordPress + REST API | Плагин публикует posts/media через Application Password | Дешёвый shared hosting | Больше CMS attack surface, сложнее сохранить URL/семантику | Хорошо, если нужен wp-admin |
| E. Только зеркало блога, API на Railway | Public static mirror на SprintHost | Railway cost останется частично | Два источника истины | Хороший переходный этап |

### Почему рекомендуется C

Целевая система:

- nginx отдаёт public HTML, CSS, JS и media без runtime Node;
- PHP запускается только на publish/admin/private API requests;
- при публикации сервер сохраняет canonical Markdown/JSON и генерирует статическую HTML-страницу;
- search для 48 публичных материалов может быть клиентским статическим индексом;
- media лежат файлами по SHA-256;
- SQLite или PostgreSQL хранит metadata, tokens, revisions и redirects;
- все старые `/s/...` и `/api/images/:id` сохраняются через mapping/redirect;
- Obsidian остаётся единственным источником контента.

Это лучше соответствует shared hosting: нет постоянного процесса и платы за idle RAM.

### Когда выбрать WordPress

WordPress имеет смысл только если нужен стандартный wp-admin, визуальное редактирование, плагины SEO и независимые редакторы.

WordPress REST API поддерживает posts, media и отдельные Application Passwords:

- https://developer.wordpress.org/rest-api/reference/
- https://developer.wordpress.org/rest-api/using-the-rest-api/authentication/

Если Obsidian остаётся source of truth, собственный маленький publisher будет проще и безопаснее.

## Рекомендуемое решение

1. Немедленно стабилизировать Railway, не меняя DNS:
   - отключить unconditional hourly auto-sync;
   - закрыть write endpoints publish token;
   - добавить image/content hash и dedup;
   - исправить private access;
   - санитизировать HTML;
   - закрыть SSRF;
   - обновить Next/Sharp/Drizzle/PostCSS;
   - починить migrations, tests, lint и security headers.

2. Создать backup и миграционный snapshot.

3. Безопасно удалить неиспользуемые image rows после проверки mapping:
   - минимум 10 682 rows;
   - около 2,134 GB payload;
   - перед удалением — backup;
   - для реального уменьшения relation нужен compacting step или перенос в новую DB.

4. Собрать SprintHost-native staging:
   - предпочтительно PHP + static pages + filesystem media;
   - альтернативно Next standalone на X-4.

5. Перенести данные и проверить 100% URL.

6. Переключить тот же `read.malovnik.ru` на SprintHost.

7. Держать Railway read-only rollback 7–14 дней, затем выключить только после отдельного подтверждения.

Подробный порядок: `migration-runbook.md`.
