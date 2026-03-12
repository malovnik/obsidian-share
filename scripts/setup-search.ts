import 'dotenv/config';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function setupSearch() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }

  const sql = postgres(databaseUrl);

  console.log('Reading migration file...');
  const migrationPath = resolve(__dirname, '..', 'drizzle', '0002_add_search_and_tags.sql');
  const migrationSql = readFileSync(migrationPath, 'utf-8');

  console.log('Executing migration...');
  await sql.unsafe(migrationSql);

  console.log('Search setup complete: columns, indexes, trigger, backfill vector');
  await sql.end();
}

setupSearch().catch((err) => {
  console.error('Setup failed:', err);
  process.exit(1);
});
