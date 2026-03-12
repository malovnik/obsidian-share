import { NextRequest, NextResponse } from 'next/server';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', 8);
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { notes } from '@/lib/db/schema';
import { generateSlug, createFullSlug } from '@/lib/utils/slug';
import { processArticleContent } from '@/lib/utils/content';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      content,
      theme = 'default',
      customCss,
      password,
      expiresInDays,
      sourceId,
      noIndex = false
    } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    const processed = await processArticleContent(content);

    let expiresAt = null;
    if (expiresInDays && expiresInDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    let existingNote = null;
    if (sourceId) {
      const results = await db
        .select()
        .from(notes)
        .where(eq(notes.sourceId, sourceId))
        .limit(1);

      existingNote = results[0];
    }

    let note;
    let isUpdate = false;

    if (existingNote) {
      isUpdate = true;
      const slug = generateSlug(title);

      const updated = await db
        .update(notes)
        .set({
          title,
          content,
          htmlContent: processed.htmlContent,
          slug,
          theme,
          customCss,
          password,
          expiresAt,
          noIndex,
          tags: processed.tags,
          readingTime: processed.readingTime,
          updatedAt: new Date(),
        })
        .where(eq(notes.id, existingNote.id))
        .returning();

      note = updated[0];
    } else {
      const id = nanoid();
      const slug = generateSlug(title);

      const inserted = await db
        .insert(notes)
        .values({
          id,
          slug,
          sourceId,
          title,
          content,
          htmlContent: processed.htmlContent,
          theme,
          customCss,
          password,
          expiresAt,
          noIndex,
          tags: processed.tags,
          readingTime: processed.readingTime,
        })
        .returning();

      note = inserted[0];
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${request.nextUrl.protocol}//${request.nextUrl.host}`;
    const fullSlug = createFullSlug(note.title, note.id);
    const shareUrl = `${baseUrl}/s/${fullSlug}`;

    return NextResponse.json({
      success: true,
      id: note.id,
      slug: fullSlug,
      url: shareUrl,
      expiresAt: note.expiresAt,
      isUpdate,
    });
  } catch (error) {
    console.error('Share error:', error);
    return NextResponse.json(
      { error: 'Failed to create share link' },
      { status: 500 }
    );
  }
}

