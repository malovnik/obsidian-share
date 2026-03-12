import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { marked } from 'marked';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { notes } from '@/lib/db/schema';
import { generateSlug, createFullSlug } from '@/lib/utils/slug';

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
      sourceId, // Optional: Obsidian file path or UUID for tracking updates
      noIndex = false // Optional: Disable search engine indexing for private shares
    } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    // Убираем frontmatter и извлекаем метаданные
    const { stripFrontmatter, parseFrontmatter } = await import('@/app/lib/frontmatter');
    const cleanContent = stripFrontmatter(content);
    const htmlContent = await marked(cleanContent);

    // Извлекаем теги из frontmatter
    const { data: frontmatterData } = parseFrontmatter(content);
    let tags: string[] = [];
    if (Array.isArray(frontmatterData.tags)) {
      tags = frontmatterData.tags.map((t: unknown) => String(t).trim()).filter(Boolean);
    } else if (typeof frontmatterData.tags === 'string') {
      tags = frontmatterData.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
    }

    // Время чтения
    const wordCount = cleanContent.trim().split(/\s+/).filter(Boolean).length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));

    let expiresAt = null;
    if (expiresInDays && expiresInDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    // Check if note with this sourceId already exists (for updates)
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
      // Update existing note
      isUpdate = true;
      const slug = generateSlug(title);

      const updated = await db
        .update(notes)
        .set({
          title,
          content,
          htmlContent,
          slug,
          theme,
          customCss,
          password,
          expiresAt,
          noIndex,
          tags,
          readingTime,
          updatedAt: new Date(),
        })
        .where(eq(notes.id, existingNote.id))
        .returning();

      note = updated[0];
    } else {
      // Create new note
      const id = nanoid(8);
      const slug = generateSlug(title);

      const inserted = await db
        .insert(notes)
        .values({
          id,
          slug,
          sourceId,
          title,
          content,
          htmlContent,
          theme,
          customCss,
          password,
          expiresAt,
          noIndex,
          tags,
          readingTime,
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

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
