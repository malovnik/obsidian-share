import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { notes, noteViews } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { extractIdFromSlug, isValidSlug } from '@/lib/utils/slug';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const password = request.nextUrl.searchParams.get('password');

    const extractedId = isValidSlug(rawId) ? extractIdFromSlug(rawId) : rawId;

    let [note] = await db
      .select()
      .from(notes)
      .where(eq(notes.id, extractedId))
      .limit(1);

    if (!note) {
      [note] = await db
        .select()
        .from(notes)
        .where(eq(notes.slug, rawId.replace(/-[^-]*$/, '')))
        .limit(1);
    }

    if (!note) {
      [note] = await db
        .select()
        .from(notes)
        .where(eq(notes.id, rawId))
        .limit(1);
    }

    if (!note || note.isDeleted) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }

    if (note.expiresAt && new Date() > note.expiresAt) {
      await db
        .update(notes)
        .set({ isDeleted: true })
        .where(eq(notes.id, note.id));

      return NextResponse.json(
        { error: 'Note has expired' },
        { status: 410 }
      );
    }

    if (note.password && note.password !== password) {
      return NextResponse.json(
        { error: 'Password required', needsPassword: true },
        { status: 401 }
      );
    }

    const viewerIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';

    const [existingView] = await db
      .select()
      .from(noteViews)
      .where(and(eq(noteViews.noteId, note.id), eq(noteViews.viewerIp, viewerIp)))
      .limit(1);

    const newViewCount = (note.viewCount || 0) + 1;
    let newUniqueViewCount = note.uniqueViewCount || 0;

    if (!existingView) {
      newUniqueViewCount += 1;
      await db.insert(noteViews).values({ noteId: note.id, viewerIp });
    }

    await db
      .update(notes)
      .set({ viewCount: newViewCount, uniqueViewCount: newUniqueViewCount })
      .where(eq(notes.id, note.id));

    return NextResponse.json({
      id: note.id,
      title: note.title,
      content: note.content,
      htmlContent: note.htmlContent,
      theme: note.theme,
      customCss: note.customCss,
      viewCount: newViewCount,
      uniqueViewCount: newUniqueViewCount,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      tags: note.tags,
      readingTime: note.readingTime,
    });
  } catch (error) {
    console.error('Get note error:', error);
    return NextResponse.json(
      { error: 'Failed to get note' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [deletedNote] = await db
      .update(notes)
      .set({ isDeleted: true })
      .where(eq(notes.id, id))
      .returning();

    if (!deletedNote) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Note deleted'
    });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete note' },
      { status: 500 }
    );
  }
}
