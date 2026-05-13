# План снижения стоимости Obsidian Share на Railway

Дата: 2026-05-13
Проект: `/Users/malovnik/Documents/Dev/obsidian-share`
Production: `https://read.malovnik.ru`
Railway project: `bb459d0d-903d-45aa-8675-f82a56cc04e9`
Railway app service: `6f8cf339-2293-484f-93f8-fd4b2c214b3d`
Railway DB service: `17869819-b033-4f97-b3f5-f485ec5cb6a0`

## Цель

Снизить стоимость работы маленького Obsidian Share с текущего уровня около `$12/month` к целевому уровню около `$5/month`, не потеряв статьи, картинки, базу данных, публичные ссылки и рабочий Obsidian plugin.

План не начинается с переписывания на Go. Сначала нужно доказать, кто именно ест деньги: Next.js app, Postgres, память idle-процессов, синхронные записи просмотров, search trigger, картинки в базе, билд/старт-команды или сама платформа Railway.

## Текущая опорная точка

- `main` deploy-safe после коммита `5c088cc fix: exclude Obsidian plugin from Next build`.
- Railway deployment `b880ba6c-e832-4421-8ca0-bdf016270a77` завершился `SUCCESS`.
- `https://read.malovnik.ru/` отвечает `200`.
- `https://read.malovnik.ru/api/share/nonexistent` отвечает `404`.
- Локальные служебные изменения `.claude/*` не являются продуктовым кодом и не входят в план.
- Ветви `feat/redesign-brutal`, `feat/search-and-tags`, `fix/backend-bugs` полностью вмержены в `main` и не требуют пуша на GitHub.

## Статус исполнения

- 2026-05-13: Gate 1 baseline выполнен. Артефакт: `docs/cost-optimization/logs/baseline-2026-05-13.md`.
- Ключевой вывод Gate 1: 24h average app memory около `1.0 GB`, latest app memory после fresh deploy около `0.15 GB`; Postgres latest около `0.23 GB`; база `1115 MB`, из них `images` около `1095 MB`.
- 2026-05-13: Gate 2 GitHub operational cleanup выполнен частично: repo description обновлен, создан issue `#1 Reduce Railway cost for Obsidian Share` (`https://github.com/malovnik/obsidian-share/issues/1`). Локальные `.claude`-следы и fully merged ветки оставлены нетронутыми, чтобы не смешивать cleanup с cost-работой.

## Внешние допущения по Railway

Railway pricing нужно проверять перед финансовыми решениями, потому что тарифы меняются. На 2026-05-13 официальный ориентир такой:

- Railway bills base subscription plus resource usage.
- Usage includes memory, CPU, egress, storage and volumes.
- Idle app still consumes memory while it stays loaded and responsive.
- Relevant docs: https://docs.railway.com/pricing, https://docs.railway.com/pricing/understanding-your-bill, https://docs.railway.com/pricing/cost-control.

## Роли

1. **Infra Surgeon**
   - Профессия: Railway, deploy, runtime, billing.
   - Soul: холодная рука, не дергает прод без доказательств.
   - Ответственность: измерения, лимиты, start/deploy lifecycle, rollback.

2. **Data Guardian**
   - Профессия: PostgreSQL, Drizzle, backup, migrations.
   - Soul: паранойя во благо, данные дороже эстетики.
   - Ответственность: статьи, картинки, note IDs, public URLs, бэкапы.

3. **Backend Minimalist**
   - Профессия: Next.js backend/API, DB access, caching, counters.
   - Soul: режет лишнее, не переписывает живое ради спорта.
   - Ответственность: hot paths, connection pooling, read/write separation.

4. **Product Keeper**
   - Профессия: пользовательские сценарии, Obsidian plugin, публичная лента.
   - Soul: помнит, зачем это вообще нужно.
   - Ответственность: не сломать публикацию из Obsidian, ссылки, приватность, SEO.

5. **Evidence Scribe**
   - Профессия: документация, чеклисты, GitHub issues, logs.
   - Soul: превращает хаос в след.
   - Ответственность: фиксировать измерения, решения, команды, результаты.

6. **Skeptical Architect**
   - Профессия: системный дизайн, cost/performance tradeoffs.
   - Soul: задает неприятный вопрос до того, как счет вырос.
   - Ответственность: решать, когда достаточно Node/Next, а когда нужен Go/VPS/managed DB.

## Правила безопасности

- Не делать destructive DB migration без бэкапа.
- Не менять Railway variables, services, sleep mode, volumes или domains без отдельного шага и проверки.
- Не удалять ветки, `.claude`-файлы или историю без отдельного подтверждения.
- Не менять API contract Obsidian plugin без обновления docs и smoke test.
- Каждый production-impact шаг должен иметь rollback-команду.
- Каждый этап завершается измеримым результатом, а не ощущением.

## Этап 1. Зафиксировать baseline стоимости и ресурсов

### 1.1. Снять Railway inventory
- Получить `railway service status --all --json`.
- Зафиксировать app service, DB service, deployment IDs, stopped/sleep state.
- Сохранить snapshot в `docs/cost-optimization/logs/`.

### 1.2. Снять billing/resource картину
- Открыть Railway usage/billing breakdown по проекту.
- Выписать Memory, CPU, Network, Volume, Build charges отдельно.
- Отметить, какой сервис ест больше: app или Postgres.

### 1.3. Снять runtime health
- Проверить `https://read.malovnik.ru/`.
- Проверить `GET /api/share/nonexistent`.
- Проверить `GET /api/notes?limit=3`.

### 1.4. Снять DB объемы
- Получить count по `notes`, `images`, `note_views`.
- Получить размеры таблиц и индексов.
- Отдельно оценить bytea-объем картинок.

### 1.5. Снять логи до оптимизаций
- App logs: ошибки, cold starts, DB notices.
- Postgres logs: checkpoints, WAL, connection noise.
- Зафиксировать повторяющиеся паттерны как hypothesis backlog.

**Gate 1:** есть таблица baseline: сервис -> ресурс -> стоимость/симптом -> гипотеза.

## Этап 2. Навести порядок в GitHub и операционном контуре

### 2.1. Обновить metadata репозитория
- Исправить GitHub description: убрать `Express backend`.
- Указать реальный стек: Next.js, PostgreSQL/Drizzle, Obsidian plugin.
- Проверить, что README не противоречит production.

### 2.2. Создать cost-optimization issue/checklist
- Перенести этапы этого плана в GitHub issue.
- Добавить критерий успеха: target monthly cost near `$5`.
- Добавить запреты: no data loss, no broken public URLs.

### 2.3. Зафиксировать rollback protocol
- Для code change: revert commit.
- Для Railway config: record previous value before change.
- Для DB migration: backup first, rollback script or restore path.

### 2.4. Очистить локальные ветки после подтверждения
- Подтвердить, что merged branches дают `0` unique commits.
- Удалить только локальные fully merged ветки.
- Не пушить архивные ветки на GitHub.

### 2.5. Решить судьбу `.claude`-следов
- Не включать в продуктовые коммиты.
- Либо восстановить удаленный local file, либо добавить правило игнорирования.
- Отдельно не смешивать с cost optimization commits.

**Gate 2:** GitHub показывает актуальную правду, а worktree не мешает чистым коммитам.

## Этап 3. Убрать очевидную лишнюю работу без изменения архитектуры

### 3.1. Разделить start и migrations
- Убрать `db:push` из обычного production `start`.
- Добавить явный migration command для controlled deploy.
- Проверить локальный build и Railway deploy.

### 3.2. Ограничить DB connections
- Посмотреть текущий `postgres()` client config.
- Задать conservative `max`, `idle_timeout`, `connect_timeout`.
- Проверить, что API не деградирует.

### 3.3. Оптимизировать view counters
- Найти все synchronous writes on read.
- Перевести счетчики в более дешевую модель: батч, debounce или отдельная lightweight update policy.
- Сохранить semantic: публичные просмотры считаются достаточно точно.

### 3.4. Уменьшить search trigger noise
- Найти источник длинных токенов в content.
- Обрезать/нормализовать индексируемый текст до `to_tsvector`.
- Проверить поиск по русскому и английскому.

### 3.5. Убрать ненужные runtime warnings
- Проверить deprecated `middleware` -> `proxy` для Next.js 16.
- Обновить docs/комментарии, если меняется convention.
- Не делать library upgrade в этом же шаге.

**Gate 3:** меньше runtime/DB шума, start дешевле, поведение API сохранено.

## Этап 4. Разобрать Postgres cost и хранение данных

### 4.1. Проверить объем картинок
- Измерить `images.data` суммарно.
- Посмотреть средний/максимальный размер WebP.
- Оценить влияние картинок на DB size и backups.

### 4.2. Выбрать стратегию media storage
- Вариант A: оставить bytea, если объем мал.
- Вариант B: Railway volume/object storage, если bytea растет.
- Вариант C: внешний S3-compatible storage, если нужен predictable cost.

### 4.3. Проверить `note_views`
- Измерить рост таблицы.
- Проверить индексы и duplicate behavior.
- Решить retention policy для старых IP views.

### 4.4. Проверить search indexes
- Измерить размер `idx_notes_search`, `idx_notes_tags`.
- Проверить, нужны ли оба языка для всех документов.
- Не удалять индекс без query plan и smoke test.

### 4.5. Подготовить backup contract
- Снять production backup перед DB changes.
- Документировать restore path.
- Проверить, что backup содержит notes, images, views, migrations.

**Gate 4:** понятно, сколько стоит Postgres и что в нем тяжелое: данные, индексы, WAL, connections или idle memory.

## Этап 5. Архитектурные варианты снижения до `$5`

### 5.1. Вариант A: остаться на Railway + оптимизировать Next/Postgres
- Минимальный риск.
- Быстрый результат за счет memory/DB write reductions.
- Подходит, если итоговый bill близок к `$5-7`.

### 5.2. Вариант B: Railway app sleep + внешний uptime model
- Включить sleep только если cold start приемлем.
- Проверить, не ломает ли Obsidian publish flow.
- Сохранить Postgres always-on или заменить отдельно.

### 5.3. Вариант C: вынести Postgres
- Сравнить Railway Postgres cost с Neon/Supabase/другим managed Postgres.
- Проверить latency из Railway region.
- Миграция только через backup + restore rehearsal.

### 5.4. Вариант D: VPS/Coolify
- Фиксированная цена вместо usage-based.
- Больше DevOps ответственности.
- Имеет смысл, если у тебя много мелкого софта и Railway суммарно уже `$70+`.

### 5.5. Вариант E: Go rewrite
- Рассматривать только после baseline.
- Go может снизить app memory, но не уберет стоимость Postgres.
- Переписывать только API layer, не меняя data contract и public URLs.

**Gate 5:** выбран путь с расчетом риска, цены, времени и rollback.

## Этап 6. Production rollout и контроль результата

### 6.1. Подготовить release checklist
- `npm run build`.
- API smoke tests.
- Obsidian plugin publish test.

### 6.2. Деплоить малыми коммитами
- Один behavioral change на коммит.
- Один deploy на проверяемый шаг.
- Не смешивать cleanup, docs и DB changes.

### 6.3. Проверять Railway после каждого deploy
- `railway service status --all --json`.
- App logs за последние строки.
- Public smoke на `read.malovnik.ru`.

### 6.4. Сравнить cost после периода наблюдения
- Снять usage через 24 часа.
- Снять usage через 72 часа.
- Сравнить с baseline по каждому ресурсу.

### 6.5. Закрыть цикл документацией
- Обновить README/Railway notes.
- Закрыть GitHub checklist.
- Записать итог: что снизило счет, что не повлияло.

**Gate 6:** есть подтвержденное снижение usage или принято архитектурное решение о переносе.

## Порядок первых трех рабочих шагов

1. **Baseline snapshot**
   - Создать `docs/cost-optimization/logs/`.
   - Снять Railway service status, live smoke, DB sizes, app/Postgres logs.
   - Итог: файл `baseline-YYYY-MM-DD.md`.

2. **GitHub operational cleanup**
   - Обновить repo description.
   - Создать GitHub issue с этим планом.
   - Итог: GitHub становится командным центром задачи.

3. **Low-risk runtime fix**
   - Убрать `db:push` из production start.
   - Добавить controlled migration/deploy note.
   - Итог: меньше работы при старте, меньше риска на deploy.

## Журнал решений

Каждый шаг записывать в такой форме:

```md
## YYYY-MM-DD HH:mm

Action:
Evidence:
Risk:
Rollback:
Result:
Next:
```

## Definition of Done

- Сайт открывается.
- Obsidian plugin публикует заметку.
- Существующие публичные ссылки работают.
- База и картинки не потеряны.
- GitHub `main` deploy-safe.
- Railway bill/usage ниже baseline или есть доказанный план миграции.
- Все изменения имеют rollback path.
