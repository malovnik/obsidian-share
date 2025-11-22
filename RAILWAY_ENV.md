# Переменные окружения для Railway

## Backend (Server)

### Автоматические переменные Railway
- `PORT` - автоматически устанавливается Railway
- `DATABASE_URL` - автоматически создаётся при подключении PostgreSQL

### Переменные, которые нужно добавить вручную

#### NODE_ENV
```
NODE_ENV=production
```
**Описание:** Режим работы приложения

---

#### PUBLIC_URL
```
PUBLIC_URL=https://ваш-фронтенд.up.railway.app
```
**Описание:** URL фронтенда для генерации ссылок на опубликованные заметки

**Примеры:**
- Railway домен: `https://obsidian-share.up.railway.app`
- Кастомный домен: `https://share.yourdomain.com`

**Важно:** URL должен быть без trailing slash (правильно: `https://site.com`, неправильно: `https://site.com/`)

---

#### CORS_ORIGIN
```
CORS_ORIGIN=https://ваш-фронтенд.up.railway.app
```
**Описание:** URL фронтенда для настройки CORS (разрешение запросов с фронтенда)

**Примеры:**
- Railway домен: `https://obsidian-share.up.railway.app`
- Кастомный домен: `https://share.yourdomain.com`

**Важно:** Должен совпадать с `PUBLIC_URL`

---

### Итого для Backend

```bash
# Автоматические (не трогать)
PORT=auto
DATABASE_URL=auto

# Добавить вручную
NODE_ENV=production
PUBLIC_URL=https://ваш-фронтенд.up.railway.app
CORS_ORIGIN=https://ваш-фронтенд.up.railway.app
```

---

## Frontend (Client)

### Переменные, которые нужно добавить вручную

#### API_URL
```
API_URL=https://ваш-бэкенд.up.railway.app
```
**Описание:** URL backend API для запросов

**Примеры:**
- Railway домен: `https://obsidian-share-api.up.railway.app`
- Кастомный домен: `https://api.yourdomain.com`

**Важно:** URL должен быть без `/api` на конце (правильно: `https://api.site.com`, неправильно: `https://api.site.com/api`)

---

### Итого для Frontend

```bash
API_URL=https://ваш-бэкенд.up.railway.app
```

---

## Пример с кастомными доменами

### Scenario: У вас домен `mysite.com`

#### DNS настройки
Добавьте CNAME записи в вашем DNS:

```
api.mysite.com  →  CNAME  →  ваш-backend-railway.up.railway.app
share.mysite.com  →  CNAME  →  ваш-frontend-railway.up.railway.app
```

#### Backend переменные
```bash
NODE_ENV=production
PUBLIC_URL=https://share.mysite.com
CORS_ORIGIN=https://share.mysite.com
```

#### Frontend переменные
```bash
API_URL=https://api.mysite.com
```

#### Obsidian Plugin настройки
```json
{
  "apiUrl": "https://api.mysite.com",
  "autoClipboard": true,
  "defaultExpiry": 0
}
```

---

## Как добавить переменные в Railway

### Способ 1: Через UI
1. Откройте ваш сервис в Railway
2. Перейдите на вкладку **"Variables"**
3. Нажмите **"New Variable"**
4. Введите имя (например, `NODE_ENV`)
5. Введите значение (например, `production`)
6. Нажмите **"Add"**
7. Сервис автоматически перезапустится

### Способ 2: Через Railway CLI
```bash
# Backend
railway variables set NODE_ENV=production
railway variables set PUBLIC_URL=https://share.yourdomain.com
railway variables set CORS_ORIGIN=https://share.yourdomain.com

# Frontend
railway variables set API_URL=https://api.yourdomain.com
```

---

## Проверка переменных

### Backend
Проверьте логи после деплоя:
```
🚀 Server running on port 3000
📝 API: https://your-backend.up.railway.app/api
💚 Health: https://your-backend.up.railway.app/health
```

Проверьте health endpoint:
```bash
curl https://your-backend.up.railway.app/health
```

### Frontend
Откройте frontend URL в браузере - должна открыться главная страница.

---

## Частые ошибки

### ❌ CORS ошибка
**Причина:** `CORS_ORIGIN` не совпадает с URL фронтенда

**Решение:** Убедитесь, что `CORS_ORIGIN` в backend точно совпадает с URL фронтенда (включая `https://`)

---

### ❌ Frontend не может подключиться к API
**Причина:** Неправильный `API_URL` во frontend

**Решение:** Проверьте, что `API_URL` указывает на backend URL без `/api` на конце

---

### ❌ Ссылки на заметки ведут на неправильный домен
**Причина:** Неправильный `PUBLIC_URL` в backend

**Решение:** Убедитесь, что `PUBLIC_URL` указывает на URL фронтенда

---

### ❌ Database connection error
**Причина:** `DATABASE_URL` не установлен или неправильный

**Решение:**
1. Убедитесь, что PostgreSQL database добавлен в проект
2. В настройках backend сервиса должна быть связь с database (Reference)
3. Railway автоматически создаст `DATABASE_URL`

---

## Чеклист перед запуском

### Backend
- [ ] PostgreSQL database создан
- [ ] Backend связан с database (Reference)
- [ ] `NODE_ENV=production`
- [ ] `PUBLIC_URL` указывает на frontend URL
- [ ] `CORS_ORIGIN` совпадает с `PUBLIC_URL`
- [ ] В `server/src/index.ts` используется `import shareRoutes from './routes/share'` (не share-simple)

### Frontend
- [ ] `API_URL` указывает на backend URL
- [ ] Frontend может открыться в браузере
- [ ] При переходе на `/s/test` показывается 404 (это нормально, заметки пока нет)

### Obsidian Plugin
- [ ] `data.json` содержит правильный `apiUrl`
- [ ] Plugin перезагружен в Obsidian (Cmd + R)
- [ ] Plugin включён в Settings → Community plugins
