# Деплой на Railway - Пошаговая инструкция

## Подготовка

1. Убедитесь, что у вас есть аккаунт на [Railway.app](https://railway.app)
2. Репозиторий уже на GitHub: `https://github.com/malovnik/obsidian-share`

## Часть 1: Backend API

### Шаг 1: Создание проекта
1. Зайдите на [railway.app](https://railway.app/dashboard)
2. Нажмите **"New Project"**
3. Выберите **"Deploy from GitHub repo"**
4. Найдите и выберите репозиторий `malovnik/obsidian-share`

### Шаг 2: Настройка Backend сервиса
1. После создания проекта нажмите **"Add Service"** → **"GitHub Repo"**
2. Выберите `malovnik/obsidian-share`
3. В настройках сервиса:
   - **Name**: `obsidian-share-api` (или любое другое имя)
   - **Root Directory**: `server`
   - **Build Command**: (оставить пустым, Railway автоматически использует `npm install && npm run build`)
   - **Start Command**: (оставить пустым, Railway использует `npm start` из package.json)

### Шаг 3: Добавление PostgreSQL
1. В том же проекте нажмите **"New"** → **"Database"** → **"Add PostgreSQL"**
2. Railway автоматически создаст базу данных
3. Автоматически создастся переменная `DATABASE_URL` для вашего backend сервиса

### Шаг 4: Настройка переменных окружения для Backend
1. Откройте backend сервис → вкладка **"Variables"**
2. Добавьте следующие переменные:

```
NODE_ENV=production
PUBLIC_URL=https://ваш-домен-фронтенда.up.railway.app
CORS_ORIGIN=https://ваш-домен-фронтенда.up.railway.app
```

**Примечание:** URL фронтенда вы получите после деплоя фронтенда (шаг ниже). Сначала можете оставить временный URL Railway.

### Шаг 5: Настройка домена для Backend
1. Откройте backend сервис → вкладка **"Settings"**
2. Прокрутите до **"Networking"**
3. Нажмите **"Generate Domain"** - Railway создаст публичный URL (например, `obsidian-share-api.up.railway.app`)
4. Или добавьте свой кастомный домен:
   - Нажмите **"Custom Domain"**
   - Введите домен (например, `api-share.yourdomain.com`)
   - Railway предоставит CNAME запись
   - Добавьте CNAME в настройки DNS вашего домена

### Шаг 6: Переключение на production режим
1. Откройте файл `server/src/index.ts` в вашем локальном репозитории
2. Измените импорт:
```typescript
// Было (development):
import shareRoutes from './routes/share-simple';

// Стало (production):
import shareRoutes from './routes/share';
```
3. Закоммитьте и запушьте изменения:
```bash
cd "/Users/malovnik/Documents/Проекты/Dev/[WEB] Obsidian Share"
git add server/src/index.ts
git commit -m "Switch to production mode with PostgreSQL"
git push
```

Railway автоматически пересоберёт проект.

---

## Часть 2: Frontend

### Шаг 1: Добавление Frontend сервиса
1. В том же проекте Railway нажмите **"New"** → **"GitHub Repo"**
2. Выберите тот же репозиторий `malovnik/obsidian-share`
3. В настройках сервиса:
   - **Name**: `obsidian-share-client`
   - **Root Directory**: `client`
   - **Build Command**: (оставить пустым, Railway использует `npm run build`)
   - **Start Command**: (оставить пустым, Railway использует `npm start`)

### Шаг 2: Настройка переменных окружения для Frontend
1. Откройте frontend сервис → вкладка **"Variables"**
2. Добавьте:
```
API_URL=https://obsidian-share-api.up.railway.app
```
Замените URL на тот, который получили для backend (из Части 1, Шаг 5).

### Шаг 3: Настройка домена для Frontend
1. Откройте frontend сервис → **"Settings"** → **"Networking"**
2. Нажмите **"Generate Domain"** или добавьте кастомный домен
3. Получите URL (например, `obsidian-share.up.railway.app`)

### Шаг 4: Обновление CORS на Backend
1. Вернитесь к backend сервису
2. Откройте **"Variables"**
3. Обновите переменные с реальным URL фронтенда:
```
PUBLIC_URL=https://obsidian-share.up.railway.app
CORS_ORIGIN=https://obsidian-share.up.railway.app
```
4. Сервис автоматически перезапустится

---

## Часть 3: Настройка Obsidian Plugin

### Шаг 1: Обновление настроек плагина
1. Откройте Obsidian
2. Перейдите в Settings → Community plugins → Obsidian Share Custom → Options
3. Или отредактируйте файл напрямую:
```
/Users/malovnik/Documents/malovnik-obsidian/.obsidian/plugins/obsidian-share-custom/data.json
```

Замените содержимое на:
```json
{
  "apiUrl": "https://obsidian-share-api.up.railway.app",
  "autoClipboard": true,
  "defaultExpiry": 0
}
```

Замените URL на ваш реальный API URL.

### Шаг 2: Перезапуск Obsidian
1. Нажмите `Cmd + R` или перезапустите Obsidian
2. Убедитесь, что плагин включён в Settings → Community plugins

---

## Проверка деплоя

### Backend
Проверьте health endpoint:
```bash
curl https://ваш-backend-url.up.railway.app/health
```
Должен вернуть:
```json
{"status":"ok","timestamp":"..."}
```

### Frontend
Откройте `https://ваш-frontend-url.up.railway.app` в браузере - должна открыться главная страница.

### Полный цикл
1. Откройте заметку в Obsidian
2. Используйте команду **"Share note"** (Cmd/Ctrl + P → "Share note")
3. Ссылка должна скопироваться в буфер обмена
4. Откройте ссылку - заметка должна отобразиться

---

## Troubleshooting

### Backend не запускается
1. Проверьте логи: Backend сервис → вкладка **"Deployments"** → последний деплой → **"View Logs"**
2. Убедитесь, что `DATABASE_URL` существует в переменных окружения
3. Проверьте, что используется `share.ts`, а не `share-simple.ts`

### CORS ошибки
1. Убедитесь, что `CORS_ORIGIN` в backend совпадает с URL фронтенда
2. Проверьте, что URL без trailing slash (правильно: `https://site.com`, неправильно: `https://site.com/`)

### Frontend не подключается к API
1. Проверьте переменную `API_URL` в frontend сервисе
2. Убедитесь, что backend доступен (проверьте `/health`)

### Миграции БД не применились
Выполните миграцию вручную:
1. В backend сервисе откройте вкладку **"Deployments"**
2. Нажмите на три точки → **"Run Command"**
3. Выполните:
```bash
npm run db:push
```

---

## Кастомные домены

Если у вас есть свой домен (например, `yourdomain.com`):

### Backend: api.yourdomain.com
1. Backend сервис → Settings → Networking → Custom Domain
2. Введите: `api.yourdomain.com`
3. Railway покажет CNAME запись
4. Добавьте в DNS:
   - Type: `CNAME`
   - Name: `api`
   - Value: `предоставленный-railway.railway.app`

### Frontend: share.yourdomain.com
1. Frontend сервис → Settings → Networking → Custom Domain
2. Введите: `share.yourdomain.com`
3. Добавьте CNAME в DNS

### Обновите переменные окружения
После настройки кастомных доменов:

**Backend:**
```
PUBLIC_URL=https://share.yourdomain.com
CORS_ORIGIN=https://share.yourdomain.com
```

**Frontend:**
```
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

## Мониторинг

Railway предоставляет встроенный мониторинг:
- Использование CPU/Memory
- Логи в реальном времени
- История деплоев

Доступно в каждом сервисе → вкладки **"Metrics"** и **"Deployments"**.

---

## Готово!

Теперь у вас развёрнут полностью рабочий сервис для шаринга заметок Obsidian на вашем домене.

**Полезные ссылки:**
- GitHub Repo: https://github.com/malovnik/obsidian-share
- Railway Dashboard: https://railway.app/dashboard
- Railway Docs: https://docs.railway.app
