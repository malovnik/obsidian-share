import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { notes } from '@/lib/db/schema';
import { desc, and, eq, lt } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');
    const cursor = searchParams.get('cursor'); // ID последней заметки из предыдущей страницы

    // Валидация лимита
    const validLimit = Math.min(Math.max(limit, 1), 50); // От 1 до 50

    // Условия запроса
    const conditions = [];

    // Исключаем удаленные заметки
    conditions.push(eq(notes.isDeleted, false));

    // ВСЕГДА показываем только публичные статьи (noIndex = false)
    conditions.push(eq(notes.noIndex, false));

    // Cursor-based пагинация
    if (cursor) {
      conditions.push(lt(notes.createdAt, new Date(cursor)));
    }

    // Запрос заметок
    const fetchedNotes = await db
      .select({
        id: notes.id,
        slug: notes.slug,
        title: notes.title,
        content: notes.content,
        createdAt: notes.createdAt,
        updatedAt: notes.updatedAt,
        viewCount: notes.viewCount,
        noIndex: notes.noIndex,
      })
      .from(notes)
      .where(and(...conditions))
      .orderBy(desc(notes.createdAt))
      .limit(validLimit + 1); // +1 чтобы проверить есть ли еще страницы

    // Проверяем есть ли еще страницы
    const hasMore = fetchedNotes.length > validLimit;
    const notesToReturn = hasMore ? fetchedNotes.slice(0, validLimit) : fetchedNotes;

    // Формируем ответ с сниппетами
    const notesWithSnippets = notesToReturn.map((note) => {
      // Создаем сниппет из контента (первые 200 символов без markdown разметки)
      const snippet = note.content
        .replace(/[#*_`\[\]]/g, '') // Удаляем markdown разметку
        .replace(/\n/g, ' ') // Заменяем переносы строк на пробелы
        .trim()
        .substring(0, 200);

      return {
        id: note.id,
        slug: note.slug,
        title: note.title,
        snippet: snippet + (note.content.length > 200 ? '...' : ''),
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        viewCount: note.viewCount,
        isPrivate: note.noIndex,
      };
    });

    // Определяем следующий cursor
    const nextCursor = hasMore
      ? notesToReturn[notesToReturn.length - 1].createdAt.toISOString()
      : null;

    return NextResponse.json({
      notes: notesWithSnippets,
      pagination: {
        hasMore,
        nextCursor,
        limit: validLimit,
      },
    });
  } catch (error) {
    console.error('Notes API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
      { status: 500 }
    );
  }
}
