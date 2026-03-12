import 'dotenv/config';
import { db } from '../lib/db';
import { notes } from '../lib/db/schema';
import { eq } from 'drizzle-orm';
import { parseFrontmatter } from '../app/lib/frontmatter';

async function backfill() {
  console.log('Starting backfill...');

  const allNotes = await db.select({
    id: notes.id,
    content: notes.content,
  }).from(notes);

  console.log(`Found ${allNotes.length} notes to process`);

  let updated = 0;

  for (const note of allNotes) {
    const { tags, content: cleanContent } = parseFrontmatter(note.content);

    const wordCount = cleanContent.trim().split(/\s+/).filter(Boolean).length;
    const readingTime = Math.max(1, Math.round(wordCount / 200));

    await db.update(notes)
      .set({ tags, readingTime })
      .where(eq(notes.id, note.id));

    updated++;
    if (updated % 50 === 0) {
      console.log(`Processed ${updated}/${allNotes.length}`);
    }
  }

  console.log(`Backfill complete. Updated ${updated} notes.`);
  process.exit(0);
}

backfill().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
