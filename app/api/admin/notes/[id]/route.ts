import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { notes } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { isAdminAuthenticated } from '@/lib/auth/admin';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;

    const [updated] = await db
      .update(notes)
      .set({ isDeleted: true })
      .where(eq(notes.id, id))
      .returning({ id: notes.id, title: notes.title });

    if (!updated) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      deleted: updated,
    });
  } catch (error) {
    console.error('Admin delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete note' },
      { status: 500 }
    );
  }
}
