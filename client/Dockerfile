FROM node:20-alpine

WORKDIR /app

# Копируем package files
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production

# Копируем исходники
COPY . .

# Собираем проект
RUN npm run build

# Порт
EXPOSE 3000

# Запускаем
CMD ["npm", "start"]
