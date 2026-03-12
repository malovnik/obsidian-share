import { db } from '@/lib/db';
import { notes } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { createFullSlug } from '@/lib/utils/slug';
import type { MetadataRoute } from 'next';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://read.malovnik.ru';

  try {
    const publicNotes = await db
      .select({
        id: notes.id,
        title: notes.title,
        updatedAt: notes.updatedAt,
      })
      .from(notes)
      .where(and(eq(notes.isDeleted, false), eq(notes.noIndex, false)))
      .orderBy(desc(notes.updatedAt));

    const noteUrls: MetadataRoute.Sitemap = publicNotes.map((note) => ({
      url: `${baseUrl}/s/${createFullSlug(note.title, note.id)}`,
      lastModified: note.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

    return [
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 1,
      },
      ...noteUrls,
    ];
  } catch {
    return [
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 1,
      },
    ];
  }
}
