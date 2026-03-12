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
    const { data, content: cleanContent } = parseFrontmatter(note.content);

    const rawTags = data.tags;
    let tags: string[] = [];
    if (Array.isArray(rawTags)) {
      tags = rawTags.map((t: unknown) => String(t).trim()).filter(Boolean);
    } else if (typeof rawTags === 'string') {
      tags = rawTags.split(',').map((t: string) => t.trim()).filter(Boolean);
    }

    const wordCount = cleanContent.trim().split(/\s+/).filter(Boolean).length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));

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
