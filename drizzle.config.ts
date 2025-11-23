import type { Config } from 'drizzle-kit';
import dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL is not set!');
  console.error('Available env vars:', Object.keys(process.env).filter(key => key.includes('DATA')));
  throw new Error('DATABASE_URL environment variable is required');
}

console.log('✅ DATABASE_URL found:', databaseUrl.substring(0, 20) + '...');

export default {
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
} satisfies Config;
