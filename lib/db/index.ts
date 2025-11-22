import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Подключение к PostgreSQL
const connectionString = process.env.DATABASE_URL!;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

// Создаём клиент postgres
export const client = postgres(connectionString);

// Создаём Drizzle ORM instance
export const db = drizzle(client, { schema });
