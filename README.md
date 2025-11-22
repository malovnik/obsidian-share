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

## Railway

1. Создай проект
2. Добавь PostgreSQL
3. Подключи репо `malovnik/obsidian-share`
4. Добавь переменные:
   - `DATABASE_URL` (авто)
   - `NEXT_PUBLIC_BASE_URL` (твой домен)

Готово!

## API

- `POST /api/share` - создать заметку
- `GET /api/share/:id` - получить заметку
- `DELETE /api/share/:id` - удалить заметку

## Лицензия

MIT
