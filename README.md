# Obsidian Share

**Self-hosted note sharing service for Obsidian** - публикуйте свои заметки из Obsidian на собственном домене.

## О проекте

Полноценная альтернатива note.sx для публикации заметок из Obsidian. Включает:
- **Backend API** (Express + TypeScript + PostgreSQL)
- **Frontend** (Next.js 15 + React 19 + Tailwind CSS)
- **Obsidian Plugin** - публикация заметок прямо из Obsidian

## Функции

- Публикация Markdown заметок с автоматическим рендерингом в HTML
- Короткие красивые URL (8-символьные ID через nanoid)
- Счётчик просмотров
- Защита паролем (опционально)
- Срок действия ссылок (опционально)
- Автокопирование ссылки в буфер обмена
- Темы оформления
- Поддержка кастомного CSS

## Структура проекта

```
.
├── server/           # Backend API (Express + TypeScript)
├── client/           # Frontend (Next.js 15)
└── obsidian-plugin/  # Плагин для Obsidian
```

## Быстрый старт

### Локальная разработка

#### 1. Backend

```bash
cd server
npm install
cp .env.example .env
# Отредактируйте .env (или используйте in-memory версию для разработки)
npm run dev
```

Backend запустится на `http://localhost:4000`

#### 2. Frontend

```bash
cd client
npm install
cp .env.example .env
# В .env укажите API_URL=http://localhost:4000
npm run dev
```

Frontend запустится на `http://localhost:3000`

#### 3. Obsidian Plugin

```bash
cd obsidian-plugin
npm install
npm run build
```

Скопируйте содержимое папки в `.obsidian/plugins/obsidian-share-custom/` вашего хранилища Obsidian.

Создайте файл `data.json` в папке плагина:

```json
{
  "apiUrl": "http://localhost:4000",
  "autoClipboard": true,
  "defaultExpiry": 0
}
```

Перезапустите Obsidian и включите плагин в настройках.

## Деплой на Railway

### Backend

1. Создайте новый проект в Railway
2. Добавьте PostgreSQL database (Add → Database → PostgreSQL)
3. Подключите GitHub репозиторий
4. Укажите Root Directory: `server`
5. Установите переменные окружения:
   - `PORT` - устанавливается Railway автоматически
   - `DATABASE_URL` - устанавливается при подключении PostgreSQL
   - `PUBLIC_URL` - URL вашего фронтенда (например, `https://share.yourdomain.com`)
   - `CORS_ORIGIN` - URL фронтенда
   - `NODE_ENV` - `production`

6. Railway автоматически запустит `npm install && npm run build && npm start`

### Frontend

1. Создайте отдельный сервис в Railway (или используйте Vercel)
2. Подключите тот же GitHub репозиторий
3. Укажите Root Directory: `client`
4. Установите переменную окружения:
   - `API_URL` - URL вашего backend API (например, `https://api-share.yourdomain.com`)

5. Railway автоматически запустит `npm install && npm run build && npm start`

### Настройка доменов

В Railway:
- Settings → Networking → Custom Domain
- Добавьте свои домены для backend и frontend
- Railway предоставит CNAME записи для DNS

### Обновление плагина

После деплоя обновите настройки плагина в Obsidian:

```json
{
  "apiUrl": "https://api-share.yourdomain.com",
  "autoClipboard": true,
  "defaultExpiry": 0
}
```

## API Endpoints

### POST /api/share
Создать новую публичную ссылку

**Request:**
```json
{
  "title": "Название заметки",
  "content": "# Markdown контент\n\nТекст заметки",
  "theme": "default",
  "customCss": "",
  "password": "",
  "expiresInDays": 0
}
```

**Response:**
```json
{
  "success": true,
  "id": "abc12345",
  "url": "https://share.yourdomain.com/s/abc12345",
  "expiresAt": null
}
```

### GET /api/share/:id
Получить заметку по ID

**Query params:**
- `password` - если заметка защищена паролем

**Response:**
```json
{
  "id": "abc12345",
  "title": "Название заметки",
  "content": "Markdown контент",
  "htmlContent": "<h1>Markdown контент</h1>...",
  "theme": "default",
  "customCss": "",
  "viewCount": 42,
  "createdAt": "2025-01-23T12:00:00.000Z"
}
```

### DELETE /api/share/:id
Удалить заметку

## Технологии

### Backend
- Express.js - веб-фреймворк
- TypeScript - типизация
- PostgreSQL - база данных
- Drizzle ORM - работа с БД
- marked - Markdown → HTML
- nanoid - генерация коротких ID

### Frontend
- Next.js 15 - React фреймворк
- React 19 - UI библиотека
- Tailwind CSS 4 - стили
- TypeScript - типизация

### Obsidian Plugin
- TypeScript
- Obsidian API
- esbuild - сборка

## Разработка

### Режимы работы Backend

**Development (in-memory):**
- Используется `share-simple.ts` с хранением в Map
- Не требует PostgreSQL
- Данные теряются при перезапуске

**Production:**
- Используется `share.ts` с PostgreSQL
- Данные персистентны
- Автоматические миграции через Drizzle

Переключение в [server/src/index.ts](server/src/index.ts:5):
```typescript
// Development
import shareRoutes from './routes/share-simple';

// Production
import shareRoutes from './routes/share';
```

## Лицензия

MIT

## Автор

Создано с помощью Claude Code (Sonnet 4.5)
