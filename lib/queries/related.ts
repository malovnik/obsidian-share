import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import type { RelatedArticle } from '@/types/contracts';

export async function getRelatedArticles(
  articleId: string,
  articleTags: string[],
  limit: number = 3
): Promise<RelatedArticle[]> {
  if (articleTags.length === 0) return [];

  const result = await db.execute(
    sql`SELECT id, title, tags
      FROM notes
      WHERE tags && ${articleTags}::text[]
        AND no_index = false AND is_deleted = false
        AND id != ${articleId}
      ORDER BY cardinality(ARRAY(SELECT unnest(tags) INTERSECT SELECT unnest(${articleTags}::text[]))) DESC NULLS LAST
      LIMIT ${limit}`
  );

  const { createFullSlug } = await import('@/lib/utils/slug');

  return (result as unknown as Array<Record<string, unknown>>).map((row) => {
    const title = String(row.title || '');
    const id = String(row.id || '');
    return {
      id,
      slug: createFullSlug(title, id),
      title,
      tags: (row.tags as string[]) ?? [],
    };
  });
}
