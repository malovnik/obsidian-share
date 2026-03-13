import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { notes } from '@/lib/db/schema';
import { desc, ilike, sql } from 'drizzle-orm';
import { isAdminAuthenticated } from '@/lib/auth/admin';

export async function GET(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const search = request.nextUrl.searchParams.get('search')?.trim();

    const conditions = search
      ? ilike(notes.title, `%${search}%`)
      : undefined;

    const results = await db
      .select({
        id: notes.id,
        title: notes.title,
        slug: notes.slug,
        viewCount: notes.viewCount,
        isDeleted: notes.isDeleted,
        createdAt: notes.createdAt,
        sourceId: notes.sourceId,
        noIndex: notes.noIndex,
        readingTime: notes.readingTime,
      })
      .from(notes)
      .where(conditions)
      .orderBy(desc(notes.createdAt))
      .limit(200);

    return NextResponse.json({
      notes: results,
      total: results.length,
    });
  } catch (error) {
    console.error('Admin notes list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
      { status: 500 }
    );
  }
}
