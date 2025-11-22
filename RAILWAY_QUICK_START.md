# Railway Quick Start - Быстрая настройка

## Проблема: Railpack не может определить структуру проекта

Это **нормально** для монорепозитория! Railway видит корневую папку с `client/`, `server/`, `obsidian-plugin/` и не знает, что запускать.

**Решение:** Указать Root Directory для каждого сервиса.

---

## Шаг 1: Создание Backend сервиса

1. Railway → **New Project** → **Deploy from GitHub repo**
2. Выберите `malovnik/obsidian-share`
3. После создания проекта нажмите на созданный сервис
4. **Settings** → **Service Settings** → найдите **Root Directory**
5. Укажите: `server`
6. Railway автоматически пересоберёт проект

### Переменные окружения для Backend

Settings → **Variables** → добавьте:

```bash
NODE_ENV=production
PUBLIC_URL=https://ваш-фронтенд.up.railway.app
CORS_ORIGIN=https://ваш-фронтенд.up.railway.app
```

**Важно:** `PUBLIC_URL` и `CORS_ORIGIN` нужно будет обновить после создания фронтенда!

---

## Шаг 2: Добавление PostgreSQL

1. В том же проекте: **New** → **Database** → **Add PostgreSQL**
2. Railway автоматически создаст `DATABASE_URL` для backend сервиса
3. Проверьте: Backend service → **Variables** → должна появиться `DATABASE_URL`

---

## Шаг 3: Переключение на production режим

**ВАЖНО:** Сейчас backend использует in-memory хранилище (`share-simple.ts`). Нужно переключить на PostgreSQL.

Локально выполните:

```bash
cd "/Users/malovnik/Documents/Проекты/Dev/[WEB] Obsidian Share"
```

Отредактируйте `server/src/index.ts`:

```typescript
// Было:
import shareRoutes from './routes/share-simple';

// Стало:
import shareRoutes from './routes/share';
```

Сохраните, закоммитьте и запушьте:

```bash
git add server/src/index.ts
git commit -m "Switch to PostgreSQL for production"
git push
```

Railway автоматически пересоберёт проект.

---

## Шаг 4: Создание Frontend сервиса

1. В том же проекте Railway: **New** → **GitHub Repo**
2. Выберите `malovnik/obsidian-share` (тот же репозиторий)
3. После создания откройте сервис
4. **Settings** → **Service Settings** → **Root Directory**: `client`

### Переменные окружения для Frontend

Settings → **Variables** → добавьте:

```bash
API_URL=https://ваш-backend.up.railway.app
```

**Как получить URL backend:**
1. Откройте Backend сервис
2. **Settings** → **Networking** → **Generate Domain**
3. Скопируйте сгенерированный URL (например, `obsidian-share-api.up.railway.app`)
4. Добавьте в frontend как `API_URL=https://obsidian-share-api.up.railway.app`

---

## Шаг 5: Обновление CORS на Backend

После того как frontend задеплоился:

1. Откройте Frontend сервис → **Settings** → **Networking** → **Generate Domain**
2. Скопируйте URL (например, `obsidian-share.up.railway.app`)
3. Вернитесь к Backend сервису → **Variables**
4. Обновите:
   ```bash
   PUBLIC_URL=https://obsidian-share.up.railway.app
   CORS_ORIGIN=https://obsidian-share.up.railway.app
   ```
5. Backend автоматически перезапустится

---

## Шаг 6: Проверка работы

### Backend
```bash
curl https://ваш-backend.up.railway.app/health
```

Должен вернуть:
```json
{"status":"ok","timestamp":"..."}
```

### Frontend
Откройте `https://ваш-frontend.up.railway.app` в браузере - должна показаться главная страница.

### Создание тестовой заметки
```bash
curl -X POST https://ваш-backend.up.railway.app/api/share \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Note",
    "content": "# Hello World\n\nThis is a test note!",
    "expiresInDays": 0
  }'
```

Скопируйте `url` из ответа и откройте в браузере.

---

## Шаг 7: Настройка Obsidian Plugin

Обновите файл:
```
/Users/malovnik/Documents/malovnik-obsidian/.obsidian/plugins/obsidian-share-custom/data.json
```

Содержимое:
```json
{
  "apiUrl": "https://ваш-backend.up.railway.app",
  "autoClipboard": true,
  "defaultExpiry": 0
}
```

Перезапустите Obsidian (Cmd + R).

---

## Кастомные домены (опционально)

### Настройка кастомных доменов

#### Backend: api.yourdomain.com
1. Backend service → **Settings** → **Networking** → **Custom Domain**
2. Введите: `api.yourdomain.com`
3. Railway покажет CNAME запись
4. Добавьте в DNS вашего домена:
   - Type: `CNAME`
   - Name: `api`
   - Value: `предоставленный-railway-url.railway.app`

#### Frontend: share.yourdomain.com
1. Frontend service → **Settings** → **Networking** → **Custom Domain**
2. Введите: `share.yourdomain.com`
3. Добавьте CNAME в DNS

### Обновление переменных после настройки доменов

**Backend:**
```bash
PUBLIC_URL=https://share.yourdomain.com
CORS_ORIGIN=https://share.yourdomain.com
```

**Frontend:**
```bash
API_URL=https://api.yourdomain.com
```

**Obsidian Plugin:**
```json
{
  "apiUrl": "https://api.yourdomain.com",
  "autoClipboard": true,
  "defaultExpiry": 0
}
```

---

## Troubleshooting

### ❌ Railway: "Could not determine how to build"
**Решение:** Убедитесь, что указали Root Directory (`server` или `client`) в настройках сервиса.

### ❌ Database connection error
**Решение:**
1. Проверьте, что PostgreSQL добавлен в проект
2. Backend service → **Variables** → должна быть `DATABASE_URL`
3. Если её нет: Backend service → **Settings** → **Service** → **Add Reference** → выберите PostgreSQL

### ❌ CORS error
**Решение:** Убедитесь, что `CORS_ORIGIN` в backend совпадает с URL фронтенда (без trailing slash).

---

## Чеклист

- [ ] Backend сервис создан с Root Directory = `server`
- [ ] PostgreSQL database добавлен
- [ ] Backend переменные: `NODE_ENV`, `PUBLIC_URL`, `CORS_ORIGIN`
- [ ] `server/src/index.ts` использует `import shareRoutes from './routes/share'`
- [ ] Backend успешно задеплоился (проверьте `/health`)
- [ ] Frontend сервис создан с Root Directory = `client`
- [ ] Frontend переменная: `API_URL`
- [ ] Frontend успешно задеплоился (откройте в браузере)
- [ ] Obsidian plugin настроен с правильным `apiUrl`
- [ ] Тестовая заметка успешно публикуется из Obsidian

---

**Готово!** Теперь у вас полностью рабочий сервис для публикации заметок из Obsidian.
