import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { notes } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const password = request.nextUrl.searchParams.get('password');

    const [note] = await db
      .select()
      .from(notes)
      .where(eq(notes.id, id))
      .limit(1);

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
        .where(eq(notes.id, id));

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

    await db
      .update(notes)
      .set({ viewCount: (note.viewCount || 0) + 1 })
      .where(eq(notes.id, id));

    return NextResponse.json({
      id: note.id,
      title: note.title,
      content: note.content,
      htmlContent: note.htmlContent,
      theme: note.theme,
      customCss: note.customCss,
      viewCount: (note.viewCount || 0) + 1,
      createdAt: note.createdAt,
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
