import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { notes } from '@/lib/db/schema';
import { desc, and, eq, lt } from 'drizzle-orm';
import { stripFrontmatter } from '@/app/lib/frontmatter';
import { createFullSlug } from '@/lib/utils/slug';
import type { NoteCard, FeedResponse } from '@/types/contracts';

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
    const limit = parseInt(searchParams.get('limit') || '10');
    const cursor = searchParams.get('cursor');

    const validLimit = Math.min(Math.max(limit, 1), 50);

    const conditions = [
      eq(notes.isDeleted, false),
      eq(notes.noIndex, false),
    ];

    if (cursor) {
      conditions.push(lt(notes.createdAt, new Date(cursor)));
    }

    const fetchedNotes = await db
      .select({
        id: notes.id,
        title: notes.title,
        content: notes.content,
        tags: notes.tags,
        readingTime: notes.readingTime,
        createdAt: notes.createdAt,
        viewCount: notes.viewCount,
      })
      .from(notes)
      .where(and(...conditions))
      .orderBy(desc(notes.createdAt))
      .limit(validLimit + 1);

    const hasMore = fetchedNotes.length > validLimit;
    const notesToReturn = hasMore ? fetchedNotes.slice(0, validLimit) : fetchedNotes;

    const noteCards: NoteCard[] = notesToReturn.map((note) => ({
      id: note.id,
      slug: createFullSlug(note.title, note.id),
      title: note.title,
      snippet: createSnippet(note.content),
      tags: note.tags ?? [],
      readingTime: note.readingTime ?? 0,
      createdAt: note.createdAt.toISOString(),
      viewCount: note.viewCount ?? 0,
    }));

    const nextCursor = hasMore
      ? notesToReturn[notesToReturn.length - 1].createdAt.toISOString()
      : null;

    const response: FeedResponse = {
      notes: noteCards,
      pagination: {
        hasMore,
        nextCursor,
        limit: validLimit,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Notes API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
      { status: 500 }
    );
  }
}
