import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { stripFrontmatter } from '@/app/lib/frontmatter';
import { createFullSlug } from '@/lib/utils/slug';
import type { SearchResult, SearchResponse } from '@/types/contracts';

function createSnippet(content: string): string {
  const clean = stripFrontmatter(content);
  const stripped = clean
    .replace(/[#*_\[\]]/g, '')
    .replace(/\n+/g, ' ')
    .trim();
  if (stripped.length <= 200) return stripped;
  return stripped.substring(0, 200) + '...';
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get('q')?.trim() || '';
    const tagsParam = searchParams.get('tags')?.trim() || '';
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20'), 1), 50);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);

    const tags = tagsParam ? tagsParam.split(',').map((t) => t.trim()).filter(Boolean) : [];

    if (!q && tags.length === 0) {
      const response: SearchResponse = {
        notes: [],
        pagination: { hasMore: false, offset, limit },
      };
      return NextResponse.json(response);
    }

    let rows: Array<Record<string, unknown>>;

    if (q && tags.length > 0) {
      const res = await db.execute(
        sql`SELECT id, title, content, tags, reading_time, created_at, view_count,
            ts_rank(search_vector, (websearch_to_tsquery('russian', ${q}) || websearch_to_tsquery('english', ${q}))) as relevance
          FROM notes
          WHERE no_index = false AND is_deleted = false
            AND search_vector @@ (websearch_to_tsquery('russian', ${q}) || websearch_to_tsquery('english', ${q}))
            AND tags @> ${tags}::text[]
          ORDER BY relevance DESC
          LIMIT ${limit + 1} OFFSET ${offset}`
      );
      rows = res as unknown as Array<Record<string, unknown>>;
    } else if (q) {
      const res = await db.execute(
        sql`SELECT id, title, content, tags, reading_time, created_at, view_count,
            ts_rank(search_vector, (websearch_to_tsquery('russian', ${q}) || websearch_to_tsquery('english', ${q}))) as relevance
          FROM notes
          WHERE no_index = false AND is_deleted = false
            AND search_vector @@ (websearch_to_tsquery('russian', ${q}) || websearch_to_tsquery('english', ${q}))
          ORDER BY relevance DESC
          LIMIT ${limit + 1} OFFSET ${offset}`
      );
      rows = res as unknown as Array<Record<string, unknown>>;
    } else {
      const res = await db.execute(
        sql`SELECT id, title, content, tags, reading_time, created_at, view_count, 0 as relevance
          FROM notes
          WHERE no_index = false AND is_deleted = false
            AND tags @> ${tags}::text[]
          ORDER BY created_at DESC
          LIMIT ${limit + 1} OFFSET ${offset}`
      );
      rows = res as unknown as Array<Record<string, unknown>>;
    }

    const hasMore = rows.length > limit;
    const rowsToReturn = hasMore ? rows.slice(0, limit) : rows;

    const searchResults: SearchResult[] = rowsToReturn.map((row) => {
      const title = String(row.title || '');
      const id = String(row.id || '');

      return {
        id,
        slug: createFullSlug(title, id),
        title,
        snippet: createSnippet(String(row.content || '')),
        tags: (row.tags as string[]) ?? [],
        readingTime: Number(row.reading_time) || 0,
        createdAt: row.created_at instanceof Date
          ? row.created_at.toISOString()
          : String(row.created_at),
        viewCount: Number(row.view_count) || 0,
        relevance: Number(row.relevance) || 0,
      };
    });

    const response: SearchResponse = {
      notes: searchResults,
      pagination: {
        hasMore,
        offset,
        limit,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Failed to search notes' },
      { status: 500 }
    );
  }
}
