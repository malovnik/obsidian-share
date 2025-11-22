import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

let _client: ReturnType<typeof postgres> | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

function getDb() {
  if (!_db) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL is not set');
    }

    _client = postgres(connectionString);
    _db = drizzle(_client, { schema });
  }

  return _db;
}

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_, prop) {
    return getDb()[prop as keyof ReturnType<typeof drizzle>];
  }
});
