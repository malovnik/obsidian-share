# Obsidian Share

Self-hosted note sharing service for Obsidian

## Стек

- Next.js 15 + React 19 + TypeScript
- PostgreSQL + Drizzle ORM
- Tailwind CSS
- marked, nanoid

## Локально

```bash
npm install
cp .env.example .env
npm run dev
```

## Railway Deployment

### Шаг 1: Создание проекта
1. Зайди на [railway.app](https://railway.app)
2. Создай новый проект
3. Добавь PostgreSQL service (кнопка "+ New" → "Database" → "PostgreSQL")

### Шаг 2: Подключение репозитория
1. Добавь GitHub репозиторий или деплой из локальной папки
2. Railway автоматически определит Next.js проект

### Шаг 3: Настройка переменных окружения
В настройках сервиса добавь следующие переменные:

```bash
NODE_ENV=production
DATABASE_URL=${{postgres-volume.DATABASE_URL}}
NEXT_PUBLIC_BASE_URL=https://ваш-домен.up.railway.app
```

⚠️ **ВАЖНО:**
- `NEXT_PUBLIC_BASE_URL` должен содержать **полный URL с https://**
- Замени `ваш-домен.up.railway.app` на реальный домен из Railway
- `DATABASE_URL` автоматически подставится из PostgreSQL сервиса

### Шаг 4: Связывание сервисов
1. В настройках web-сервиса перейди во вкладку "Variables"
2. Кликни "Add Reference" и выбери PostgreSQL сервис
3. Выбери переменную `DATABASE_URL`

### Шаг 5: Деплой
1. Railway автоматически задеплоит приложение
2. Миграции базы данных применятся автоматически при старте (`npm run db:push`)
3. После успешного деплоя получишь URL вида `https://your-app.up.railway.app`

### Проверка работоспособности
1. Открой URL приложения
2. Попробуй создать тестовую заметку через Obsidian плагин
3. Проверь, что ссылка генерируется корректно

Готово!

## API

- `POST /api/share` - создать заметку
- `GET /api/share/:id` - получить заметку
- `DELETE /api/share/:id` - удалить заметку

## Лицензия

MIT
