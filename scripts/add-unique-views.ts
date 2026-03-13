import 'dotenv/config';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function addUniqueViews() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }

  const sql = postgres(databaseUrl);

  console.log('Reading migration file...');
  const migrationPath = resolve(__dirname, '..', 'drizzle', '0003_add_unique_views.sql');
  const migrationSql = readFileSync(migrationPath, 'utf-8');

  console.log('Running migration...');
  const statements = migrationSql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    console.log(`Executing: ${statement.substring(0, 60)}...`);
    await sql.unsafe(statement);
  }

  console.log('Migration complete: unique_view_count column + note_views table created');

  await sql.end();
}

addUniqueViews().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
