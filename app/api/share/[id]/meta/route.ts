import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { notes } from '@/lib/db/schema';
import { eq, or } from 'drizzle-orm';
import { extractIdFromSlug } from '@/lib/utils/slug';

/**
 * GET /api/share/[id]/meta
 * Возвращает только метаданные статьи (без контента)
 * Используется для проверки приватности статьи
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idOrSlug } = await params;

    // Извлекаем ID из slug если нужно
    const noteId = extractIdFromSlug(idOrSlug);

    // Ищем заметку по ID или slug
    const results = await db
      .select({
        id: notes.id,
        noIndex: notes.noIndex,
        isDeleted: notes.isDeleted,
      })
      .from(notes)
      .where(
        or(
          eq(notes.id, noteId),
          eq(notes.slug, idOrSlug)
        )
      )
      .limit(1);

    const note = results[0];

    if (!note || note.isDeleted) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: note.id,
      noIndex: note.noIndex,
    });
  } catch (error) {
    console.error('Meta API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch note metadata' },
      { status: 500 }
    );
  }
}
