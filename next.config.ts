import type { NextConfig } from 'next';
import dotenv from 'dotenv';

// Загружаем переменные окружения из .env файла
dotenv.config();

const nextConfig: NextConfig = {
  // Skip trailing slash redirect for API routes
  skipTrailingSlashRedirect: true,

  // Экспортируем переменные окружения для runtime
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
  },
};

export default nextConfig;
